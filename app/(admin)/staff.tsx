import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { createStaffInvitation, fetchStaffMembers, revokeStaffInvitation, updateStaffStatus } from "@/features/admin/operations";
import { StaffInvitationRecord, StaffRecord } from "@/types/domain";
import { useToast } from "@/providers/ToastProvider";

export default function StaffScreen() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitationRecord[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStaffMembers();
      setStaff(data.staff);
      setInvitations(data.invitations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const inviteStaff = async () => {
    setSaving(true);
    setError(null);

    try {
      const invitation = await createStaffInvitation({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      });
      setFullName("");
      setEmail("");
      setExpiresAt("");
      await load();
      showToast(`Staff invitation created. Code: ${invitation.invite_code}`, "success");
    } catch (inviteError) {
      const message = inviteError instanceof Error ? inviteError.message : "Unable to create staff invitation.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    try {
      await revokeStaffInvitation(id);
      await load();
      showToast("Staff invitation revoked.", "success");
    } catch (revokeError) {
      const message = revokeError instanceof Error ? revokeError.message : "Unable to revoke invitation.";
      setError(message);
      showToast(message, "error");
    }
  };

  const toggleStaff = async (id: string, isActive: boolean) => {
    try {
      await updateStaffStatus(id, !isActive);
      await load();
      showToast(`Staff member ${isActive ? "deactivated" : "activated"}.`, "success");
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "Unable to update staff status.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="Staff management"
      subtitle="Invite staff securely, review pending invitations, and control who is available for event assignments."
    >
      <Panel>
        <SectionHeader
          eyebrow="Invite Staff"
          title="Create a staff invitation"
          subtitle="Admins issue invite codes here. Staff sign up with the matching email address and invite code."
        />
        <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Maria Santos" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="staff.member@example.com" />
        <Input label="Expires at" value={expiresAt} onChangeText={setExpiresAt} placeholder="2026-04-25T17:00" />
        <Button label={saving ? "Creating invitation..." : "Create staff invitation"} onPress={inviteStaff} />
      </Panel>

      {loading ? <LoadingState label="Loading staff management..." /> : null}
      {error ? <InlineMessage tone="error" message={error} /> : null}

      <Panel>
        <SectionHeader
          eyebrow="Pending Invites"
          title="Active invitation codes"
          subtitle="Share these details with staff members so they can register securely."
        />
        {invitations.length === 0 ? (
          <EmptyState
            title="No active invitations"
            message="Create a staff invitation to generate a code for a new team member."
          />
        ) : (
          invitations.map((entry) => (
            <View key={entry.id} style={{ gap: 6, padding: 16, borderRadius: 18, backgroundColor: "#fff" }}>
              <Text style={{ fontWeight: "800", color: "#052e16" }}>{entry.full_name}</Text>
              <Text style={{ color: "#166534" }}>{entry.email}</Text>
              <Text style={{ color: "#166534" }}>Code: {entry.invite_code}</Text>
              <Text style={{ color: "#166534" }}>Expires: {new Date(entry.expires_at).toLocaleString()}</Text>
              <Button label="Revoke invitation" onPress={() => revokeInvitation(entry.id)} variant="secondary" />
            </View>
          ))
        )}
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Staff Directory"
          title="Current staff accounts"
          subtitle="Activate or deactivate staff accounts and review who is available for assignments."
        />
        {staff.length === 0 ? (
          <EmptyState
            title="No staff accounts yet"
            message="Once an invited staff member completes signup, their account will appear here."
          />
        ) : (
          staff.map((entry) => (
            <View key={entry.id} style={{ gap: 8, padding: 18, borderRadius: 18, backgroundColor: "#fff" }}>
              <Text style={{ fontWeight: "800", color: "#052e16" }}>{entry.profile?.full_name ?? entry.id}</Text>
              <Text style={{ color: "#166534" }}>Role: {entry.profile?.role ?? "staff"}</Text>
              <Text style={{ color: "#166534" }}>Status: {entry.is_active ? "Active" : "Inactive"}</Text>
              <Button
                label={entry.is_active ? "Deactivate staff" : "Activate staff"}
                onPress={() => toggleStaff(entry.id, entry.is_active)}
                variant="secondary"
              />
            </View>
          ))
        )}
      </Panel>
    </Screen>
  );
}
