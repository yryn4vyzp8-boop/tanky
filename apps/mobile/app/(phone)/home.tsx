import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FuelStation } from "@tanky/domain";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomNav } from "../../components/BottomNav";
import { ErrorState } from "../../components/ErrorState";
import { useRequireAuth } from "../../lib/use-require-auth";
import { useAuth } from "../../lib/auth-context";
import { api, ApiError } from "../../lib/api-client";
import { formatPricePerLiter } from "../../lib/format";
import { colors, radius, spacing, typography } from "../../lib/theme";
import { STRONG_EASE_OUT } from "../../lib/motion";

const DISTANCE_KM: Record<string, number> = {
  "station-luzern": 1.2,
  "station-zug": 8.4,
  "station-zurich": 45.2,
  "station-bern": 98.1,
};

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay: index * 65, easing: STRONG_EASE_OUT, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay: index * 65, easing: STRONG_EASE_OUT, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonBlock({ width, height, style }: { width?: number | string; height: number; style?: object }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.surfaceHighlight, opacity: pulse }, style]}
    />
  );
}

export default function HomeScreen() {
  const { isReady } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(16)).current;

  const load = useCallback(() => {
    setError(null);
    api.stations
      .list()
      .then(({ stations }) => {
        const sorted = [...stations].sort(
          (a, b) => (DISTANCE_KM[a.id] ?? 99) - (DISTANCE_KM[b.id] ?? 99),
        );
        setStations(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Tankstellen konnten nicht geladen werden.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isReady) load();
  }, [isReady, load]);

  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 320, easing: STRONG_EASE_OUT, useNativeDriver: true }),
        Animated.timing(heroY, { toValue: 0, duration: 320, easing: STRONG_EASE_OUT, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, error]);

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
        <Text style={styles.greeting}>Hallo, {user?.firstName ?? ""}</Text>
        <Text style={styles.headline}>Tankstelle in deiner Nähe</Text>

        {loading && !error && (
          <Card style={styles.heroCard}>
            <SkeletonBlock width="40%" height={13} style={{ marginBottom: spacing.sm }} />
            <SkeletonBlock width="70%" height={20} style={{ marginBottom: spacing.xs }} />
            <SkeletonBlock width="40%" height={13} style={{ marginBottom: spacing.md }} />
            <SkeletonBlock width="50%" height={26} style={{ marginBottom: spacing.md }} />
            <SkeletonBlock width="100%" height={52} style={{ borderRadius: radius.md }} />
          </Card>
        )}

        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && nearest && (
          <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroY }] }}>
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
          </Animated.View>
        )}

        {!loading && rest.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weitere Stationen</Text>
            <View style={{ gap: spacing.md }}>
              {rest.map((station, i) => (
                <StaggerItem key={station.id} index={i}>
                  <Card style={styles.rowCard}>
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
                </StaggerItem>
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
  scroll: { padding: spacing.lg, gap: spacing.xl },
  greeting: { color: colors.textMuted, ...typography.caption, letterSpacing: 0.4, textTransform: "uppercase" },
  headline: { color: colors.textPrimary, ...typography.title, marginTop: spacing.xs },
  heroCard: { gap: spacing.md, marginTop: spacing.sm, padding: spacing.xl },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroDistance: { color: colors.textSecondary, ...typography.captionStrong },
  tankyBadge: { backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  tankyBadgeText: { color: colors.primaryMuted, ...typography.micro },
  heroName: { color: colors.textPrimary, ...typography.headline, marginTop: spacing.xs },
  heroCity: { color: colors.textMuted, ...typography.caption },
  heroPrice: { color: colors.textPrimary, ...typography.display, marginTop: spacing.sm, marginBottom: spacing.md },
  heroPriceLabel: { color: colors.textMuted, ...typography.body, fontWeight: "300" as const },
  sectionTitle: { color: colors.textMuted, ...typography.micro, letterSpacing: 0.8, textTransform: "uppercase" },
  rowCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  rowName: { color: colors.textPrimary, ...typography.bodyStrong },
  rowMeta: { color: colors.textMuted, ...typography.caption, marginTop: 2 },
});
