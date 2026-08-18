import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FuelStation } from "@tanky/domain";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomNav } from "../../components/BottomNav";
import { useRequireAuth } from "../../lib/use-require-auth";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api-client";
import { formatPricePerLiter } from "../../lib/format";
import { colors, radius, spacing, typography } from "../../lib/theme";

const DISTANCE_KM: Record<string, number> = {
  "station-luzern": 1.2,
  "station-zug": 8.4,
  "station-zurich": 45.2,
  "station-bern": 98.1,
};

export default function HomeScreen() {
  const { isReady } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.stations.list().then(({ stations }) => {
      const sorted = [...stations].sort(
        (a, b) => (DISTANCE_KM[a.id] ?? 99) - (DISTANCE_KM[b.id] ?? 99),
      );
      setStations(sorted);
    });
  }, []);

  useEffect(() => {
    if (isReady) load();
  }, [isReady, load]);

  if (!isReady) return null;

  const nearest = stations[0];
  const rest = stations.slice(1);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              setTimeout(() => setRefreshing(false), 400);
            }}
            tintColor={colors.textSecondary}
          />
        }
      >
        <Text style={styles.greeting}>Hallo, {user?.firstName ?? ""} 👋</Text>
        <Text style={styles.headline}>Tankstelle in deiner Nähe</Text>

        {nearest && (
          <Card style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroDistance}>{DISTANCE_KM[nearest.id]?.toFixed(1)} km</Text>
              {nearest.tankyEnabled && (
                <View style={styles.tankyBadge}>
                  <Text style={styles.tankyBadgeText}>TANKY</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{nearest.name}</Text>
            <Text style={styles.heroCity}>{nearest.city}</Text>
            <Text style={styles.heroPrice}>
              {formatPricePerLiter(nearest.fuelProducts.find((p) => p.fuelType === "PETROL_95")!.pricePerLiterMilliFrancs)}
              <Text style={styles.heroPriceLabel}> · Bleifrei 95</Text>
            </Text>
            <Button onPress={() => router.push(`/(phone)/station/${nearest.id}`)}>TANKEN</Button>
          </Card>
        )}

        {rest.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weitere Stationen</Text>
            <View style={{ gap: spacing.md }}>
              {rest.map((station) => (
                <Card key={station.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{station.name}</Text>
                    <Text style={styles.rowMeta}>
                      {DISTANCE_KM[station.id]?.toFixed(1)} km ·{" "}
                      {formatPricePerLiter(station.fuelProducts.find((p) => p.fuelType === "PETROL_95")!.pricePerLiterMilliFrancs)}
                    </Text>
                  </View>
                  <Button variant="secondary" fullWidth={false} onPress={() => router.push(`/(phone)/station/${station.id}`)}>
                    Wählen
                  </Button>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  greeting: { color: colors.textSecondary, ...typography.body },
  headline: { color: colors.textPrimary, ...typography.title, marginTop: spacing.xs },
  heroCard: { gap: spacing.sm, marginTop: spacing.sm },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroDistance: { color: colors.textSecondary, ...typography.captionStrong },
  tankyBadge: { backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tankyBadgeText: { color: colors.primaryMuted, ...typography.micro },
  heroName: { color: colors.textPrimary, ...typography.headline, marginTop: spacing.xs },
  heroCity: { color: colors.textMuted, ...typography.caption },
  heroPrice: { color: colors.textPrimary, ...typography.title, marginTop: spacing.sm, marginBottom: spacing.sm },
  heroPriceLabel: { color: colors.textMuted, ...typography.caption },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong, marginTop: spacing.md },
  rowCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  rowName: { color: colors.textPrimary, ...typography.bodyStrong },
  rowMeta: { color: colors.textMuted, ...typography.caption, marginTop: 2 },
});
