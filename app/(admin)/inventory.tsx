import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

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
  { label: string; description: string; placeholder: string }
> = {
  stock_in: {
    label: "Stock in",
    description: "Use this when new items arrive, such as donations, deliveries, or restocking.",
    placeholder: "Example: Donated canned goods delivery"
  },
  stock_out: {
    label: "Stock out",
    description: "Use this when inventory leaves storage outside of beneficiary distribution, such as transfers or spoilage removal.",
    placeholder: "Example: Sent to another evacuation center"
  },
  correction: {
    label: "Correction",
    description: "Use this to fix a wrong stock count after recounting or correcting a previous entry.",
    placeholder: "Example: Physical recount corrected the system balance"
  },
  allocation: {
    label: "Allocation",
    description: "System-generated when inventory is assigned to an event.",
    placeholder: "Allocation entries are created automatically."
  },
  distribution: {
    label: "Distribution",
    description: "System-generated when staff confirm beneficiary distributions.",
    placeholder: "Distribution entries are created automatically."
  }
};

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [editing, setEditing] = useState<InventoryItemRecord | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [threshold, setThreshold] = useState("0");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [movementType, setMovementType] = useState<InventoryMovementType>("stock_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryDashboard();
      setItems(data.items);
      setMovements(data.movements);
      if (!selectedItemId && data.items[0]) {
        setSelectedItemId(data.items[0].id);
      }
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
  };

  const submitItem = async () => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedUnit = unit.trim();

    if (!trimmedName) {
      setError("Enter an item name before saving.");
      return;
    }

    if (!trimmedCategory) {
      setError("Select a category before saving.");
      return;
    }

    if (!trimmedUnit) {
      setError("Enter a unit such as bags, boxes, or bottles.");
      return;
    }

    if (/^\d+$/.test(trimmedUnit)) {
      setError("Unit should describe the packaging, like bags or bottles, not a number.");
      return;
    }

    try {
      await saveInventoryItem({
        id: editing?.id,
        name: trimmedName,
        category: trimmedCategory,
        unit: trimmedUnit,
        low_stock_threshold: Number(threshold) || 0
      });
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save item.");
    }
  };

  const submitAdjustment = async () => {
    setError(null);
    const rawAmount = Number(adjustDelta);
    const trimmedReason = adjustReason.trim();

    if (!selectedItemId) {
      setError("Select an inventory item before adjusting stock.");
      return;
    }

    if (!Number.isFinite(rawAmount) || rawAmount === 0) {
      setError(
        movementType === "correction"
          ? "Enter a positive or negative correction amount."
          : "Enter a quantity greater than zero."
      );
      return;
    }

    if (!trimmedReason) {
      setError("Add a short reason so the stock audit trail stays clear.");
      return;
    }

    const delta =
      movementType === "stock_out"
        ? -Math.abs(rawAmount)
        : movementType === "stock_in"
          ? Math.abs(rawAmount)
          : rawAmount;

    try {
      await adjustInventoryStock({
        item_id: selectedItemId,
        delta,
        movement_reason: trimmedReason,
        movement_type: movementType
      });
      setAdjustDelta("");
      setAdjustReason("");
      await load();
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "Unable to adjust stock.");
    }
  };

  return (
    <Screen title="Inventory" subtitle="Maintain stock levels, thresholds, and a movement audit trail for relief items.">
      <View style={{ padding: 18, borderRadius: 18, backgroundColor: lowStockCount > 0 ? "#fff7ed" : "#ecfdf5" }}>
        <Text style={{ fontWeight: "800", color: "#052e16" }}>Low-stock alerts: {lowStockCount}</Text>
        <Text style={{ color: "#166534" }}>Items at or below threshold are highlighted below.</Text>
      </View>

      <Input label="Item name" value={name} onChangeText={setName} placeholder="Rice pack" />
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 0.2 }}>
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = category === option;

            return (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
                accessibilityRole="button"
                accessibilityLabel={`Set category to ${option}`}
                accessibilityState={{ selected: isSelected }}
                style={{
                  minHeight: 42,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: isSelected ? theme.colors.primaryStrong : theme.colors.cardBorder
                }}
              >
                <Text style={{ color: isSelected ? theme.colors.textOnDark : theme.colors.text, fontWeight: "700" }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="bags" />
      <Input label="Low-stock threshold" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" placeholder="20" />
      {error ? <InlineMessage tone="error" message={error} /> : null}
      <View style={{ gap: 12 }}>
        <Button label={editing ? "Update item" : "Create item"} onPress={submitItem} />
        {editing ? <Button label="Cancel edit" onPress={resetForm} variant="secondary" /> : null}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Stock adjustment</Text>
      {loading ? <LoadingState label="Loading inventory..." /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No inventory items yet"
          message="Create an inventory item first so stock levels and movements can be tracked."
        />
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((item) => (
          <Button
            key={item.id}
            label={`${item.name} • ${item.current_stock} in stock`}
            onPress={() => setSelectedItemId(item.id)}
            variant={selectedItemId === item.id ? "primary" : "secondary"}
            accessibilityLabel={`Select inventory item ${item.name}`}
          />
        ))}
      </View>
      {selectedItem ? (
        <View
          style={{
            gap: 4,
            padding: 16,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
            Selected item: {selectedItem.name}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            Current stock: {selectedItem.current_stock}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            Unit: {selectedItem.unit}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            Category: {selectedItem.category}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MOVEMENT_TYPES.map((type) => (
          <Button
            key={type}
            label={MOVEMENT_TYPE_COPY[type].label}
            onPress={() => setMovementType(type)}
            variant={movementType === type ? "primary" : "secondary"}
            accessibilityLabel={`Set movement type to ${MOVEMENT_TYPE_COPY[type].label}`}
          />
        ))}
      </View>
      <View
        style={{
          gap: 6,
          padding: 16,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
          {MOVEMENT_TYPE_COPY[movementType].label}
        </Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {MOVEMENT_TYPE_COPY[movementType].description}
        </Text>
      </View>
      <Input
        label={movementType === "correction" ? "Correction amount" : "Quantity"}
        value={adjustDelta}
        onChangeText={setAdjustDelta}
        keyboardType="number-pad"
        placeholder={movementType === "correction" ? "-3 or 5" : "10"}
      />
      <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
        {movementType === "stock_in"
          ? "Enter how many units arrived. The app adds them to current stock."
          : movementType === "stock_out"
            ? "Enter how many units left storage. The app subtracts them from current stock."
            : "Use a positive number to increase stock after a recount, or a negative number to reduce it."}
      </Text>
      <Input
        label="Reason"
        value={adjustReason}
        onChangeText={setAdjustReason}
        placeholder={MOVEMENT_TYPE_COPY[movementType].placeholder}
      />
      <Button label="Apply stock adjustment" onPress={submitAdjustment} />

      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View
            key={item.id}
            style={{
              gap: 6,
              padding: 16,
              borderRadius: 18,
              backgroundColor: item.current_stock <= item.low_stock_threshold ? "#fff7ed" : "#fff"
            }}
          >
            <Text style={{ fontWeight: "800", color: "#052e16" }}>{item.name}</Text>
            <Text style={{ color: "#166534" }}>Category: {item.category}</Text>
            <Text style={{ color: "#166534" }}>Current stock: {item.current_stock}</Text>
            <Text style={{ color: "#166534" }}>Unit: {item.unit}</Text>
            <Text style={{ color: "#166534" }}>Low-stock threshold: {item.low_stock_threshold}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Edit"
                onPress={() => {
                  setEditing(item);
                  setSelectedItemId(item.id);
                  setName(item.name);
                  setCategory(item.category);
                  setUnit(item.unit);
                  setThreshold(String(item.low_stock_threshold));
                }}
                variant="secondary"
                accessibilityLabel={`Edit inventory item ${item.name}`}
              />
              <Button label="Delete" onPress={() => deleteInventoryItem(item.id).then(load)} variant="secondary" accessibilityLabel={`Delete inventory item ${item.name}`} />
            </View>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Recent movement log</Text>
      <View style={{ gap: 10 }}>
        {movements.map((movement) => (
          <View key={movement.id} style={{ gap: 4, padding: 16, borderRadius: 18, backgroundColor: "#fff" }}>
            <Text style={{ fontWeight: "700", color: "#052e16" }}>{movement.movement_type}</Text>
            <Text style={{ color: "#166534", fontWeight: "700" }}>
              {MOVEMENT_TYPE_COPY[movement.movement_type as InventoryMovementType]?.label ?? movement.movement_type}
            </Text>
            <Text style={{ color: "#166534" }}>Delta: {movement.quantity_delta}</Text>
            <Text style={{ color: "#166534" }}>{movement.reason}</Text>
          </View>
        ))}
      </View>
      {!loading && movements.length === 0 ? (
        <EmptyState
          title="No movement history yet"
          message="Inventory adjustments and distributions will appear here once activity begins."
        />
      ) : null}
    </Screen>
  );
}
