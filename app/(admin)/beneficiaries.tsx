import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { fetchBeneficiaries } from "@/features/admin/beneficiaries";
import { BeneficiaryRecord, BeneficiaryStatus } from "@/types/domain";

const FILTERS: Array<{ label: string; value: BeneficiaryStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" }
];

export default function AdminBeneficiariesScreen() {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>([]);
  const [filter, setFilter] = useState<BeneficiaryStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBeneficiaries(filter);
      setBeneficiaries(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load beneficiaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBeneficiaries();
  }, [filter]);

  const filteredBeneficiaries = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return beneficiaries;
    }

    return beneficiaries.filter((entry) =>
      [entry.full_name, entry.contact_number, entry.address, entry.government_id]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [beneficiaries, search]);

  return (
    <Screen
      title="Beneficiary approvals"
      subtitle="Review registrations, filter by status, and open each applicant for approval or rejection."
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        accessibilityLabel="Search beneficiaries"
        placeholder="Search by name, contact, address, or ID"
        placeholderTextColor="#8ba0b7"
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: theme.colors.inputBorder,
          borderRadius: theme.radii.md,
          paddingHorizontal: 14,
          color: theme.colors.text,
          backgroundColor: theme.colors.inputBg
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {FILTERS.map((option) => {
          const selected = option.value === filter;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter beneficiaries by ${option.label}`}
              accessibilityState={{ selected }}
              style={{
                paddingHorizontal: 14,
                minHeight: 40,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? "#166534" : "#f0fdf4",
                borderWidth: 1,
                borderColor: selected ? "#166534" : "#bbf7d0"
              }}
            >
              <Text style={{ color: selected ? "#f0fdf4" : "#14532d", fontWeight: "700" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <LoadingState label="Loading beneficiaries..." /> : null}
      {error ? <InlineMessage tone="error" message={error} /> : null}
      {!loading && !error && filteredBeneficiaries.length === 0 ? (
        <EmptyState
          title="No matching beneficiaries"
          message="Try a different filter or search term to find a registration."
        />
      ) : null}

      <View style={{ gap: 12 }}>
        {filteredBeneficiaries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => router.push(`/(admin)/beneficiary/${entry.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open beneficiary record for ${entry.full_name}`}
            style={{
              gap: 8,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#dcfce7",
              backgroundColor: "#ffffff"
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#052e16" }}>
                {entry.full_name}
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  minHeight: 28,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    entry.status === "approved"
                      ? "#dcfce7"
                      : entry.status === "rejected"
                        ? "#fee2e2"
                        : "#fef3c7"
                }}
              >
                <Text
                  style={{
                    color:
                      entry.status === "approved"
                        ? "#166534"
                        : entry.status === "rejected"
                          ? "#991b1b"
                          : "#92400e",
                    fontWeight: "700",
                    textTransform: "capitalize"
                  }}
                >
                  {entry.status}
                </Text>
              </View>
            </View>

            <Text style={{ color: "#166534" }}>{entry.contact_number}</Text>
            <Text style={{ color: "#166534" }}>{entry.address}</Text>
            <Text style={{ color: "#166534" }}>Household size: {entry.household_size}</Text>
            {entry.priority_flag ? (
              <Text style={{ color: "#9a3412", fontWeight: "700" }}>Priority flag enabled</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
