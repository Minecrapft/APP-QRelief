import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddressInput } from "@/components/ui/AddressInput";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { RoleSelect } from "@/components/ui/RoleSelect";
import { Screen } from "@/components/ui/Screen";
import { DEFAULT_BENEFICIARY_FORM, ROLE_OPTIONS } from "@/constants/app";
import { theme } from "@/constants/theme";
import { signUpSchema } from "@/lib/validation/auth";
import { AppRole, BeneficiaryRegistrationPayload } from "@/types/domain";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function SignUpScreen() {
  const { signUp, loading } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState<Extract<AppRole, "beneficiary" | "staff">>("beneficiary");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [householdSize, setHouseholdSize] = useState("1");
  const [governmentId, setGovernmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const beneficiaryPayload = useMemo<BeneficiaryRegistrationPayload>(
    () => ({
      ...DEFAULT_BENEFICIARY_FORM,
      full_name: fullName,
      contact_number: contactNumber,
      address,
      household_size: Number(householdSize) || 1,
      government_id: governmentId
    }),
    [address, contactNumber, fullName, governmentId, householdSize],
  );

  const handleSignUp = async () => {
    setError(null);
    setSuccess(null);
    const parsed = signUpSchema.safeParse({
      role,
      fullName,
      email: email.trim(),
      password,
      contactNumber,
      address,
      householdSize,
      governmentId,
      inviteCode
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please review the registration form.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      await signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        role,
        fullName: parsed.data.fullName,
        beneficiaryData: role === "beneficiary" ? beneficiaryPayload : undefined,
        inviteCode: role === "staff" ? parsed.data.inviteCode.trim().toUpperCase() : undefined
      });

      const message =
        role === "beneficiary"
          ? "Account created. Your registration is pending admin approval."
          : "Staff account created from a valid invitation. You can sign in after email confirmation if enabled.";
      setSuccess(message);
      showToast(message, "success");
    } catch (signUpError) {
      const message =
        signUpError instanceof Error
          ? signUpError.message
          : "Unable to create your account right now.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="Create account"
      subtitle="Start the right workflow for your role in the relief operation."
    >
      <Panel>
        <SectionHeader
          eyebrow="Registration"
          title="Set up your QRelief access"
          subtitle="Choose the role that matches how you participate in relief operations. Beneficiaries complete a fuller intake for admin review."
        />
      </Panel>

      <RoleSelect
        label="Role"
        value={role}
        onChange={(nextRole) => setRole(nextRole as Extract<AppRole, "beneficiary" | "staff">)}
        options={ROLE_OPTIONS}
      />
      <Input
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        placeholder="Juan Dela Cruz"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="name@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="Choose a secure password"
      />

      {role === "staff" ? (
        <Panel>
          <SectionHeader
            eyebrow="Staff Invitation"
            title="Invitation required"
            subtitle="Staff accounts are created from admin-issued invites. Enter the code exactly as provided by your administrator."
          />
          <Input
            label="Invitation code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="AB12CD34"
          />
        </Panel>
      ) : null}

      {role === "beneficiary" ? (
        <Panel>
          <SectionHeader
            eyebrow="Beneficiary Intake"
            title="Application details"
            subtitle="These details are reviewed before a QR token is issued for event access."
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
        </Panel>
      ) : null}

      {error ? (
        <Panel tone="warning">
          <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{error}</Text>
        </Panel>
      ) : null}
      {success ? (
        <Panel tone="success">
          <Text style={{ color: theme.colors.successText, fontWeight: "700" }}>{success}</Text>
        </Panel>
      ) : null}

      <Button label={loading ? "Creating..." : "Create account"} onPress={handleSignUp} />
    </Screen>
  );
}
