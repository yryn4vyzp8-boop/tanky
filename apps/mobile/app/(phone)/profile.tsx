import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PaymentMethod, Vehicle } from "@tanky/domain";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomNav } from "../../components/BottomNav";
import { useRequireAuth } from "../../lib/use-require-auth";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api-client";
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

  useEffect(() => {
    if (!isReady) return;
    api.vehicles.list().then(({ vehicles }) => setVehicles(vehicles));
    api.paymentMethods.list().then(({ paymentMethods }) => setMethods(paymentMethods));
  }, [isReady]);

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fahrzeuge</Text>
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

        <Text style={styles.sectionTitle}>Zahlungsmethoden</Text>
        <View style={{ gap: spacing.sm }}>
          {methods.map((m) => (
            <Card key={m.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {BRAND_LABEL[m.brand]} ••••{m.last4}
              </Text>
              {m.isDefault && <Text style={styles.itemMeta}>Standard</Text>}
            </Card>
          ))}
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
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { color: colors.primaryMuted, ...typography.headline },
  name: { color: colors.textPrimary, ...typography.headline },
  email: { color: colors.textMuted, ...typography.caption },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong, marginTop: spacing.sm },
  itemCard: { paddingVertical: spacing.md, gap: 2 },
  itemTitle: { color: colors.textPrimary, ...typography.bodyStrong },
  itemMeta: { color: colors.textMuted, ...typography.caption },
  empty: { color: colors.textMuted, ...typography.caption },
});
