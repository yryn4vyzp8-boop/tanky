import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ApiError } from "../lib/api-client";
import { colors, radius, spacing, typography } from "../lib/theme";

type Scenario =
  | "NONE"
  | "PAYMENT_AUTHORIZATION_FAILURE"
  | "PAYMENT_CAPTURE_FAILURE"
  | "PUMP_FAILURE"
  | "NETWORK_ERROR"
  | "FORCE_COMPLETE_FUELING";

const SCENARIOS: { value: Scenario; label: string; description: string; tone: "danger" | "warning" | "primary" }[] = [
  {
    value: "PAYMENT_AUTHORIZATION_FAILURE",
    label: "PAYMENT FAILURE",
    description: "Nächste Zahlungsautorisierung wird vom Provider abgelehnt.",
    tone: "danger",
  },
  {
    value: "PAYMENT_CAPTURE_FAILURE",
    label: "CAPTURE FAILURE",
    description: "Belastung nach dem Tanken schlägt fehl (Kraftstoff bereits abgegeben).",
    tone: "danger",
  },
  {
    value: "PUMP_FAILURE",
    label: "PUMP FAILURE",
    description: "Zapfsäule meldet einen Fehler bei der Freischaltung.",
    tone: "danger",
  },
  {
    value: "NETWORK_ERROR",
    label: "NETWORK ERROR",
    description: "Simuliert einen nicht erreichbaren Provider (Payment oder Station).",
    tone: "warning",
  },
  {
    value: "FORCE_COMPLETE_FUELING",
    label: "COMPLETE TRANSACTION",
    description: "Springt sofort ans Ende des laufenden Tankvorgangs.",
    tone: "primary",
  },
];

export default function DemoControlScreen() {
  const router = useRouter();
  const [armed, setArmed] = useState<Scenario>("NONE");
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.demo
      .status()
      .then((s) => {
        setDemoMode(s.demoMode);
        setArmed(s.armedScenario as Scenario);
      })
      .catch((err: ApiError) => setMessage(err.message));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function arm(scenario: Scenario) {
    const res = await api.demo.armScenario(scenario);
    setArmed(res.armedScenario as Scenario);
    setMessage(scenario === "NONE" ? "Zurückgesetzt." : `Scharf: ${scenario}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TANKY</Text>
            <Text style={styles.title}>Demo Control</Text>
          </View>
          <View style={[styles.envBadge, { backgroundColor: demoMode ? colors.warningTint : colors.dangerTint }]}>
            <Text style={[styles.envBadgeText, { color: demoMode ? colors.warning : colors.danger }]}>
              {demoMode === null ? "…" : demoMode ? "DEMO MODE" : "PRODUCTION"}
            </Text>
          </View>
        </View>

        <Text style={styles.explainer}>
          Ein hier scharf geschalteter Fall wirkt einmalig auf den nächsten passenden Schritt der aktuell
          laufenden Transaktion in der App — starte einen Tankvorgang im Telefon-Frame, schalte dann hier ein
          Szenario scharf, bevor du den nächsten Schritt auslöst.
        </Text>

        <View style={styles.currentRow}>
          <Text style={styles.currentLabel}>Aktuell scharf:</Text>
          <View style={[styles.pill, armed !== "NONE" ? styles.pillActive : styles.pillIdle]}>
            <Text style={[styles.pillText, armed !== "NONE" && styles.pillTextActive]}>{armed}</Text>
          </View>
          {armed !== "NONE" && (
            <Pressable onPress={() => arm("NONE")}>
              <Text style={styles.resetLink}>Zurücksetzen</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.grid}>
          {SCENARIOS.map((s) => (
            <Pressable key={s.value} onPress={() => arm(s.value)} style={styles.card}>
              <Text style={[styles.cardLabel, s.tone === "danger" && styles.tonedanger, s.tone === "warning" && styles.tonewarning]}>
                {s.label}
              </Text>
              <Text style={styles.cardDescription}>{s.description}</Text>
            </Pressable>
          ))}
        </View>

        {message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.footerNav}>
          <Pressable onPress={() => router.push("/(phone)/home")}>
            <Text style={styles.footerLink}>Zum Tankvorgang öffnen →</Text>
          </Pressable>
          <Link href="/" style={styles.footerLink}>
            ← Zur Startseite
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xxl, maxWidth: 720, width: "100%", alignSelf: "center", gap: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { color: colors.textMuted, ...typography.micro },
  title: { color: colors.textPrimary, ...typography.display },
  envBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  envBadgeText: { ...typography.micro },
  explainer: { color: colors.textSecondary, ...typography.body },
  currentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  currentLabel: { color: colors.textMuted, ...typography.captionStrong },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.dangerTint },
  pillText: { color: colors.textMuted, ...typography.captionStrong },
  pillTextActive: { color: colors.danger },
  resetLink: { color: colors.primaryMuted, ...typography.captionStrong },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "48%",
    minWidth: 260,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: { color: colors.primaryMuted, ...typography.headline },
  tonedanger: { color: colors.danger },
  tonewarning: { color: colors.warning },
  cardDescription: { color: colors.textMuted, ...typography.caption },
  message: { color: colors.textSecondary, ...typography.caption },
  footerNav: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl },
  footerLink: { color: colors.primaryMuted, ...typography.captionStrong },
});
