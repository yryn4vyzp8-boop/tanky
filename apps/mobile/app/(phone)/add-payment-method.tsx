import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { PaymentMethodBrand } from "@tanky/domain";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Button } from "../../components/Button";
import { StripeCardForm } from "../../components/StripeCardForm";
import { api, ApiError } from "../../lib/api-client";
import { colors, radius, spacing, typography } from "../../lib/theme";

const BRANDS: { value: PaymentMethodBrand; label: string }[] = [
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "TWINT", label: "TWINT" },
  { value: "APPLE_PAY", label: "Apple Pay" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
];

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const [stripeKey, setStripeKey] = useState<string | null | undefined>(undefined); // undefined = still checking

  useEffect(() => {
    if (Platform.OS !== "web") {
      setStripeKey(null);
      return;
    }
    api
      .health()
      .then((h) => setStripeKey(h.stripeEnabled ? h.stripePublishableKey : null))
      .catch(() => setStripeKey(null));
  }, []);

  async function saveTokenizedMethod(result: { brand: PaymentMethodBrand; last4: string; providerToken?: string }) {
    await api.paymentMethods.create(result);
    router.back();
  }

  return (
    <ScreenContainer style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Zurück</Text>
        </Pressable>
        <Text style={styles.title}>Zahlungsmethode hinzufügen</Text>
        {stripeKey ? (
          <Text style={styles.subtitle}>
            Stripe Testmodus — echte Tokenisierung, keine echten Zahlungen. Der Server sieht nie die
            vollständige Kartennummer.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            DEMO — keine echten Kartendaten. In Produktion würde dies über die native Karten-Tokenisierung des
            Zahlungsanbieters laufen; der Server sieht nie die vollständige Kartennummer.
          </Text>
        )}
      </View>

      {stripeKey === undefined && <Text style={styles.hint}>Wird geladen…</Text>}

      {stripeKey ? (
        <StripeCardForm publishableKey={stripeKey} onTokenized={saveTokenizedMethod} />
      ) : stripeKey === null ? (
        <MockCardForm onSubmit={saveTokenizedMethod} />
      ) : null}
    </ScreenContainer>
  );
}

function MockCardForm({
  onSubmit,
}: {
  onSubmit: (result: { brand: PaymentMethodBrand; last4: string; providerToken?: string }) => Promise<void>;
}) {
  const [brand, setBrand] = useState<PaymentMethodBrand>("VISA");
  const [last4, setLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!/^\d{4}$/.test(last4)) {
      setError("Bitte die letzten 4 Ziffern der Karte eingeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ brand, last4 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Zahlungsmethode konnte nicht gespeichert werden");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Anbieter</Text>
      <View style={styles.brandGrid}>
        {BRANDS.map((b) => (
          <Pressable key={b.value} style={[styles.brandChip, brand === b.value && styles.brandChipActive]} onPress={() => setBrand(b.value)}>
            <Text style={[styles.brandChipText, brand === b.value && styles.brandChipTextActive]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Letzte 4 Ziffern</Text>
        <TextInput
          style={styles.input}
          value={last4}
          onChangeText={(v) => setLast4(v.replace(/\D/g, "").slice(0, 4))}
          placeholder="1234"
          keyboardType="number-pad"
          maxLength={4}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button onPress={handleSubmit} loading={submitting}>
        Zahlungsmethode speichern
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  back: { color: colors.primaryMuted, ...typography.captionStrong, marginBottom: spacing.md },
  title: { color: colors.textPrimary, ...typography.title },
  subtitle: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xs },
  hint: { color: colors.textMuted, ...typography.caption },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong },
  brandGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  brandChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  brandChipActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  brandChipText: { color: colors.textSecondary, ...typography.captionStrong },
  brandChipTextActive: { color: colors.primaryMuted },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.textSecondary, ...typography.captionStrong },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  error: { color: colors.danger, ...typography.caption },
});
