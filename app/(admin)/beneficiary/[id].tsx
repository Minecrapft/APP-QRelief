import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import {
  fetchBeneficiaryById,
  reviewBeneficiary
} from "@/features/admin/beneficiaries";
import { BeneficiaryRecord } from "@/types/domain";

export default function AdminBeneficiaryDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const beneficiaryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [beneficiary, setBeneficiary] = useState<BeneficiaryRecord | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [priorityFlag, setPriorityFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBeneficiary = async () => {
    if (!beneficiaryId) {
      setLoading(false);
      setError("Missing beneficiary id.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBeneficiaryById(beneficiaryId);
      setBeneficiary(data);
      setInternalNotes(data.internal_notes ?? "");
      setRejectionReason(data.rejection_reason ?? "");
      setPriorityFlag(data.priority_flag);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load beneficiary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBeneficiary();
  }, [beneficiaryId]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!beneficiaryId) {
      return;
    }

    if (status === "rejected" && !rejectionReason.trim()) {
      setError("Add a rejection reason before rejecting this registration.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await reviewBeneficiary(beneficiaryId, {
        status,
        rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
        internal_notes: internalNotes.trim() || null,
        priority_flag: priorityFlag
      });

      setBeneficiary(updated);
      setRejectionReason(updated.rejection_reason ?? "");
      setInternalNotes(updated.internal_notes ?? "");
      setPriorityFlag(updated.priority_flag);
      setMessage(
        status === "approved"
          ? "Beneficiary approved. QR token generated server-side."
          : "Beneficiary rejected and the reason is now visible to them.",
      );
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to save review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Beneficiary review" subtitle="Loading registration details...">
        <Text style={{ color: "#166534" }}>Fetching beneficiary record...</Text>
      </Screen>
    );
  }

  if (!beneficiary || error) {
    return (
      <Screen title="Beneficiary review" subtitle="Unable to open this registration right now.">
        {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen
      title={beneficiary.full_name}
      subtitle="Review submitted details, set internal flags, and decide whether to approve or reject."
    >
      <View style={{ gap: 10, padding: 18, borderRadius: 18, backgroundColor: "#ecfdf5" }}>
        <Text style={{ color: "#14532d", fontWeight: "700" }}>Current status: {beneficiary.status}</Text>
        <Text style={{ color: "#166534" }}>Contact: {beneficiary.contact_number}</Text>
        <Text style={{ color: "#166534" }}>Address: {beneficiary.address}</Text>
        <Text style={{ color: "#166534" }}>Household size: {beneficiary.household_size}</Text>
        <Text style={{ color: "#166534" }}>Government ID: {beneficiary.government_id}</Text>
        {beneficiary.qr_token ? (
          <Text style={{ color: "#166534" }}>QR token: {beneficiary.qr_token}</Text>
        ) : (
          <Text style={{ color: "#92400e" }}>QR token will be generated after approval.</Text>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#14532d" }}>Internal notes</Text>
        <TextInput
          value={internalNotes}
          onChangeText={setInternalNotes}
          multiline
          placeholder="Review notes for staff or admins"
          placeholderTextColor="#65a30d"
          style={{
            minHeight: 110,
            borderWidth: 1,
            borderColor: "#bbf7d0",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: "#052e16",
            backgroundColor: "#f7fee7"
          }}
        />
      </View>

      <Pressable
        onPress={() => setPriorityFlag((current) => !current)}
        style={{
          minHeight: 52,
          paddingHorizontal: 16,
          borderRadius: 16,
          backgroundColor: priorityFlag ? "#166534" : "#f0fdf4",
          borderWidth: 1,
          borderColor: priorityFlag ? "#166534" : "#bbf7d0",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: priorityFlag ? "#f0fdf4" : "#14532d", fontWeight: "700" }}>
          {priorityFlag ? "Priority flag enabled" : "Tap to mark as priority household"}
        </Text>
      </Pressable>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#14532d" }}>Rejection reason</Text>
        <TextInput
          value={rejectionReason}
          onChangeText={setRejectionReason}
          multiline
          placeholder="Explain what needs correction if rejected"
          placeholderTextColor="#65a30d"
          style={{
            minHeight: 96,
            borderWidth: 1,
            borderColor: "#fecaca",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: "#7f1d1d",
            backgroundColor: "#fff1f2"
          }}
        />
      </View>

      {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "#166534" }}>{message}</Text> : null}

      <View style={{ gap: 12 }}>
        <Button
          label={saving ? "Saving..." : "Approve and generate QR"}
          onPress={() => handleReview("approved")}
        />
        <Button
          label={saving ? "Saving..." : "Reject with reason"}
          onPress={() => handleReview("rejected")}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}
