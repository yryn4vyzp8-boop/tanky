import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../../components/Button";
import { api, ApiError } from "../../../../lib/api-client";
import { colors, spacing, typography } from "../../../../lib/theme";

const FAILURE_STATUSES = new Set(["PAYMENT_FAILED", "PUMP_AUTHORIZATION_FAILED"]);

export default function AuthorizingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<"payment" | "pump">("payment");
  const [failure, setFailure] = useState<{ status: string; reason: string | null } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !id) return;
    started.current = true;

    const stepTimer = setTimeout(() => setStep("pump"), 900);

    api.transactions
      .authorize(id)
      .then(({ transaction }) => {
        clearTimeout(stepTimer);
        if (transaction.status === "PUMP_AUTHORIZED") {
          router.replace(`/(phone)/transaction/${id}/fueling`);
        } else if (FAILURE_STATUSES.has(transaction.status)) {
          setFailure({ status: transaction.status, reason: transaction.failureReason });
        }
      })
      .catch((err) => {
        clearTimeout(stepTimer);
        setFailure({ status: "ERROR", reason: err instanceof ApiError ? err.message : "Unbekannter Fehler" });
      });

    return () => clearTimeout(stepTimer);
  }, [id, router]);

  if (failure) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
          <Text style={styles.failureTitle}>
            {failure.status === "PAYMENT_FAILED" ? "Zahlung fehlgeschlagen" : "Zapfsäule nicht verfügbar"}
          </Text>
          <Text style={styles.failureReason}>{failure.reason ?? "Bitte versuche es erneut."}</Text>
          <View style={{ height: spacing.xl }} />
          <Button onPress={() => router.replace("/(phone)/home")}>Zurück zur Übersicht</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.status}>
          {step === "payment" ? "Zahlung wird autorisiert…" : "Zapfsäule wird freigeschaltet…"}
        </Text>
        <Text style={styles.hint}>Bitte warten — das dauert nur einen Moment.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  status: { color: colors.textPrimary, ...typography.headline, marginTop: spacing.lg },
  hint: { color: colors.textMuted, ...typography.caption },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerTint,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIconText: { color: colors.danger, fontSize: 24, fontWeight: "700" },
  failureTitle: { color: colors.textPrimary, ...typography.title, textAlign: "center" },
  failureReason: { color: colors.textMuted, ...typography.body, textAlign: "center" },
});
