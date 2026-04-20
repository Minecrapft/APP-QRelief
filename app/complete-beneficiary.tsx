import { useMemo, useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddressInput } from "@/components/ui/AddressInput";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_BENEFICIARY_FORM } from "@/constants/app";
import { theme } from "@/constants/theme";
import { beneficiaryIntakeSchema } from "@/lib/validation/auth";
import { BeneficiaryRegistrationPayload } from "@/types/domain";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function CompleteBeneficiaryScreen() {
  const { completeBeneficiaryIntake, loading, profile } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [householdSize, setHouseholdSize] = useState("1");
  const [governmentId, setGovernmentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const beneficiaryPayload = useMemo<BeneficiaryRegistrationPayload>(
    () => ({
      ...DEFAULT_BENEFICIARY_FORM,
      full_name: fullName,
      contact_number: contactNumber,
      address,
      household_size: Number(householdSize) || 1,
      government_id: governmentId
    }),
    [address, contactNumber, fullName, governmentId, householdSize]
  );

  const handleSubmit = async () => {
    setError(null);

    const parsed = beneficiaryIntakeSchema.safeParse({
      fullName,
      contactNumber,
      address,
      householdSize,
      governmentId
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please complete the beneficiary intake details.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      await completeBeneficiaryIntake(beneficiaryPayload);
      showToast("Beneficiary intake saved. Your registration is now pending admin approval.", "success");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to save your beneficiary details right now.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="Complete intake"
      subtitle="Finish your beneficiary record so QRelief can send your registration for admin review."
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Beneficiary Intake"
          title="One more step before approval"
          subtitle="Google sign-in got you into the app, but QRelief still needs your household details before a QR token can be issued."
        />
      </Panel>

      <Input
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        placeholder="Juan Dela Cruz"
      />
      <Input
        label="Contact number"
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="phone-pad"
        placeholder="+63 900 000 0000"
      />
      <AddressInput
        label="Home address"
        value={address}
        onChangeText={setAddress}
        placeholder="Barangay, municipality, province"
        multiline
      />
      <Input
        label="Household size"
        value={householdSize}
        onChangeText={setHouseholdSize}
        keyboardType="number-pad"
        placeholder="1"
      />
      <Input
        label="Government ID"
        value={governmentId}
        onChangeText={setGovernmentId}
        placeholder="SSS, PhilSys, driver's license, etc."
      />

      {error ? (
        <Panel tone="warning">
          <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{error}</Text>
        </Panel>
      ) : null}

      <Button label={loading ? "Saving intake..." : "Save and continue"} onPress={handleSubmit} />
    </Screen>
  );
}
