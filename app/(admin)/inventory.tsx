import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import {
  adjustInventoryStock,
  deleteInventoryItem,
  fetchInventoryDashboard,
  saveInventoryItem
} from "@/features/admin/operations";
import { theme } from "@/constants/theme";
import { InventoryItemRecord, InventoryMovementType } from "@/types/domain";

const MOVEMENT_TYPES: InventoryMovementType[] = ["stock_in", "stock_out", "correction"];
const CATEGORY_OPTIONS = ["Food", "Water", "Medical", "Hygiene", "Shelter", "Child Care", "Other"] as const;
const MOVEMENT_TYPE_COPY: Record<
  InventoryMovementType,
  { label: string; description: string; placeholder: string; icon: any; color: string; bg: string }
> = {
  stock_in: {
    label: "Stock in",
    description: "New items arrive (donations, deliveries).",
    placeholder: "e.g. Donated canned goods",
    icon: "arrow-down-circle",
    color: "#166534",
    bg: "#f0fdf4"
  },
  stock_out: {
    label: "Stock out",
    description: "Items leave storage (transfers, spoilage).",
    placeholder: "e.g. Sent to Zone B",
    icon: "arrow-up-circle",
    color: "#9f1239",
    bg: "#fff1f2"
  },
  correction: {
    label: "Correction",
    description: "Fix a stock count mismatch.",
    placeholder: "e.g. Physical recount",
    icon: "swap-vertical",
    color: "#b45309",
    bg: "#fffbeb"
  },
  allocation: {
    label: "Allocation",
    description: "Assigned to an event.",
    placeholder: "Auto-generated",
    icon: "archive",
    color: "#1e40af",
    bg: "#eff6ff"
  },
  distribution: {
    label: "Distribution",
    description: "Given to beneficiaries.",
    placeholder: "Auto-generated",
    icon: "people",
    color: "#4f46e5",
    bg: "#e0e7ff"
  }
};

