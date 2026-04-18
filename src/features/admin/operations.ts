import { supabase } from "@/lib/supabase/client";
import {
  BeneficiaryRecord,
  DistributionItemRecord,
  DistributionRecord,
  EventItemRecord,
  EventRecord,
  InventoryItemRecord,
  InventoryMovementRecord,
  StaffAssignmentRecord,
  StaffInvitationRecord,
  StaffRecord
} from "@/types/domain";

export async function fetchEvents() {
  const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRecord[];
}

export async function saveEvent(payload: Partial<EventRecord> & Pick<EventRecord, "title" | "location" | "starts_at">) {
  const record = {
    title: payload.title,
    description: payload.description ?? null,
    location: payload.location,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at ?? null,
    status: payload.status ?? "draft"
  };

  if (payload.id) {
    const { data, error } = await supabase.from("events").update(record).eq("id", payload.id).select().single();
    if (error) throw error;
    return data as EventRecord;
  }

  const { data, error } = await supabase.from("events").insert(record).select().single();
  if (error) throw error;
  return data as EventRecord;
}

export async function fetchEventDetail(id: string) {
  const [eventResult, allocationsResult, assignmentsResult, inventoryResult, staffResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase
      .from("event_items")
      .select("*, inventory_item:inventory_items(*)")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_assignments")
      .select("*, staff:staff(*, profile:profiles(*))")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("staff").select("*, profile:profiles(*)").eq("is_active", true).order("created_at", { ascending: false })
  ]);

  if (eventResult.error) throw eventResult.error;
  if (allocationsResult.error) throw allocationsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;
  if (staffResult.error) throw staffResult.error;

  return {
    event: eventResult.data as EventRecord,
    allocations: (allocationsResult.data ?? []) as EventItemRecord[],
    assignments: (assignmentsResult.data ?? []) as StaffAssignmentRecord[],
    inventoryItems: (inventoryResult.data ?? []) as InventoryItemRecord[],
    availableStaff: (staffResult.data ?? []) as StaffRecord[]
  };
}

export async function upsertEventAllocation(payload: {
  id?: string;
  event_id: string;
  inventory_item_id: string;
  allocated_quantity: number;
  per_beneficiary_quantity: number;
}) {
  if (payload.id) {
    const { data, error } = await supabase
      .from("event_items")
      .update({
        inventory_item_id: payload.inventory_item_id,
        allocated_quantity: payload.allocated_quantity,
        per_beneficiary_quantity: payload.per_beneficiary_quantity
      })
      .eq("id", payload.id)
      .select("*, inventory_item:inventory_items(*)")
      .single();
    if (error) throw error;
    return data as EventItemRecord;
  }

  const { data, error } = await supabase
    .from("event_items")
    .insert({
      event_id: payload.event_id,
      inventory_item_id: payload.inventory_item_id,
      allocated_quantity: payload.allocated_quantity,
      per_beneficiary_quantity: payload.per_beneficiary_quantity
    })
    .select("*, inventory_item:inventory_items(*)")
    .single();
  if (error) throw error;
  return data as EventItemRecord;
}

export async function assignStaffToEvent(eventId: string, staffId: string) {
  const { data, error } = await supabase
    .from("staff_assignments")
    .upsert({ event_id: eventId, staff_id: staffId }, { onConflict: "event_id,staff_id" })
    .select("*, staff:staff(*, profile:profiles(*))")
    .single();
  if (error) throw error;
  return data as StaffAssignmentRecord;
}

