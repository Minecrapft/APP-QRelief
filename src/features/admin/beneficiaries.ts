import { supabase } from "@/lib/supabase/client";
import { BeneficiaryRecord, BeneficiaryReviewPayload, BeneficiaryStatus } from "@/types/domain";

export async function fetchBeneficiaries(status?: BeneficiaryStatus | "all") {
  let query = supabase
    .from("beneficiaries")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as BeneficiaryRecord[];
}

export async function fetchBeneficiaryById(id: string) {
  const { data, error } = await supabase.from("beneficiaries").select("*").eq("id", id).single();

  if (error) {
    throw error;
  }

  return data as BeneficiaryRecord;
}

export async function reviewBeneficiary(id: string, payload: BeneficiaryReviewPayload) {
  const { data, error } = await supabase.rpc("review_beneficiary", {
    beneficiary_id: id,
    next_status: payload.status,
    next_rejection_reason: payload.rejection_reason ?? null,
    next_internal_notes: payload.internal_notes ?? null,
    next_priority_flag: payload.priority_flag ?? false
  });

  if (error) {
    throw error;
  }

  return data as BeneficiaryRecord;
}
