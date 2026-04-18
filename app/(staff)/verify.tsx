import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import {
  distributeToBeneficiary,
  isLikelyOfflineError,
  lookupBeneficiaryForEvent,
  queueDistributionForOffline
} from "@/features/staff/distribution";
import { theme } from "@/constants/theme";
import { useOperations } from "@/providers/OperationsProvider";
import { useToast } from "@/providers/ToastProvider";
import { DistributionItemRecord, StaffBeneficiaryLookupResult } from "@/types/domain";

export default function StaffVerifyScreen() {
  const params = useLocalSearchParams<{ eventId: string; lookup?: string }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const lookup = Array.isArray(params.lookup) ? params.lookup[0] : params.lookup;

  const [result, setResult] = useState<StaffBeneficiaryLookupResult | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isOnline, refreshPendingQueue } = useOperations();
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!eventId || !lookup) {
        setLoading(false);
        setError("Missing event or lookup context.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextResult = await lookupBeneficiaryForEvent(eventId, lookup);
        setResult(nextResult);
        setSelectedItems(
          Object.fromEntries(
            nextResult.allocation_items.map((item) => [
              item.inventory_item_id,
              item.per_beneficiary_quantity
            ]),
          ),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to verify beneficiary.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [eventId, lookup]);

  const distributionItems = useMemo<DistributionItemRecord[]>(() => {
    if (!result) {
      return [];
    }

    return result.allocation_items
      .map((item) => ({
        inventory_item_id: item.inventory_item_id,
        item_name: item.inventory_item?.name ?? item.inventory_item_id,
        quantity: selectedItems[item.inventory_item_id] ?? 0,
        unit: item.inventory_item?.unit ?? "unit"
      }))
      .filter((item) => item.quantity > 0);
  }, [result, selectedItems]);

  const confirmDistribution = async () => {
    if (!eventId || !result) {
      return;
    }

    if (distributionItems.length === 0) {
      const message = "Select at least one item quantity before confirming the distribution.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (result.already_claimed) {
      const message = "This beneficiary has already claimed for the selected event.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!isOnline) {
        await queueDistributionForOffline({
          eventId,
          beneficiaryId: result.beneficiary.id,
          notes,
          items: distributionItems,
          lookupValue: lookup ?? null
        });
        await refreshPendingQueue();
        showToast("Distribution saved offline and queued for sync.", "success");
        router.replace("/(staff)");
        return;
      }

      await distributeToBeneficiary({
        eventId,
        beneficiaryId: result.beneficiary.id,
        notes,
        items: distributionItems
      });
      showToast("Distribution confirmed and synced.", "success");
      router.replace("/(staff)");
    } catch (saveError) {
      if (isLikelyOfflineError(saveError)) {
        try {
          await queueDistributionForOffline({
            eventId,
            beneficiaryId: result.beneficiary.id,
            notes,
            items: distributionItems,
            lookupValue: lookup ?? null
          });
          await refreshPendingQueue();
          showToast("Connection dropped. Distribution was queued for sync.", "success");
          router.replace("/(staff)");
          return;
        } catch (queueError) {
          const queueMessage = queueError instanceof Error ? queueError.message : "Unable to queue this distribution.";
          setError(queueMessage);
          showToast(queueMessage, "error");
          return;
        }
      }

      const message = saveError instanceof Error ? saveError.message : "Unable to log this distribution.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Verify beneficiary" subtitle="Checking approval, assignment, and duplicate claims...">
        <Panel>
          <Text style={{ color: theme.colors.textMuted }}>Loading verification data...</Text>
        </Panel>
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen title="Verify beneficiary" subtitle="No beneficiary record was found for this scan.">
        {error ? (
          <Panel tone="warning">
            <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{error}</Text>
          </Panel>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      title={result.beneficiary.full_name}
      subtitle="Review event eligibility, prevent duplicates, and confirm the quantities being distributed."
    >
      {!isOnline ? (
        <Panel tone="warning">
          <Text style={{ color: theme.colors.warningText, fontWeight: "700" }}>
            Offline mode is active. Confirmed distributions will be stored locally and synced when the connection returns.
          </Text>
        </Panel>
      ) : null}

      <Panel tone={result.already_claimed ? "warning" : "success"}>
        <SectionHeader eyebrow="Eligibility" title="Verification summary" />
        <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
          Approval status: {result.beneficiary.status}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          Event: {result.eligible_event?.title ?? "No assigned event match"}
        </Text>
        <Text style={{ color: result.already_claimed ? theme.colors.dangerText : theme.colors.successText, fontWeight: "700" }}>
          {result.already_claimed ? "Already claimed for this event" : "Not yet claimed for this event"}
        </Text>
      </Panel>

      <View style={{ gap: 12 }}>
        {result.allocation_items.map((item) => (
          <Panel key={item.id}>
            <Text style={{ fontWeight: "800", color: theme.colors.text }}>
              {item.inventory_item?.name ?? item.inventory_item_id}
            </Text>
            <Text style={{ color: theme.colors.textMuted }}>
              Event allocation: {item.allocated_quantity} {item.inventory_item?.unit ?? "unit"}
            </Text>
            <Text style={{ color: theme.colors.textMuted }}>
              Suggested per beneficiary: {item.per_beneficiary_quantity}
            </Text>
            <TextInput
              value={String(selectedItems[item.inventory_item_id] ?? 0)}
              onChangeText={(value) =>
                setSelectedItems((current) => ({
                  ...current,
                  [item.inventory_item_id]: Number(value) || 0
                }))
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#8ba0b7"
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: theme.colors.inputBorder,
                borderRadius: 16,
                paddingHorizontal: 14,
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBg
              }}
            />
          </Panel>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.text }}>Distribution notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional field notes"
          placeholderTextColor="#8ba0b7"
          style={{
            minHeight: 96,
            borderWidth: 1,
            borderColor: theme.colors.inputBorder,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: theme.colors.text,
            backgroundColor: theme.colors.inputBg
          }}
        />
      </View>

      {error ? (
        <Panel tone="warning">
          <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{error}</Text>
        </Panel>
      ) : null}

      <Button
        label={saving ? "Saving distribution..." : isOnline ? "Confirm distribution" : "Queue distribution offline"}
        onPress={confirmDistribution}
        variant={result.already_claimed ? "secondary" : "primary"}
      />
      <Pressable
        onPress={() => router.replace("/(staff)/scanner")}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Scan another beneficiary</Text>
      </Pressable>
    </Screen>
  );
}
