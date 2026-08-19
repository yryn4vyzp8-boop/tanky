import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { STRONG_EASE_OUT, SPRING_CELEBRATION } from "../../../../lib/motion";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Receipt } from "@tanky/domain";
import { Button } from "../../../../components/Button";
import { api, ApiError } from "../../../../lib/api-client";
import { formatChf, formatLiters, fuelTypeLabel } from "../../../../lib/format";
import { colors, spacing, typography } from "../../../../lib/theme";

export default function CompletionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const actionsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, ...SPRING_CELEBRATION }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 380, easing: STRONG_EASE_OUT, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 380, easing: STRONG_EASE_OUT, useNativeDriver: true }),
      ]),
      Animated.timing(actionsOpacity, { toValue: 1, duration: 260, easing: STRONG_EASE_OUT, useNativeDriver: true }),
    ]).start();
  }, []);

  const load = () => {
    if (!id) return;
    setError(null);
    api.transactions
      .receipt(id)
      .then(({ receipt }) => setReceipt(receipt))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Details konnten nicht geladen werden."));
  };

  useEffect(load, [id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>

        <Animated.View
          style={{ alignItems: "center", gap: spacing.sm, opacity: contentOpacity, transform: [{ translateY: contentY }] }}
        >
          <Text style={styles.title}>TANKEN ABGESCHLOSSEN</Text>

          {error && !receipt && (
            <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={styles.subline}>Details konnten nicht geladen werden — die Zahlung ist trotzdem erfolgt.</Text>
              <Text style={styles.retryLink} onPress={load}>
                Erneut versuchen
              </Text>
            </View>
          )}

          {receipt && (
            <>
              <Text style={styles.amount}>{formatChf(receipt.totalAmountRappen)}</Text>
              <Text style={styles.subline}>
                {formatLiters(receipt.liters)} · {fuelTypeLabel(receipt.fuelType)}
              </Text>
              <View style={styles.paidRow}>
                <Text style={styles.paidMethod}>{receipt.paymentMethodLabel}</Text>
                <View style={styles.paidDot} />
                <Text style={styles.paidStatus}>Bezahlt</Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, { opacity: actionsOpacity }]}>
        <Button variant="secondary" onPress={() => router.push(`/(phone)/transaction/${id}/receipt`)}>
          Beleg anzeigen
        </Button>
        <Button onPress={() => router.replace("/(phone)/home")}>Fertig</Button>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between", padding: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  checkMark: { color: colors.success, fontSize: 32, fontWeight: "800" },
  title: { color: colors.textSecondary, ...typography.captionStrong, letterSpacing: 1 },
  amount: { color: colors.textPrimary, fontSize: 48, fontWeight: "800", marginTop: spacing.md },
  subline: { color: colors.textSecondary, ...typography.body, marginTop: spacing.xs },
  retryLink: { color: colors.primaryMuted, ...typography.captionStrong },
  paidRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  paidMethod: { color: colors.textPrimary, ...typography.bodyStrong },
  paidDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success },
  paidStatus: { color: colors.success, ...typography.bodyStrong },
  actions: { gap: spacing.md },
});
