import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/AsyncState";
import { Input } from "@/components/ui/Input";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import {
  distributeToBeneficiary,
  fetchAssignedEvents,
  isLikelyOfflineError,
  lookupBeneficiaryForEvent,
  queueDistributionForOffline
} from "@/features/staff/distribution";
import { theme } from "@/constants/theme";
import { useOperations } from "@/providers/OperationsProvider";
import { useToast } from "@/providers/ToastProvider";
import { DistributionItemRecord, EventRecord, StaffBeneficiaryLookupResult } from "@/types/domain";

export default function StaffVerifyScreen() {
  const params = useLocalSearchParams<{ eventId?: string; lookup?: string }>();
  const initialEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const initialLookup = Array.isArray(params.lookup) ? params.lookup[0] : params.lookup;

  // Search State (for when accessed as a Tab)
  const [searchEventId, setSearchEventId] = useState(initialEventId ?? "");
  const [searchLookup, setSearchLookup] = useState(initialLookup ?? "");
  const [assignedEvents, setAssignedEvents] = useState<EventRecord[]>([]);

  // Verification State
  const [result, setResult] = useState<StaffBeneficiaryLookupResult | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { isOnline, refreshPendingQueue } = useOperations();
  const { showToast } = useToast();

  // Load assignments if needed
  useEffect(() => {
    void fetchAssignedEvents().then(setAssignedEvents).catch(() => setAssignedEvents([]));
  }, []);

  const runVerify = async (eId: string, lkp: string) => {
    if (!eId || !lkp) {
      setError("Please select an event and enter a lookup value.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextResult = await lookupBeneficiaryForEvent(eId, lkp);
      setResult(nextResult);
      setNotes("");
      setSelectedItems(
        Object.fromEntries(
          nextResult.allocation_items.map((item) => [
            item.inventory_item_id,
            item.per_beneficiary_quantity
          ]),
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to verify beneficiary.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Initial load from params
  useEffect(() => {
    if (initialEventId && initialLookup) {
      void runVerify(initialEventId, initialLookup);
    }
  }, [initialEventId, initialLookup]);

  const distributionItems = useMemo<DistributionItemRecord[]>(() => {
    if (!result) return [];
    return result.allocation_items
      .map((item) => ({
        inventory_item_id: item.inventory_item_id,
        item_name: item.inventory_item?.name ?? item.inventory_item_id,
        quantity: selectedItems[item.inventory_item_id] ?? 0,
        unit: item.inventory_item?.unit ?? "unit"
      }))
      .filter((item) => item.quantity > 0);
  }, [result, selectedItems]);

  const hasAllocations = (result?.allocation_items.length ?? 0) > 0;

  const confirmDistribution = async () => {
    if (!searchEventId || !result) return;
    if (!hasAllocations) {
      setError("Event has no allocations. Contact admin.");
      return;
    }
    if (distributionItems.length === 0) {
      showToast("Select item quantities.", "error");
      return;
    }
    if (result.already_claimed) {
      showToast("Already claimed.", "error");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        eventId: searchEventId,
        beneficiaryId: result.beneficiary.id,
        notes,
        items: distributionItems,
        lookupValue: searchLookup
      };

      if (!isOnline) {
        await queueDistributionForOffline(payload);
        await refreshPendingQueue();
        showToast("Distribution queued offline.", "success");
      } else {
        await distributeToBeneficiary(payload);
        showToast("Distribution confirmed.", "success");
      }
      
      setResult(null);
      setSearchLookup("");
      router.replace("/(staff)/history");
    } catch (saveError) {
      if (isLikelyOfflineError(saveError)) {
        await queueDistributionForOffline({ eventId: searchEventId, beneficiaryId: result.beneficiary.id, notes, items: distributionItems, lookupValue: searchLookup });
        await refreshPendingQueue();
        showToast("Queued offline.", "success");
        setResult(null);
        router.replace("/(staff)/history");
      } else {
        setError(saveError instanceof Error ? saveError.message : "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Manual Verification"
      subtitle={result ? `Reviewing ${result.beneficiary.full_name}` : "Search and verify beneficiaries when QR scanning is not possible."}
    >
      {!result ? (
        <View style={{ gap: 20 }}>
          <Panel>
            <SectionHeader eyebrow="Field Search" title="Beneficiary Lookup" subtitle="Select your assigned event and enter the beneficiary name or ID." />
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#64748b" }}>ASSIGNED EVENT</Text>
              <View style={{ gap: 8 }}>
                {assignedEvents.map(ev => (
                  <Pressable 
                    key={ev.id} 
                    onPress={() => setSearchEventId(ev.id)}
                    style={[styles.eventOption, searchEventId === ev.id && styles.eventOptionActive]}
                  >
                    <Text style={[styles.eventOptionText, searchEventId === ev.id && styles.eventOptionTextActive]}>{ev.title}</Text>
                  </Pressable>
                ))}
                {assignedEvents.length === 0 && <Text style={{ color: theme.colors.textMuted }}>No active assignments found.</Text>}
              </View>
              
              <Input label="Lookup Value" value={searchLookup} onChangeText={setSearchLookup} placeholder="Name, ID, or Contact #" />
              
              {error && <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>}
              <Button label={loading ? "Searching..." : "Start Verification"} onPress={() => runVerify(searchEventId, searchLookup)} />
            </View>
          </Panel>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
             <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a" }}>Confirm Distribution</Text>
             <Pressable onPress={() => setResult(null)} style={{ padding: 8 }}>
               <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Cancel</Text>
             </Pressable>
          </View>

          <Panel tone={result.already_claimed ? "warning" : "success"}>
            <SectionHeader eyebrow="Security Check" title={result.beneficiary.full_name} subtitle={result.already_claimed ? "ALREADY CLAIMED" : "ELIGIBLE FOR CLAIM"} />
            <Text style={{ color: theme.colors.textMuted, marginTop: -8 }}>Status: {result.beneficiary.status}</Text>
          </Panel>

          <View style={{ gap: 12 }}>
            <Text style={styles.fieldLabel}>ALLOCATED ITEMS</Text>
            {hasAllocations ? (
              result.allocation_items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: "#0f172a" }}>{item.inventory_item?.name}</Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>Max Suggestion: {item.per_beneficiary_quantity} {item.inventory_item?.unit}</Text>
                  </View>
                  <TextInput
                    value={String(selectedItems[item.inventory_item_id] ?? 0)}
                    onChangeText={(val) => setSelectedItems(prev => ({ ...prev, [item.inventory_item_id]: Number(val) || 0 }))}
                    keyboardType="number-pad"
                    style={styles.quantityInput}
                  />
                </View>
              ))
            ) : (
              <EmptyState title="No allocations" message="This event has no inventory items assigned for distribution." />
            )}
          </View>

          <Input label="Field Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes about this handoff..." multiline />

          {error && <Text style={{ color: "#ef4444" }}>{error}</Text>}
          <Button label={saving ? "Saving..." : "Submit Distribution"} onPress={confirmDistribution} />
        </View>
      )}
    </Screen>
  );
}

const styles = {
  eventOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff"
  },
  eventOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceMuted
  },
  eventOptionText: {
    fontWeight: "600",
    color: "#64748b"
  },
  eventOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: "800"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748b",
    letterSpacing: 0.5
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12
  },
  quantityInput: {
    width: 60,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "center",
    fontWeight: "800",
    color: "#0f172a"
  }
};