export async function removeStaffAssignment(id: string) {
  const { error } = await supabase.from("staff_assignments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchInventoryDashboard() {
  const [itemsResult, movementsResult] = await Promise.all([
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(12)
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (movementsResult.error) throw movementsResult.error;

  return {
    items: (itemsResult.data ?? []) as InventoryItemRecord[],
    movements: (movementsResult.data ?? []) as InventoryMovementRecord[]
  };
}

export async function saveInventoryItem(payload: Partial<InventoryItemRecord> & Pick<InventoryItemRecord, "name" | "category" | "unit">) {
  const record = {
    name: payload.name,
    category: payload.category,
    unit: payload.unit,
    low_stock_threshold: payload.low_stock_threshold ?? 0
  };

  if (payload.id) {
    const { data, error } = await supabase.from("inventory_items").update(record).eq("id", payload.id).select().single();
    if (error) throw error;
    return data as InventoryItemRecord;
  }

  const { data, error } = await supabase.from("inventory_items").insert(record).select().single();
  if (error) throw error;
  return data as InventoryItemRecord;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

export async function adjustInventoryStock(payload: {
  item_id: string;
  delta: number;
  movement_reason: string;
  movement_type: "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
  related_event_id?: string | null;
}) {
  const { data, error } = await supabase.rpc("adjust_inventory_stock", payload);
  if (error) throw error;
  return data as InventoryItemRecord;
}

export async function fetchStaffMembers() {
  const [staffResult, invitationsResult] = await Promise.all([
    supabase
      .from("staff")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_invitations")
      .select("*")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
  ]);

  if (staffResult.error) throw staffResult.error;
  if (invitationsResult.error) throw invitationsResult.error;

  return {
    staff: (staffResult.data ?? []) as StaffRecord[],
    invitations: (invitationsResult.data ?? []) as StaffInvitationRecord[]
  };
}

export async function updateStaffStatus(id: string, isActive: boolean) {
  const { data, error } = await supabase
    .from("staff")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*, profile:profiles(*)")
    .single();
  if (error) throw error;
  return data as StaffRecord;
}

export async function createStaffInvitation(payload: {
  email: string;
  full_name: string;
  expires_at?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_staff_invitation", {
    invite_email: payload.email,
    invite_full_name: payload.full_name,
    invite_expires_at: payload.expires_at ?? null
  });

  if (error) throw error;
  return data as StaffInvitationRecord;
}

export async function revokeStaffInvitation(id: string) {
  const { data, error } = await supabase.rpc("revoke_staff_invitation", {
    invitation_id: id
  });

  if (error) throw error;
  return data as StaffInvitationRecord;
}

export async function validateStaffInvitation(email: string, inviteCode: string) {
  const { data, error } = await supabase.rpc("validate_staff_invitation", {
    invite_email: email,
    provided_code: inviteCode
  });

  if (error) throw error;

  return data as {
    email: string;
    full_name: string;
    invite_code: string;
    expires_at: string;
  };
}

function normalizeDistribution(record: any): DistributionRecord {
  return {
    ...record,
    items: Array.isArray(record.items) ? (record.items as DistributionItemRecord[]) : [],
    beneficiary: record.beneficiary,
    event: record.event
  };
}

export async function fetchAdminDashboard() {
  const [
    beneficiariesResult,
    eventsResult,
    inventoryItemsResult,
    distributionsResult,
    movementsResult
  ] = await Promise.all([
    supabase.from("beneficiaries").select("*"),
    supabase.from("events").select("*"),
    supabase.from("inventory_items").select("*"),
    supabase
      .from("distributions")
      .select("*, beneficiary:beneficiaries(*), event:events(*)")
      .order("distributed_at", { ascending: false }),
    supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  if (beneficiariesResult.error) throw beneficiariesResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (inventoryItemsResult.error) throw inventoryItemsResult.error;
  if (distributionsResult.error) throw distributionsResult.error;
  if (movementsResult.error) throw movementsResult.error;

  const beneficiaries = (beneficiariesResult.data ?? []) as BeneficiaryRecord[];
  const events = (eventsResult.data ?? []) as EventRecord[];
  const inventoryItems = (inventoryItemsResult.data ?? []) as InventoryItemRecord[];
  const distributions = (distributionsResult.data ?? []).map((record) => normalizeDistribution(record));
  const movements = (movementsResult.data ?? []) as InventoryMovementRecord[];

  const recentApprovalActivity = beneficiaries
    .filter((entry) => entry.status !== "pending")
    .map((entry) => ({
      id: `beneficiary-${entry.id}`,
      type: entry.status === "approved" ? "Approval" : "Rejection",
      detail: `${entry.full_name} · ${entry.status}`,
      created_at: entry.updated_at
    }));

  const recentDistributionActivity = distributions.map((entry) => ({
    id: `distribution-${entry.id}`,
    type: "Distribution",
    detail: `${entry.beneficiary?.full_name ?? entry.beneficiary_id} · ${entry.event?.title ?? entry.event_id}`,
    created_at: entry.distributed_at
  }));

  const recentMovementActivity = movements.map((entry) => ({
    id: `movement-${entry.id}`,
    type: "Stock movement",
    detail: `${entry.movement_type} · ${entry.quantity_delta} · ${entry.reason}`,
    created_at: entry.created_at
  }));

  return {
    kpis: {
      pendingApprovals: beneficiaries.filter((entry) => entry.status === "pending").length,
      activeEvents: events.filter((entry) => entry.status === "active").length,
      lowStockCount: inventoryItems.filter((entry) => entry.current_stock <= entry.low_stock_threshold).length,
      totalDistributions: distributions.length
    },
    recentActivity: [...recentApprovalActivity, ...recentDistributionActivity, ...recentMovementActivity]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  };
}

export async function fetchAdminReports() {
  const [
    eventsResult,
    eventItemsResult,
    distributionsResult,
    inventoryItemsResult,
    movementsResult,
    staffResult
  ] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false }),
    supabase.from("event_items").select("*, inventory_item:inventory_items(*)"),
    supabase
      .from("distributions")
      .select("*, event:events(*), beneficiary:beneficiaries(*), staff:staff(*, profile:profiles(*))")
      .order("distributed_at", { ascending: false }),
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }),
    supabase.from("staff").select("*, profile:profiles(*)")
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (eventItemsResult.error) throw eventItemsResult.error;
  if (distributionsResult.error) throw distributionsResult.error;
  if (inventoryItemsResult.error) throw inventoryItemsResult.error;
  if (movementsResult.error) throw movementsResult.error;
  if (staffResult.error) throw staffResult.error;

  const events = (eventsResult.data ?? []) as EventRecord[];
  const eventItems = (eventItemsResult.data ?? []) as EventItemRecord[];
  const distributions = (distributionsResult.data ?? []).map((record) => normalizeDistribution(record));
  const inventoryItems = (inventoryItemsResult.data ?? []) as InventoryItemRecord[];
  const movements = (movementsResult.data ?? []) as InventoryMovementRecord[];
  const staff = (staffResult.data ?? []) as StaffRecord[];

  const eventSummary = events.map((event) => {
    const eventDistributions = distributions.filter((entry) => entry.event_id === event.id);
    const eventAllocations = eventItems.filter((entry) => entry.event_id === event.id);
    const itemsGiven = eventDistributions.flatMap((entry) => entry.items);

    return {
      event,
      beneficiariesServed: new Set(eventDistributions.map((entry) => entry.beneficiary_id)).size,
      totalDistributions: eventDistributions.length,
      allocations: eventAllocations,
      itemsGiven
    };
  });

  const staffActivity = staff.map((member) => {
    const memberDistributions = distributions.filter((entry) => entry.staff_id === member.id);
    const perEvent = memberDistributions.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.event?.title ?? entry.event_id;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      staff: member,
      totalDistributions: memberDistributions.length,
      perEvent
    };
  });

  const distributionTrends = Object.entries(
    distributions.reduce<Record<string, number>>((acc, entry) => {
      const day = new Date(entry.distributed_at).toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  return {
    eventSummary,
    inventoryReport: {
      items: inventoryItems,
      movements,
      lowStockItems: inventoryItems.filter((entry) => entry.current_stock <= entry.low_stock_threshold)
    },
    staffActivity,
    distributionTrends
  };
}
