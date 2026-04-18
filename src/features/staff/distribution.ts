import { supabase } from "@/lib/supabase/client";
import { Json } from "@/lib/supabase/types";
import {
  cacheAssignedEvents,
  cacheBeneficiaryLookup,
  cacheRecentDistributions,
  enqueueDistribution,
  getCachedAssignedEvents,
  getCachedBeneficiaryLookup,
  getCachedRecentDistributions,
  getQueuedDistributions,
  hasPendingDistributionForBeneficiary,
  removeQueuedDistribution,
  updateQueuedDistributionState
} from "@/lib/storage/offline";
import {
  DistributionItemRecord,
  DistributionRecord,
  EventRecord,
  OfflineDistributionQueueRecord,
  StaffBeneficiaryLookupResult
} from "@/types/domain";

function normalizeDistributionRecord(record: any): DistributionRecord {
  return {
    ...record,
    items: Array.isArray(record.items) ? (record.items as DistributionItemRecord[]) : [],
    beneficiary: record.beneficiary,
    event: record.event
  };
}

function createLocalDistributionRecord(queueRecord: OfflineDistributionQueueRecord): DistributionRecord {
  return {
    id: queueRecord.id,
    beneficiary_id: queueRecord.beneficiary_id,
    event_id: queueRecord.event_id,
    staff_id: "offline-queue",
    notes: queueRecord.notes,
    sync_state: queueRecord.sync_state,
    distributed_at: queueRecord.queued_at,
    items: queueRecord.items
  };
}

function createQueueId() {
  return globalThis.crypto?.randomUUID?.() ?? `queue-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function isLikelyOfflineError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("offline") ||
    message.includes("timed out") ||
    message.includes("failed to send")
  );
}

function isServerConflictError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("already claimed") ||
    message.includes("duplicate") ||
    message.includes("violates unique constraint")
  );
}

async function submitDistributionToServer(params: {
  eventId: string;
  beneficiaryId: string;
  notes?: string | null;
  items: DistributionItemRecord[];
}) {
  const { data, error } = await supabase.rpc("distribute_beneficiary", {
    target_event_id: params.eventId,
    target_beneficiary_id: params.beneficiaryId,
    distribution_items: params.items as unknown as Json,
    distribution_notes: params.notes ?? null
  });

  if (error) {
    throw error;
  }

  return normalizeDistributionRecord(data);
}

export async function fetchAssignedEvents() {
  try {
    const { data, error } = await supabase
      .from("staff_assignments")
      .select("*, event:events(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const events = ((data ?? []).map((entry: any) => entry.event).filter(Boolean) ?? []) as EventRecord[];
    await cacheAssignedEvents(events);
    return events;
  } catch (error) {
    const cachedEvents = await getCachedAssignedEvents();

    if (cachedEvents.length > 0) {
      return cachedEvents;
    }

    throw error;
  }
}

export async function fetchRecentDistributions() {
  let remoteRecords: DistributionRecord[] = [];

  try {
    const { data, error } = await supabase
      .from("distributions")
      .select("*, beneficiary:beneficiaries(*), event:events(*)")
      .order("distributed_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    remoteRecords = (data ?? []).map((record) => normalizeDistributionRecord(record));
    await cacheRecentDistributions(remoteRecords);
  } catch {
    remoteRecords = await getCachedRecentDistributions();
  }

  const queuedRecords = (await getQueuedDistributions()).map((entry) => createLocalDistributionRecord(entry));

  return [...queuedRecords, ...remoteRecords].slice(0, 10);
}

export async function lookupBeneficiaryForEvent(eventId: string, lookupValue: string) {
  try {
    const { data, error } = await supabase.rpc("lookup_beneficiary_for_event", {
      target_event_id: eventId,
      lookup_value: lookupValue
    });

    if (error) {
      throw error;
    }

    const result = data as unknown as StaffBeneficiaryLookupResult;
    await cacheBeneficiaryLookup(eventId, lookupValue, result);
    return result;
  } catch (error) {
    const cachedResult = await getCachedBeneficiaryLookup(eventId, lookupValue);

    if (cachedResult) {
      return cachedResult;
    }

    throw error;
  }
}

export async function distributeToBeneficiary(params: {
  eventId: string;
  beneficiaryId: string;
  notes?: string | null;
  items: DistributionItemRecord[];
}) {
  return submitDistributionToServer(params);
}

export async function queueDistributionForOffline(params: {
  eventId: string;
  beneficiaryId: string;
  notes?: string | null;
  items: DistributionItemRecord[];
  lookupValue?: string | null;
}) {
  const alreadyQueued = await hasPendingDistributionForBeneficiary(params.eventId, params.beneficiaryId);

  if (alreadyQueued) {
    throw new Error("This beneficiary already has a queued offline distribution for the selected event.");
  }

  const queuedRecord: OfflineDistributionQueueRecord = {
    id: createQueueId(),
    event_id: params.eventId,
    beneficiary_id: params.beneficiaryId,
    notes: params.notes ?? null,
    items: params.items,
    lookup_value: params.lookupValue ?? null,
    queued_at: new Date().toISOString(),
    sync_state: "queued",
    last_error: null
  };

  await enqueueDistribution(queuedRecord);
  return createLocalDistributionRecord(queuedRecord);
}

export async function syncQueuedDistributions() {
  const queuedRecords = await getQueuedDistributions();
  let syncedCount = 0;
  let failedCount = 0;

  for (const record of queuedRecords) {
    try {
      await updateQueuedDistributionState(record.id, "syncing");
      await submitDistributionToServer({
        eventId: record.event_id,
        beneficiaryId: record.beneficiary_id,
        notes: record.notes,
        items: record.items
      });
      await removeQueuedDistribution(record.id);
      syncedCount += 1;
    } catch (error) {
      if (isServerConflictError(error)) {
        await removeQueuedDistribution(record.id);
        syncedCount += 1;
        continue;
      }

      await updateQueuedDistributionState(record.id, "sync_failed", error instanceof Error ? error.message : "Sync failed.");
      failedCount += 1;

      if (isLikelyOfflineError(error)) {
        break;
      }
    }
  }

  return {
    syncedCount,
    failedCount,
    pendingCount: (await getQueuedDistributions()).length
  };
}
