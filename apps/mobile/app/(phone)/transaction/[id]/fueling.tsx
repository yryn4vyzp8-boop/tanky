import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type FuelingProgress } from "../../../../lib/api-client";
import { formatChf, formatLiters, formatPricePerLiter } from "../../../../lib/format";
import { colors, spacing, typography } from "../../../../lib/theme";

const POLL_INTERVAL_MS = 350;

type Phase = "starting" | "fueling" | "finishing" | "failed";

export default function FuelingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [progress, setProgress] = useState<FuelingProgress | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const started = useRef(false);
  const pollHandle = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const amountScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (!progress?.amountRappen) return;
    Animated.sequence([
      Animated.timing(amountScale, { toValue: 1.04, duration: 80, useNativeDriver: true }),
      Animated.timing(amountScale, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [progress?.amountRappen]);

  useEffect(() => {
    if (started.current || !id) return;
    started.current = true;

    api.transactions
      .startFueling(id)
      .then(({ transaction }) => {
        if (transaction.status === "FUELING_FAILED") {
          setFailureReason(transaction.failureReason);
          setPhase("failed");
          return;
        }
        setPhase("fueling");
        pollHandle.current = setInterval(async () => {
          try {
            const data = await api.transactions.fuelingProgress(id);
            setProgress(data);
            if (data.isComplete) {
              if (pollHandle.current) clearInterval(pollHandle.current);
              setPhase("finishing");
              const { transaction } = await api.transactions.finalize(id);
              if (transaction.status === "COMPLETED") {
                router.replace(`/(phone)/transaction/${id}/completion`);
              } else {
                setFailureReason(transaction.failureReason);
                setPhase("failed");
              }
            }
          } catch (err) {
            if (pollHandle.current) clearInterval(pollHandle.current);
            setFailureReason(err instanceof ApiError ? err.message : "Verbindung verloren");
            setPhase("failed");
          }
        }, POLL_INTERVAL_MS);
      })
      .catch((err) => {
        setFailureReason(err instanceof ApiError ? err.message : "Tankvorgang konnte nicht gestartet werden");
        setPhase("failed");
      });

    return () => {
      if (pollHandle.current) clearInterval(pollHandle.current);
    };
  }, [id, router]);

  if (phase === "failed") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
          <Text style={styles.failureTitle}>Tankvorgang fehlgeschlagen</Text>
          <Text style={styles.failureReason}>{failureReason ?? "Bitte versuche es erneut."}</Text>
          <View style={{ height: spacing.xl }} />
          <Text style={styles.link} onPress={() => router.replace("/(phone)/home")}>
            Zurück zur Übersicht
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "starting") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.starting}>Zapfsäule wird aktiviert…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.pulseWrap}>
          <Animated.View
            style={[
              styles.pulseOuter,
              {
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
              },
            ]}
          />
          <View style={styles.pulseRing} />
        </View>
        <Text style={styles.amountLabel}>{phase === "finishing" ? "Wird abgeschlossen…" : "Tankvorgang läuft"}</Text>
        <Animated.Text style={[styles.amount, { transform: [{ scale: amountScale }] }]}>
          {formatChf(progress?.amountRappen ?? 0)}
        </Animated.Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatLiters(progress?.liters ?? 0)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.meta}>{formatPricePerLiter(progress?.pricePerLiterMilliFrancs ?? 0)}</Text>
        </View>
        {phase === "finishing" && <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />}
        {phase === "fueling" && <Text style={styles.hint}>Zapfpistole zurückhängen, sobald du fertig bist.</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.sm },
  starting: { color: colors.textPrimary, ...typography.headline, marginTop: spacing.lg },
  pulseWrap: {
    width: 48, height: 48,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  pulseOuter: {
    position: "absolute",
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success,
  },
  pulseRing: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.success,
  },
  amountLabel: { color: colors.textSecondary, ...typography.captionStrong, textTransform: "uppercase" },
  amount: { color: colors.textPrimary, fontSize: 56, fontWeight: "800", letterSpacing: -1.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  meta: { color: colors.textSecondary, ...typography.bodyStrong },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  hint: { color: colors.textMuted, ...typography.caption, marginTop: spacing.xxl, textAlign: "center" },
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
  link: { color: colors.primaryMuted, ...typography.captionStrong },
});
