import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { StatusPill } from "../../components/StatusPill";
import { BottomNav } from "../../components/BottomNav";
import { ErrorState } from "../../components/ErrorState";
import { useRequireAuth } from "../../lib/use-require-auth";
import { api, ApiError, type TransactionRecord } from "../../lib/api-client";
import { formatChf, formatDateTime, formatLiters, fuelTypeLabel } from "../../lib/format";
import { colors, radius, spacing, typography } from "../../lib/theme";

export default function HistoryScreen() {
  const { isReady } = useRequireAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.transactions
      .list()
      .then(({ transactions }) => setTransactions(transactions))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Historie konnte nicht geladen werden."));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isReady) load();
    }, [isReady, load]),
  );

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Tankhistorie</Text>
      </View>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>○</Text>
            </View>
            <Text style={styles.emptyTitle}>Noch keine Tankvorgänge</Text>
            <Text style={styles.emptyBody}>Deine Tankhistorie erscheint hier, sobald du das erste Mal getankt hast.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => item.status === "COMPLETED" && router.push(`/(phone)/transaction/${item.id}/receipt`)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.stationName}>{item.stationName}</Text>
                <Text style={styles.meta}>
                  {formatDateTime(item.createdAt)} · {fuelTypeLabel(item.fuelType)}
                </Text>
                {item.liters !== null && <Text style={styles.meta}>{formatLiters(item.liters)}</Text>}
                <View style={{ marginTop: 4 }}>
                  <StatusPill status={item.status} />
                </View>
              </View>
              {item.capturedAmountRappen !== null && (
                <Text style={styles.amount}>{formatChf(item.capturedAmountRappen)}</Text>
              )}
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: 0 },
  title: { color: colors.textPrimary, ...typography.title },
  list: { padding: spacing.lg, paddingTop: spacing.md, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxxl, gap: spacing.md },
  emptyIcon: {
    width: 60, height: 60, borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  emptyIconText: { color: colors.textMuted, fontSize: 24, lineHeight: 28 },
  emptyTitle: { color: colors.textSecondary, ...typography.bodyStrong, textAlign: "center" },
  emptyBody: { color: colors.textMuted, ...typography.caption, textAlign: "center", maxWidth: 260, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  stationName: { color: colors.textPrimary, ...typography.bodyStrong },
  meta: { color: colors.textMuted, ...typography.caption },
  amount: { color: colors.textPrimary, ...typography.amount },
});
