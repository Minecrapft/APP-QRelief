import { Session } from "@supabase/supabase-js";

export type AppRole = "beneficiary" | "staff" | "admin";
export type BeneficiaryStatus = "pending" | "approved" | "rejected";
export type EventStatus = "draft" | "active" | "cancelled" | "archived";
export type InventoryMovementType = "stock_in" | "stock_out" | "allocation" | "distribution" | "correction";
export type DistributionSyncState = "synced" | "queued" | "syncing" | "sync_failed";
export type QueueSyncStatus = "idle" | "syncing" | "failed";

export interface ProfileRecord {
  id: string;
  role: AppRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryRecord {
  id: string;
  full_name: string;
  contact_number: string;
  address: string;
  household_size: number;
  government_id: string;
  internal_notes: string | null;
  priority_flag: boolean;
  status: BeneficiaryStatus;
  qr_token: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryReviewPayload {
  status: Extract<BeneficiaryStatus, "approved" | "rejected">;
  rejection_reason?: string | null;
  internal_notes?: string | null;
  priority_flag?: boolean;
}

export interface BeneficiaryRegistrationPayload {
  full_name: string;
  contact_number: string;
  address: string;
  household_size: number;
  government_id: string;
}

export interface StaffRecord {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: ProfileRecord;
}

export interface StaffInvitationRecord {
  id: string;
  email: string;
  full_name: string;
  invite_code: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  location: string;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface EventItemRecord {
  id: string;
  event_id: string;
  inventory_item_id: string;
  allocated_quantity: number;
  per_beneficiary_quantity: number;
  created_at: string;
  inventory_item?: InventoryItemRecord;
}

export interface StaffAssignmentRecord {
  id: string;
  event_id: string;
  staff_id: string;
  created_at: string;
  staff?: StaffRecord;
}

export interface InventoryMovementRecord {
  id: string;
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  quantity_delta: number;
  reason: string;
  actor_id: string | null;
  event_id: string | null;
  created_at: string;
}

export interface DistributionItemRecord {
  inventory_item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

export interface DistributionRecord {
  id: string;
  beneficiary_id: string;
  event_id: string;
  staff_id: string;
  notes: string | null;
  sync_state: DistributionSyncState;
  distributed_at: string;
  items: DistributionItemRecord[];
  beneficiary?: BeneficiaryRecord;
  event?: EventRecord;
}

export interface OfflineDistributionQueueRecord {
  id: string;
  event_id: string;
  beneficiary_id: string;
  notes: string | null;
  items: DistributionItemRecord[];
  lookup_value: string | null;
  queued_at: string;
  sync_state: Exclude<DistributionSyncState, "synced">;
  last_error: string | null;
}

export interface StaffBeneficiaryLookupResult {
  beneficiary: BeneficiaryRecord;
  eligible_event: EventRecord | null;
  allocation_items: EventItemRecord[];
  already_claimed: boolean;
  existing_distribution: DistributionRecord | null;
}

export interface SignUpPayload {
  email: string;
  password: string;
  role: Extract<AppRole, "beneficiary" | "staff">;
  fullName: string;
  beneficiaryData?: BeneficiaryRegistrationPayload;
  inviteCode?: string;
}

export interface AuthContextValue {
  session: Session | null;
  profile: ProfileRecord | null;
  beneficiaryRecord: BeneficiaryRecord | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: AppRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
