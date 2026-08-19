import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { FuelType, PaymentMethod } from "@tanky/domain";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { useRequireAuth } from "../../lib/use-require-auth";
import { api, ApiError } from "../../lib/api-client";
import { colors, radius, spacing, typography } from "../../lib/theme";

const PRESET_AMOUNTS_CHF = [50, 100, 150, 200];

const BRAND_LABEL: Record<PaymentMethod["brand"], string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  TWINT: "TWINT",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
};

export default function PaymentScreen() {
  const { isReady } = useRequireAuth();
  const { stationId, pumpId, fuelType } = useLocalSearchParams<{
    stationId: string;
    pumpId: string;
    fuelType: FuelType;
  }>();
  const router = useRouter();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [maxAmountChf, setMaxAmountChf] = useState(150);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    api.paymentMethods.list().then(({ paymentMethods }) => {
      setMethods(paymentMethods);
      setSelectedMethodId(paymentMethods.find((m) => m.isDefault)?.id ?? paymentMethods[0]?.id ?? null);
    });
  }, [isReady]);

  if (!isReady) return null;

  async function onStart() {
    if (!selectedMethodId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { transaction } = await api.transactions.create({
        stationId,
        pumpId,
        fuelType,
        paymentMethodId: selectedMethodId,
        maxAuthorizationAmountRappen: maxAmountChf * 100,
      });
      router.replace(`/(phone)/transaction/${transaction.id}/authorizing`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaktion konnte nicht gestartet werden");
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Zurück</Text>
        </Pressable>
        <Text style={styles.title}>Zahlung vorbereiten</Text>
        <Text style={styles.subtitle}>Zapfsäule wird nach Autorisierung freigeschaltet.</Text>
      </View>

      <Text style={styles.sectionTitle}>Zahlungsmethode</Text>
      <View style={{ gap: spacing.sm }}>
        {methods.map((m) => (
          <Pressable key={m.id} onPress={() => setSelectedMethodId(m.id)}>
            {({ pressed }) => (
              <Card style={[
                styles.methodCard,
                selectedMethodId === m.id && styles.methodCardActive,
                pressed && styles.methodCardPressed,
              ]}>
                <Text style={styles.methodText}>
                  {BRAND_LABEL[m.brand]} ••••{m.last4}
                </Text>
                {selectedMethodId === m.id && <View style={styles.methodCheck} />}
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Maximalbetrag</Text>
      <Text style={styles.hint}>
        Reservierter Betrag für die Autorisierung. Belastet wird nur der tatsächlich getankte Betrag.
      </Text>
      <View style={styles.amountRow}>
        {PRESET_AMOUNTS_CHF.map((amount) => (
          <Pressable
            key={amount}
            style={[styles.amountChip, maxAmountChf === amount && styles.amountChipActive]}
            onPress={() => setMaxAmountChf(amount)}
          >
            <Text style={[styles.amountChipText, maxAmountChf === amount && styles.amountChipTextActive]}>
              CHF {amount}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button onPress={onStart} loading={submitting} disabled={!selectedMethodId}>
        TANKVORGANG STARTEN
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  back: { color: colors.primaryMuted, ...typography.captionStrong, marginBottom: spacing.md },
  title: { color: colors.textPrimary, ...typography.title },
  subtitle: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xs },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong },
  hint: { color: colors.textMuted, ...typography.caption, marginTop: -spacing.sm },
  methodCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  methodCardActive: { borderColor: colors.primary },
  methodCardPressed: { backgroundColor: colors.surfaceHighlight },
  methodText: { color: colors.textPrimary, ...typography.bodyStrong },
  methodCheck: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  amountRow: { flexDirection: "row", gap: spacing.sm },
  amountChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  amountChipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  amountChipText: { color: colors.textSecondary, ...typography.captionStrong },
  amountChipTextActive: { color: colors.primaryMuted },
  error: { color: colors.danger, ...typography.caption },
});
