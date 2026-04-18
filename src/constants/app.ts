import { AppRole, BeneficiaryRegistrationPayload } from "@/types/domain";

export const ROLE_OPTIONS: { label: string; value: Extract<AppRole, "beneficiary" | "staff"> }[] = [
  { label: "Beneficiary", value: "beneficiary" },
  { label: "Staff", value: "staff" }
];

export const DEFAULT_BENEFICIARY_FORM: BeneficiaryRegistrationPayload = {
  full_name: "",
  contact_number: "",
  address: "",
  household_size: 1,
  government_id: ""
};
