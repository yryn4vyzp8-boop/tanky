import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../../components/Button";
import { api, ApiError } from "../../../../lib/api-client";
import { colors, radius, spacing, typography } from "../../../../lib/theme";
import { STRONG_EASE_OUT } from "../../../../lib/motion";

function SonarRing({ delay }: { delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1900,
          easing: STRONG_EASE_OUT,
          useNativeDriver: true,
        })
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Animated.View
      style={[
        styles.sonarRing,
        {
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 2.6] }) }],
          opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
        },
      ]}
    />
  );
}

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
        <View style={styles.sonarWrap}>
          <SonarRing delay={0} />
          <SonarRing delay={640} />
          <SonarRing delay={1280} />
          <View style={styles.sonarDot} />
        </View>
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
  sonarWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  sonarRing: {
    position: "absolute",
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  sonarDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.primary,
  },
  status: { color: colors.textPrimary, ...typography.headline, textAlign: "center" },
  hint: { color: colors.textMuted, ...typography.caption, textAlign: "center" },
  errorIcon: {
    width: 56, height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.dangerTint,
    alignItems: "center", justifyContent: "center",
  },
  errorIconText: { color: colors.danger, fontSize: 24, fontWeight: "700" },
  failureTitle: { color: colors.textPrimary, ...typography.title, textAlign: "center" },
  failureReason: { color: colors.textMuted, ...typography.body, textAlign: "center" },
});
