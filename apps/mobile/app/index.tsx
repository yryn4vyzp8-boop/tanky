import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../lib/theme";
import { API_BASE_URL, api } from "../lib/api-client";

type ApiStatus = "checking" | "online" | "offline";

export default function Launcher() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [demoMode, setDemoMode] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    api
      .health()
      .then((body) => {
        setApiStatus("online");
        setDemoMode(body.demoMode);
        setStripeEnabled(body.stripeEnabled);
      })
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.envRow}>
          <View style={[styles.dot, { backgroundColor: apiStatus === "online" ? colors.success : apiStatus === "offline" ? colors.danger : colors.warning }]} />
          <Text style={styles.envText}>
            {apiStatus === "checking" ? "Verbinde mit TANKY API…" : apiStatus === "online" ? "API verbunden" : "API nicht erreichbar — läuft der Server?"}
          </Text>
        </View>

        <Text style={styles.wordmark}>TANKY</Text>
        <Text style={styles.tagline}>Tanken. Bezahlen. Weiterfahren.</Text>
        <Text style={styles.subtitle}>The Payment &amp; Fueling Layer for Mobility — Mobile Fueling Platform</Text>

        <View style={styles.actions}>
          <Link href="/(phone)/home" asChild>
            <Text style={styles.primaryAction}>OPEN APP →</Text>
          </Link>
          <Link href="/demo-control" asChild>
            <Text style={styles.secondaryAction}>DEMO CONTROL</Text>
          </Link>
          <Link href="/admin" asChild>
            <Text style={styles.secondaryAction}>ADMIN</Text>
          </Link>
        </View>

        <View style={styles.footer}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{demoMode ? "DEMO MODE" : "PRODUCTION"}</Text>
            </View>
            {stripeEnabled && (
              <View style={[styles.badge, styles.stripeBadge]}>
                <Text style={[styles.badgeText, styles.stripeBadgeText]}>STRIPE TEST MODE</Text>
              </View>
            )}
          </View>
          <Text style={styles.footerText}>
            Environment: {envLabel()} · {API_BASE_URL}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function envLabel(): string {
  if (Platform.OS !== "web") return "NATIVE";
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" ? "LOCAL" : "DEPLOYED";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  glowA: {
    position: "absolute",
    top: -200,
    left: -160,
    width: 560,
    height: 560,
    borderRadius: 999,
    backgroundColor: colors.primary,
    opacity: 0.18,
  },
  glowB: {
    position: "absolute",
    bottom: -220,
    right: -180,
    width: 560,
    height: 560,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
    opacity: 0.12,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  envRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },
  envText: { color: colors.textSecondary, ...typography.caption },
  wordmark: { color: colors.textPrimary, fontSize: 64, fontWeight: "800", letterSpacing: -2 },
  tagline: { color: colors.textPrimary, ...typography.title, marginTop: spacing.sm },
  subtitle: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: "center",
    maxWidth: 420,
    marginTop: spacing.xs,
  },
  actions: { marginTop: spacing.xxl, gap: spacing.md, width: 280 },
  primaryAction: {
    backgroundColor: colors.primary,
    color: "#fff",
    textAlign: "center",
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    ...typography.headline,
    overflow: "hidden",
  },
  secondaryAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...typography.captionStrong,
    overflow: "hidden",
  },
  footer: { marginTop: spacing.xxxl, alignItems: "center", gap: spacing.sm },
  badgeRow: { flexDirection: "row", gap: spacing.sm },
  badge: {
    backgroundColor: colors.warningTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stripeBadge: { backgroundColor: colors.primaryTint },
  stripeBadgeText: { color: colors.primaryMuted },
  badgeText: { color: colors.warning, ...typography.micro },
  footerText: { color: colors.textMuted, ...typography.caption },
});
