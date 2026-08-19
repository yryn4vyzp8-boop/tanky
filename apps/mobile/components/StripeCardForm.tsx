import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Stripe, StripeCardElement, StripeElements } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "./Button";
import { colors, radius, spacing, typography } from "../lib/theme";
import type { PaymentMethodBrand } from "@tanky/domain";

const STRIPE_BRAND_TO_TANKY: Record<string, PaymentMethodBrand> = {
  visa: "VISA",
  mastercard: "MASTERCARD",
};

interface StripeCardFormProps {
  publishableKey: string;
  onTokenized: (result: { brand: PaymentMethodBrand; last4: string; providerToken: string }) => Promise<void>;
}

/**
 * Real Stripe Elements card entry — web only (React Native has no DOM for
 * Stripe.js to mount into; a native build would use @stripe/stripe-react-native
 * instead). Never touches the raw card number: Stripe's iframe collects it
 * and hands back only a tokenized PaymentMethod id.
 */
export function StripeCardForm({ publishableKey, onTokenized }: StripeCardFormProps) {
  const mountRef = useRef<View>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadStripe(publishableKey).then((stripe) => {
      if (cancelled || !stripe) return;
      stripeRef.current = stripe;
      const elements = stripe.elements();
      elementsRef.current = elements;
      const card = elements.create("card", {
        style: {
          base: {
            color: colors.textPrimary,
            fontSize: "16px",
            "::placeholder": { color: colors.textMuted },
          },
          invalid: { color: colors.danger },
        },
      });
      cardRef.current = card;
      // react-native-web forwards a View's ref to its underlying DOM node.
      const domNode = mountRef.current as unknown as HTMLElement | null;
      if (domNode) {
        card.mount(domNode);
        card.on("ready", () => setReady(true));
        card.on("change", (event) => setError(event.error?.message ?? null));
      }
    });

    return () => {
      cancelled = true;
      cardRef.current?.unmount();
    };
  }, [publishableKey]);

  async function onSubmit() {
    const stripe = stripeRef.current;
    const card = cardRef.current;
    if (!stripe || !card) return;

    setSubmitting(true);
    setError(null);
    const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });

    if (stripeError || !paymentMethod?.card) {
      setError(stripeError?.message ?? "Karte konnte nicht gespeichert werden.");
      setSubmitting(false);
      return;
    }

    try {
      await onTokenized({
        brand: STRIPE_BRAND_TO_TANKY[paymentMethod.card.brand] ?? "VISA",
        last4: paymentMethod.card.last4,
        providerToken: paymentMethod.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zahlungsmethode konnte nicht gespeichert werden.");
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Kartendaten</Text>
        <View ref={mountRef} style={styles.cardMount} />
        {!ready && <Text style={styles.hint}>Stripe lädt…</Text>}
      </View>
      <Text style={styles.hint}>
        Testkarte: 4242 4242 4242 4242 · beliebiges zukünftiges Datum · beliebiger CVC
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button onPress={onSubmit} loading={submitting} disabled={!ready}>
        Zahlungsmethode speichern
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { color: colors.textSecondary, ...typography.captionStrong },
  cardMount: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  hint: { color: colors.textMuted, ...typography.caption },
  error: { color: colors.danger, ...typography.caption },
});
