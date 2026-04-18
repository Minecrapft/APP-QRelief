import { supabase } from "@/lib/supabase/client";
import { DistributionItemRecord, DistributionRecord, EventItemRecord, EventRecord } from "@/types/domain";

function normalizeDistribution(record: any): DistributionRecord {
  return {
    ...record,
    items: Array.isArray(record.items) ? (record.items as DistributionItemRecord[]) : [],
    event: record.event
  };
}

export async function fetchBeneficiaryEvents() {
  const [eventsResult, eventItemsResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .in("status", ["active", "draft"])
      .order("starts_at", { ascending: true }),
    supabase
      .from("event_items")
      .select("*, inventory_item:inventory_items(*)")
      .order("created_at", { ascending: false })
  ]);

  if (eventsResult.error) {
    throw eventsResult.error;
  }

  if (eventItemsResult.error) {
    throw eventItemsResult.error;
  }

  const events = (eventsResult.data ?? []) as EventRecord[];
  const items = (eventItemsResult.data ?? []) as EventItemRecord[];

  return events.map((event) => ({
    ...event,
    allocation_items: items.filter((item) => item.event_id === event.id)
  }));
}

export async function fetchBeneficiaryClaimHistory() {
  const { data, error } = await supabase
    .from("distributions")
    .select("*, event:events(*)")
    .order("distributed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((record) => normalizeDistribution(record));
}

export async function updateBeneficiaryProfile(payload: {
  full_name: string;
  contact_number: string;
  address: string;
  household_size: number;
  government_id: string;
}) {
  const { data, error } = await supabase.rpc("update_beneficiary_profile", payload);

  if (error) {
    throw error;
  }

  return data;
}
