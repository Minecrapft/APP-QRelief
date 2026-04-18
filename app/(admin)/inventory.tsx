import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

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
import { InventoryItemRecord, InventoryMovementType } from "@/types/domain";

const MOVEMENT_TYPES: InventoryMovementType[] = ["stock_in", "stock_out", "correction"];

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

  const resetForm = () => {
    setEditing(null);
    setName("");
    setCategory("");
    setUnit("");
    setThreshold("0");
  };

  const submitItem = async () => {
    setError(null);
    try {
      await saveInventoryItem({
        id: editing?.id,
        name,
        category,
        unit,
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
    try {
      await adjustInventoryStock({
        item_id: selectedItemId,
        delta: Number(adjustDelta) || 0,
        movement_reason: adjustReason,
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
      <Input label="Category" value={category} onChangeText={setCategory} placeholder="Food" />
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
            label={item.name}
            onPress={() => setSelectedItemId(item.id)}
            variant={selectedItemId === item.id ? "primary" : "secondary"}
            accessibilityLabel={`Select inventory item ${item.name}`}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MOVEMENT_TYPES.map((type) => (
          <Button
            key={type}
            label={type}
            onPress={() => setMovementType(type)}
            variant={movementType === type ? "primary" : "secondary"}
            accessibilityLabel={`Set movement type to ${type}`}
          />
        ))}
      </View>
      <Input label="Quantity delta" value={adjustDelta} onChangeText={setAdjustDelta} keyboardType="number-pad" placeholder="50 or -10" />
      <Input label="Reason" value={adjustReason} onChangeText={setAdjustReason} placeholder="Donated stock delivery" />
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
            <Text style={{ color: "#166534" }}>{item.category} | {item.current_stock} {item.unit}</Text>
            <Text style={{ color: "#166534" }}>Low-stock threshold: {item.low_stock_threshold}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Edit"
                onPress={() => {
                  setEditing(item);
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
