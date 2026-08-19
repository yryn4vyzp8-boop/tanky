import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { FuelStation, FuelType } from "@tanky/domain";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { ErrorState } from "../../../components/ErrorState";
import { useRequireAuth } from "../../../lib/use-require-auth";
import { api, ApiError } from "../../../lib/api-client";
import { formatPricePerLiter } from "../../../lib/format";
import { colors, radius, spacing, typography } from "../../../lib/theme";

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "PETROL_95", label: "Bleifrei 95" },
  { value: "PETROL_98", label: "Bleifrei 98" },
  { value: "DIESEL", label: "Diesel" },
];

export default function StationScreen() {
  const { isReady } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [station, setStation] = useState<FuelStation | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>("PETROL_95");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    api.stations
      .get(id)
      .then(({ station }) => setStation(station))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Tankstelle konnte nicht geladen werden."));
  }, [id]);

  useEffect(() => {
    if (isReady) load();
  }, [isReady, load]);

  if (!isReady) return null;

  if (error) {
    return (
      <ScreenContainer scroll={false} style={[styles.container, styles.centerContent]}>
        <ErrorState message={error} onRetry={load} />
      </ScreenContainer>
    );
  }

  if (!station) {
    return (
      <ScreenContainer scroll={false} style={[styles.container, styles.centerContent]}>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  const product = station.fuelProducts.find((p) => p.fuelType === fuelType)!;

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Zurück</Text>
        </Pressable>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationAddress}>
          {station.address}, {station.city}
        </Text>
      </View>

      <View style={styles.segmented}>
        {FUEL_TYPES.map((ft) => (
          <Pressable
            key={ft.value}
            style={[styles.segment, fuelType === ft.value && styles.segmentActive]}
            onPress={() => setFuelType(ft.value)}
          >
            <Text style={[styles.segmentText, fuelType === ft.value && styles.segmentTextActive]}>{ft.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.price}>{formatPricePerLiter(product.pricePerLiterMilliFrancs)}</Text>

      <Text style={styles.sectionTitle}>Zapfsäule wählen</Text>
      <View style={styles.pumpGrid}>
        {station.pumps.map((pump) => {
          const disabled = pump.status !== "AVAILABLE" || !pump.supportedFuelTypes.includes(fuelType);
          return (
            <Pressable
              key={pump.id}
              disabled={disabled}
              style={[styles.pump, disabled && styles.pumpDisabled]}
              onPress={() =>
                router.push({
                  pathname: "/(phone)/payment",
                  params: { stationId: station.id, pumpId: pump.id, fuelType },
                })
              }
            >
              <Text style={[styles.pumpLabel, disabled && styles.pumpLabelDisabled]}>{pump.label}</Text>
              {pump.status !== "AVAILABLE" && <Text style={styles.pumpStatus}>{pump.status === "OCCUPIED" ? "belegt" : "offline"}</Text>}
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: colors.primaryMuted, ...typography.captionStrong, marginBottom: spacing.md },
  stationName: { color: colors.textPrimary, ...typography.title },
  stationAddress: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xs },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  segmentActive: { backgroundColor: colors.primaryTint },
  segmentText: { color: colors.textMuted, ...typography.caption },
  segmentTextActive: { color: colors.primaryMuted, fontWeight: "700" },
  price: { color: colors.textPrimary, ...typography.title, alignSelf: "center" },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong },
  pumpGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  pump: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pumpDisabled: { opacity: 0.4 },
  pumpLabel: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  pumpLabelDisabled: { color: colors.textMuted },
  pumpStatus: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
});
