import * as SQLite from "expo-sqlite";

import {
  DistributionItemRecord,
  DistributionRecord,
  EventRecord,
  OfflineDistributionQueueRecord,
  StaffBeneficiaryLookupResult
} from "@/types/domain";

const DATABASE_NAME = "qrelief-offline.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

function toJson(value: unknown) {
  return JSON.stringify(value);
}

function fromJson<T>(value: string | null) {
  return value ? (JSON.parse(value) as T) : null;
}

export async function initializeOfflineStorage() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_assigned_events (
      event_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_event_rosters (
      event_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_recent_distributions (
      distribution_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_beneficiary_lookups (
      cache_key TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      lookup_value TEXT NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS distribution_queue (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      beneficiary_id TEXT NOT NULL,
      notes TEXT,
      items_json TEXT NOT NULL,
      lookup_value TEXT,
      queued_at TEXT NOT NULL,
      sync_state TEXT NOT NULL,
      last_error TEXT
    );
  `);
}

export async function cacheAssignedEvents(events: EventRecord[]) {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM cached_assigned_events;");

    for (const event of events) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_assigned_events (event_id, payload, cached_at)
         VALUES (?, ?, ?);`,
        [event.id, toJson(event), new Date().toISOString()]
      );
    }
  });
}

export async function getCachedAssignedEvents() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM cached_assigned_events ORDER BY cached_at DESC;");

  return rows.map((row) => fromJson<EventRecord>(row.payload)).filter(Boolean) as EventRecord[];
}

export async function cacheEventRoster(eventId: string, roster: StaffBeneficiaryLookupResult[]) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO cached_event_rosters (event_id, payload, cached_at)
     VALUES (?, ?, ?);`,
    [eventId, toJson(roster), new Date().toISOString()]
  );
}

export async function getCachedEventRoster(eventId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM cached_event_rosters WHERE event_id = ? LIMIT 1;",
    [eventId]
  );

  return row ? (fromJson<StaffBeneficiaryLookupResult[]>(row.payload) ?? []) : [];
}

export async function cacheRecentDistributions(records: DistributionRecord[]) {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM cached_recent_distributions;");

    for (const record of records) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_recent_distributions (distribution_id, payload, cached_at)
         VALUES (?, ?, ?);`,
        [record.id, toJson(record), new Date().toISOString()]
      );
    }
  });
}

export async function getCachedRecentDistributions() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ payload: string }>(
    "SELECT payload FROM cached_recent_distributions ORDER BY cached_at DESC;"
  );

  return rows.map((row) => fromJson<DistributionRecord>(row.payload)).filter(Boolean) as DistributionRecord[];
}

function buildLookupCacheKey(eventId: string, lookupValue: string) {
  return `${eventId}::${lookupValue.trim().toLowerCase()}`;
}

export async function cacheBeneficiaryLookup(
  eventId: string,
  lookupValue: string,
  payload: StaffBeneficiaryLookupResult
) {
  const db = await getDatabase();
  const cacheKey = buildLookupCacheKey(eventId, lookupValue);

  await db.runAsync(
    `INSERT OR REPLACE INTO cached_beneficiary_lookups (cache_key, event_id, lookup_value, payload, cached_at)
     VALUES (?, ?, ?, ?, ?);`,
    [cacheKey, eventId, lookupValue.trim().toLowerCase(), toJson(payload), new Date().toISOString()]
  );
}

export async function getCachedBeneficiaryLookup(eventId: string, lookupValue: string) {
  const db = await getDatabase();
  const cacheKey = buildLookupCacheKey(eventId, lookupValue);

  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM cached_beneficiary_lookups WHERE cache_key = ? LIMIT 1;",
    [cacheKey]
  );

  return row ? fromJson<StaffBeneficiaryLookupResult>(row.payload) : null;
}

export async function findCachedBeneficiaryLookupInRoster(eventId: string, lookupValue: string) {
  const normalizedLookup = lookupValue.trim().toLowerCase();

  if (!normalizedLookup) {
    return null;
  }

  const roster = await getCachedEventRoster(eventId);

  return (
    roster.find((entry) => {
      const beneficiary = entry.beneficiary;
      const qrToken = beneficiary.qr_token?.toLowerCase() ?? "";
      const beneficiaryId = beneficiary.id.toLowerCase();
      const fullName = beneficiary.full_name.toLowerCase();
      const contactNumber = beneficiary.contact_number.toLowerCase();

      return (
        qrToken === normalizedLookup ||
        beneficiaryId === normalizedLookup ||
        fullName.includes(normalizedLookup) ||
        contactNumber.includes(normalizedLookup)
      );
    }) ?? null
  );
}

export async function hasPendingDistributionForBeneficiary(eventId: string, beneficiaryId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(1) AS total
     FROM distribution_queue
     WHERE event_id = ? AND beneficiary_id = ? AND sync_state IN ('queued', 'syncing', 'sync_failed')
     LIMIT 1;`,
    [eventId, beneficiaryId]
  );

  return Boolean(row?.total);
}

export async function enqueueDistribution(record: Omit<OfflineDistributionQueueRecord, "last_error"> & { last_error?: string | null }) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO distribution_queue
      (id, event_id, beneficiary_id, notes, items_json, lookup_value, queued_at, sync_state, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      record.id,
      record.event_id,
      record.beneficiary_id,
      record.notes,
      toJson(record.items),
      record.lookup_value,
      record.queued_at,
      record.sync_state,
      record.last_error ?? null
    ]
  );
}

export async function getQueuedDistributions() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    event_id: string;
    beneficiary_id: string;
    notes: string | null;
    items_json: string;
    lookup_value: string | null;
    queued_at: string;
    sync_state: OfflineDistributionQueueRecord["sync_state"];
    last_error: string | null;
  }>("SELECT * FROM distribution_queue ORDER BY queued_at ASC;");

  return rows.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    beneficiary_id: row.beneficiary_id,
    notes: row.notes,
    items: fromJson<DistributionItemRecord[]>(row.items_json) ?? [],
    lookup_value: row.lookup_value,
    queued_at: row.queued_at,
    sync_state: row.sync_state,
    last_error: row.last_error
  }));
}

export async function updateQueuedDistributionState(
  id: string,
  syncState: OfflineDistributionQueueRecord["sync_state"],
  lastError: string | null = null
) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE distribution_queue SET sync_state = ?, last_error = ? WHERE id = ?;",
    [syncState, lastError, id]
  );
}

export async function removeQueuedDistribution(id: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM distribution_queue WHERE id = ?;", [id]);
}
