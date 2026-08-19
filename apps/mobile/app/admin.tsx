import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { StatusPill } from "../components/StatusPill";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../lib/auth-context";
import { api, ApiError, type TransactionRecord } from "../lib/api-client";
import { formatChf, formatDateTime, formatLiters } from "../lib/format";
import { colors, radius, spacing, typography } from "../lib/theme";

type Summary = Awaited<ReturnType<typeof api.admin.summary>>;

export default function AdminScreen() {
  const { user, isAdmin, isLoading, login, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadData = () => {
    setDataError(null);
    const onError = (err: unknown) =>
      setDataError(err instanceof ApiError ? err.message : "Daten konnten nicht geladen werden.");
    api.admin.summary().then(setSummary).catch(onError);
    api.admin.transactions().then(({ transactions }) => setTransactions(transactions)).catch(onError);
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  if (isLoading) return null;

  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.gate}>
          <Text style={styles.gateTitle}>Admin-Zugriff erforderlich</Text>
          <Text style={styles.gateSubtitle}>
            {!user
              ? "Melde dich mit dem Demo-Admin-Konto an."
              : `Angemeldet als ${user.email} — dieses Konto hat keine Admin-Rechte.`}
          </Text>
          <Button
            loading={loggingIn}
            onPress={async () => {
              setLoggingIn(true);
              setLoginError(null);
              try {
                if (user) await logout();
                await login("admin@tanky.ch", "tanky-demo-2026");
              } catch {
                setLoginError("Anmeldung fehlgeschlagen");
              } finally {
                setLoggingIn(false);
              }
            }}
          >
            {user ? "Zu Admin-Konto wechseln" : "Als Admin anmelden"}
          </Button>
          {loginError && <Text style={styles.error}>{loginError}</Text>}
          <Link href="/" style={styles.backLink}>
            ← Zur Startseite
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TANKY</Text>
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>

        {dataError && <ErrorState message={dataError} onRetry={loadData} />}

        {summary && (
          <View style={styles.statsGrid}>
            <Stat label="Umsatz" value={formatChf(summary.totalRevenueRappen)} />
            <Stat label="Liter total" value={formatLiters(summary.totalLiters)} />
            <Stat label="Transaktionen" value={String(summary.transactionCount)} />
            <Stat label="Aktiv" value={String(summary.activeTransactionCount)} />
            <Stat label="Abgeschlossen" value={String(summary.completedTransactionCount)} />
            <Stat
              label="Fehlerrate"
              value={`${(summary.failureRate * 100).toFixed(1)}%`}
              tone={summary.failureRate > 0.2 ? "danger" : undefined}
            />
            <Stat label="Ø Betrag" value={formatChf(summary.averageTransactionAmountRappen)} />
            <Stat label="Nutzer" value={String(summary.userCount)} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Letzte Transaktionen</Text>
        <View style={styles.tableWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: 170 }]}>Zeit</Text>
                <Text style={[styles.th, { width: 180 }]}>Station / Pumpe</Text>
                <Text style={[styles.th, { width: 100 }]}>Betrag</Text>
                <Text style={[styles.th, { width: 220 }]}>Status</Text>
              </View>
              {transactions.slice(0, 30).map((t) => (
                <View key={t.id} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 170 }]}>{formatDateTime(t.createdAt)}</Text>
                  <Text style={[styles.td, { width: 180 }]}>
                    {t.stationName} · {t.pumpLabel}
                  </Text>
                  <Text style={[styles.td, { width: 100 }]}>
                    {t.capturedAmountRappen !== null ? formatChf(t.capturedAmountRappen) : "—"}
                  </Text>
                  <View style={{ width: 220 }}>
                    <StatusPill status={t.status} />
                  </View>
                </View>
              ))}
              {transactions.length === 0 && <Text style={styles.empty}>Noch keine Transaktionen.</Text>}
            </View>
          </ScrollView>
        </View>

        <Link href="/" style={styles.backLink}>
          ← Zur Startseite
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "danger" && { color: colors.danger }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xxl, maxWidth: 960, width: "100%", alignSelf: "center", gap: spacing.lg },
  header: { marginBottom: spacing.sm },
  eyebrow: { color: colors.textMuted, ...typography.micro },
  title: { color: colors.textPrimary, ...typography.display },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statLabel: { color: colors.textMuted, ...typography.caption },
  statValue: { color: colors.textPrimary, ...typography.title, marginTop: spacing.xs },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong, marginTop: spacing.lg },
  tableWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  tableHeaderRow: { flexDirection: "row", paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableRow: { flexDirection: "row", paddingVertical: spacing.sm, alignItems: "center" },
  th: { color: colors.textMuted, ...typography.micro },
  td: { color: colors.textSecondary, ...typography.caption },
  empty: { color: colors.textMuted, ...typography.caption, padding: spacing.md },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  gateTitle: { color: colors.textPrimary, ...typography.title },
  gateSubtitle: { color: colors.textMuted, ...typography.body, textAlign: "center" },
  error: { color: colors.danger, ...typography.caption },
  backLink: { color: colors.primaryMuted, ...typography.captionStrong, marginTop: spacing.lg },
});
