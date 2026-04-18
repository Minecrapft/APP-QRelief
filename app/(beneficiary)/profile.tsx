import { useEffect, useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { updateBeneficiaryProfile } from "@/features/beneficiary/portal";
import { useAuth } from "@/providers/AuthProvider";

export default function BeneficiaryProfileScreen() {
  const { profile, beneficiaryRecord, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? beneficiaryRecord?.full_name ?? "");
    setContactNumber(beneficiaryRecord?.contact_number ?? "");
    setAddress(beneficiaryRecord?.address ?? "");
    setHouseholdSize(String(beneficiaryRecord?.household_size ?? 1));
    setGovernmentId(beneficiaryRecord?.government_id ?? "");
  }, [beneficiaryRecord, profile]);

  const save = async () => {
    setError(null);
    setMessage(null);

    try {
      await updateBeneficiaryProfile({
        full_name: fullName,
        contact_number: contactNumber,
        address,
        household_size: Number(householdSize) || 1,
        government_id: governmentId
      });
      await refreshProfile();
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update your profile.");
    }
  };

  return (
    <Screen
      title="Profile"
      subtitle="Review and update your submitted personal information and registration details."
    >
      <Input label="Full name" value={fullName} onChangeText={setFullName} />
      <Input label="Contact number" value={contactNumber} onChangeText={setContactNumber} />
      <Input label="Address" value={address} onChangeText={setAddress} multiline />
      <Input label="Household size" value={householdSize} onChangeText={setHouseholdSize} keyboardType="number-pad" />
      <Input label="Government ID" value={governmentId} onChangeText={setGovernmentId} />
      {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "#166534" }}>{message}</Text> : null}
      <Button label="Save profile" onPress={save} />
    </Screen>
  );
}
