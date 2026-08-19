import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PaymentMethod, Vehicle } from "@tanky/domain";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomNav } from "../../components/BottomNav";
import { ErrorState } from "../../components/ErrorState";
import { useRequireAuth } from "../../lib/use-require-auth";
import { useAuth } from "../../lib/auth-context";
import { api, ApiError } from "../../lib/api-client";
import { fuelTypeLabel } from "../../lib/format";
import { colors, spacing, typography } from "../../lib/theme";

const BRAND_LABEL: Record<PaymentMethod["brand"], string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  TWINT: "TWINT",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
};

export default function ProfileScreen() {
  const { isReady } = useRequireAuth();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "Daten konnten nicht geladen werden.");
    api.vehicles.list().then(({ vehicles }) => setVehicles(vehicles)).catch(onError);
    api.paymentMethods.list().then(({ paymentMethods }) => setMethods(paymentMethods)).catch(onError);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isReady) load();
    }, [isReady, load]),
  );

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {error && <ErrorState message={error} onRetry={load} />}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
          <View style={{ gap: 3 }}>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fahrzeuge</Text>
          <Pressable onPress={() => router.push("/(phone)/add-vehicle")} hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.addLink}>Hinzufügen</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing.sm }}>
          {vehicles.map((v) => (
            <Card key={v.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {v.make} {v.model}
              </Text>
              <Text style={styles.itemMeta}>
                {v.licensePlate} · {fuelTypeLabel(v.fuelType)}
              </Text>
            </Card>
          ))}
          {vehicles.length === 0 && <Text style={styles.empty}>Keine Fahrzeuge hinterlegt.</Text>}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Zahlungsmethoden</Text>
          <Pressable onPress={() => router.push("/(phone)/add-payment-method")} hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={styles.addLink}>Hinzufügen</Text>
          </Pressable>
        </View>
        <View style={{ gap: spacing.sm }}>
          {methods.map((m) => (
            <Card key={m.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {BRAND_LABEL[m.brand]} ••••{m.last4}
              </Text>
              {m.isDefault && <Text style={styles.itemMeta}>Standard</Text>}
            </Card>
          ))}
          {methods.length === 0 && <Text style={styles.empty}>Keine Zahlungsmethoden hinterlegt.</Text>}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button
            variant="secondary"
            onPress={async () => {
              await logout();
              router.replace("/(phone)/login");
            }}
          >
            Abmelden
          </Button>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  // Squircle: rounded square instead of circle
  avatar: {
    width: 60, height: 60,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { color: colors.primaryMuted, ...typography.title },
  name: { color: colors.textPrimary, ...typography.headline },
  email: { color: colors.textMuted, ...typography.caption },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.textPrimary, ...typography.bodyStrong },
  addLink: { color: colors.primaryMuted, ...typography.caption, fontWeight: "500" as const },
  itemCard: { paddingVertical: spacing.md, gap: 3 },
  itemTitle: { color: colors.textPrimary, ...typography.bodyStrong },
  itemMeta: { color: colors.textMuted, ...typography.caption },
  empty: { color: colors.textMuted, ...typography.caption },
});