type ViewMode = "list" | "form" | "adjust" | "movements";

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  
  // Create / Edit State
  const [editing, setEditing] = useState<InventoryItemRecord | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [threshold, setThreshold] = useState("0");
  
  // Adjust State
  const [selectedItemId, setSelectedItemId] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovementType>("stock_in");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryDashboard();
      setItems(data.items);
      setMovements(data.movements);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lowStockCount = useMemo(
    () => items.filter((item) => item.current_stock <= item.low_stock_threshold).length,
    [items]
  );
  
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const resetForm = () => {
    setEditing(null);
    setName("");
    setCategory("");
    setUnit("");
    setThreshold("0");
    setError(null);
  };

  const startEdit = (item: InventoryItemRecord) => {
    setEditing(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setThreshold(String(item.low_stock_threshold));
    setViewMode("form");
  };

  const startAdjust = (item: InventoryItemRecord) => {
    setSelectedItemId(item.id);
    setMovementType("stock_in");
    setAdjustDelta("");
    setAdjustReason("");
    setError(null);
    setViewMode("adjust");
  };

  const submitItem = async () => {
    setSaving(true);
    setError(null);
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedUnit = unit.trim();

    try {
      if (!trimmedName) throw new Error("Enter an item name before saving.");
      if (!trimmedCategory) throw new Error("Select a category before saving.");
      if (!trimmedUnit) throw new Error("Enter a packaging unit (e.g., bags, boxes).");
      if (/^\d+$/.test(trimmedUnit)) throw new Error("Unit should describe packaging, not a number.");

      await saveInventoryItem({
        id: editing?.id,
        name: trimmedName,
        category: trimmedCategory,
        unit: trimmedUnit,
        low_stock_threshold: Number(threshold) || 0
      });
      
      resetForm();
      await load();
      setViewMode("list");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save item.");
    } finally {
      setSaving(false);
    }
  };

  const submitAdjustment = async () => {
    setSaving(true);
    setError(null);
    const rawAmount = Number(adjustDelta);
    const trimmedReason = adjustReason.trim();

    try {
      if (!selectedItemId) throw new Error("Select an inventory item.");
      if (!Number.isFinite(rawAmount) || rawAmount === 0) {
        throw new Error(movementType === "correction" ? "Enter a non-zero correction amount." : "Enter a quantity greater than zero.");
      }
      if (!trimmedReason) throw new Error("Add a short reason for the audit log.");

      const delta = movementType === "stock_out" ? -Math.abs(rawAmount) : movementType === "stock_in" ? Math.abs(rawAmount) : rawAmount;

      await adjustInventoryStock({
        item_id: selectedItemId,
        delta,
        movement_reason: trimmedReason,
        movement_type: movementType
      });
      
      await load();
      setViewMode("list");
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "Unable to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW RENDERS
  // -------------------------------------------------------------

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <Pressable 
        style={[styles.tab, viewMode === "list" && styles.activeTab]} 
        onPress={() => setViewMode("list")}
      >
        <Text style={[styles.tabText, viewMode === "list" && styles.activeTabText]}>Overview</Text>
      </Pressable>
      <Pressable 
        style={[styles.tab, viewMode === "movements" && styles.activeTab]} 
        onPress={() => setViewMode("movements")}
      >
        <Text style={[styles.tabText, viewMode === "movements" && styles.activeTabText]}>Audit Logs</Text>
      </Pressable>
    </View>
  );

  const renderList = () => (
    <View style={{ gap: 16 }}>
      {lowStockCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={20} color="#b45309" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{lowStockCount} items running low</Text>
            <Text style={styles.alertText}>Items at or below their safety threshold need restocking.</Text>
          </View>
        </View>
      )}

      {loading ? <LoadingState label="Loading stock..." /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Warehouse is empty" message="Tap the (+) button on the left to add your first inventory item." />
      ) : null}

      <View style={{ gap: 14 }}>
        {items.map((item) => {
          const isLow = item.current_stock <= item.low_stock_threshold;
          return (
            <View key={item.id} style={[styles.itemCard, isLow && { borderColor: "#fca5a5", backgroundColor: "#fff5f5" }]}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <View style={styles.stockBadge}>
                  <Text style={[styles.stockValue, isLow && { color: "#dc2626" }]}>{item.current_stock}</Text>
                  <Text style={styles.unitText}>{item.unit}</Text>
                </View>
              </View>

              <View style={styles.itemFooter}>
                <Pressable style={styles.iconButton} onPress={() => startEdit(item)}>
                  <Ionicons name="settings-outline" size={20} color="#64748b" />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => deleteInventoryItem(item.id).then(load)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Button label="Manage Stock" onPress={() => startAdjust(item)} style={{ minHeight: 40 }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderMovements = () => (
    <View style={{ gap: 16 }}>
      {loading ? <LoadingState label="Loading logs..." /> : null}
      {!loading && movements.length === 0 ? (
        <EmptyState title="No logs found" message="Stock adjustments will be tracked securely here." />
      ) : null}

      <View style={{ gap: 12 }}>
        {movements.map((movement) => {
          const config = MOVEMENT_TYPE_COPY[movement.movement_type as InventoryMovementType] || MOVEMENT_TYPE_COPY.correction;
          const isPositive = movement.quantity_delta > 0;
          return (
            <View key={movement.id} style={styles.logCard}>
              <View style={[styles.logIcon, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.logItemName}>{movement.item?.name || "Unknown Item"}</Text>
                <Text style={styles.logReason}>{movement.reason}</Text>
                <Text style={styles.logDate}>{new Date(movement.created_at).toLocaleString("en-PH")}</Text>
              </View>
              <Text style={[styles.logDelta, { color: isPositive ? "#166534" : "#9f1239" }]}>
                {isPositive ? "+" : ""}{movement.quantity_delta}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={{ gap: 20 }}>
      <View style={styles.navHeader}>
        <Text style={styles.navHeaderTitle}>{editing ? "Update item limits" : "New inventory item"}</Text>
        <Pressable onPress={() => setViewMode("list")} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color="#64748b" />
        </Pressable>
      </View>

      <Input label="Item name" value={name} onChangeText={setName} placeholder="e.g. Bottled Water 500ml" />
      
      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORY_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setCategory(opt)}
              style={[styles.chip, category === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === opt && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input label="Packaging Unit" value={unit} onChangeText={setUnit} placeholder="e.g. boxes" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Safety Threshold" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" placeholder="e.g. 50" />
        </View>
      </View>

      {error ? <InlineMessage tone="error" message={error} /> : null}
      <Button label={saving ? "Saving..." : editing ? "Update item" : "Create item"} onPress={submitItem} />
    </View>
  );

  const renderAdjust = () => (
    <View style={{ gap: 20 }}>
      <View style={styles.navHeader}>
        <Text style={styles.navHeaderTitle}>Manage Stock</Text>
        <Pressable onPress={() => setViewMode("list")} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color="#64748b" />
        </Pressable>
      </View>

      {selectedItem && (
        <View style={styles.contextCard}>
          <View style={styles.contextCardRow}>
            <Text style={styles.contextCardLabel}>Target Item</Text>
            <Text style={styles.contextCardValue}>{selectedItem.name}</Text>
          </View>
          <View style={styles.contextCardRow}>
            <Text style={styles.contextCardLabel}>Current Value</Text>
            <Text style={styles.contextCardValue}>{selectedItem.current_stock} {selectedItem.unit}</Text>
          </View>
        </View>
      )}

      <View style={{ gap: 10 }}>
        <Text style={styles.fieldLabel}>OPERATION TYPE</Text>
        <View style={{ gap: 8 }}>
          {MOVEMENT_TYPES.map((type) => {
            const config = MOVEMENT_TYPE_COPY[type];
            const isActive = movementType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setMovementType(type)}
                style={[styles.typeCard, isActive && { borderColor: config.color, backgroundColor: config.bg }]}
              >
                <Ionicons name={config.icon} size={24} color={isActive ? config.color : "#94a3b8"} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.typeTitle, isActive && { color: config.color }]}>{config.label}</Text>
                  <Text style={styles.typeDesc}>{config.description}</Text>
                </View>
                <View style={[styles.radio, isActive && { borderColor: config.color }]}>
                  {isActive && <View style={[styles.radioDot, { backgroundColor: config.color }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input 
        label={movementType === "correction" ? "Correction delta (-/+)" : `Quantity to ${movementType === "stock_in" ? "add" : "remove"}`}
        value={adjustDelta} 
        onChangeText={setAdjustDelta} 
        keyboardType="number-pad" 
        placeholder={MOVEMENT_TYPE_COPY[movementType].placeholder} 
      />
      
      <Input 
        label="Log Reason" 
        value={adjustReason} 
        onChangeText={setAdjustReason} 
        placeholder="Required for audit trail..." 
      />

      {error ? <InlineMessage tone="error" message={error} /> : null}
      <Button 
        label={saving ? "Applying..." : "Confirm Stock Change"} 
        onPress={submitAdjustment} 
      />
    </View>
  );

  return (
    <>
      <Screen 
        title="Inventory" 
        subtitle={
          viewMode === "list" ? "Monitor stock levels and manage active supplies." :
          viewMode === "movements" ? "Secure audit trail of all warehouse activity." :
          viewMode === "form" ? "Register new relief supplies into the system." :
          "Execute manual adjustments and restocks."
        }
      >
        {(viewMode === "list" || viewMode === "movements") && renderTabs()}
        
        {viewMode === "list" && renderList()}
        {viewMode === "movements" && renderMovements()}
        {viewMode === "form" && renderForm()}
        {viewMode === "adjust" && renderAdjust()}
        
      </Screen>

      {/* FAB (Bottom Left aligned) */}
      {(viewMode === "list" || viewMode === "movements") && (
        <Pressable 
          onPress={() => {
            resetForm();
            setViewMode("form");
          }}
          style={[styles.fab, { bottom: insets.bottom + 15, left: 20 }]}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 14,
    marginBottom: 8
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b"
  },
  activeTabText: {
    color: "#0f172a",
    fontWeight: "800"
  },
  alertBanner: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 12
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400e"
  },
  alertText: {
    fontSize: 13,
    color: "#b45309",
    marginTop: 2
  },
  itemCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  itemCategory: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: theme.colors.primary,
    marginBottom: 4
  },
  itemName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a"
  },
  stockBadge: {
    alignItems: "flex-end",
    backgroundColor: "#f8fafc",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  stockValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 28
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b"
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center"
  },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  logItemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a"
  },
  logReason: {
    fontSize: 13,
    color: "#475569"
  },
  logDate: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2
  },
  logDelta: {
    fontSize: 18,
    fontWeight: "900"
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  navHeaderTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748b",
    letterSpacing: 0.5
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryStrong
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569"
  },
  chipTextActive: {
    color: "#fff"
  },
  contextCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10
  },
  contextCardRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  contextCardLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600"
  },
  contextCardValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "800"
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    gap: 12
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a"
  },
  typeDesc: {
    fontSize: 12,
    color: "#64748b"
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center"
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  }
});
