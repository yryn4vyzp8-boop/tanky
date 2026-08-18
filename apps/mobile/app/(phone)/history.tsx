import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { StatusPill } from "../../components/StatusPill";
import { BottomNav } from "../../components/BottomNav";
import { useRequireAuth } from "../../lib/use-require-auth";
import { api, type TransactionRecord } from "../../lib/api-client";
import { formatChf, formatDateTime, formatLiters, fuelTypeLabel } from "../../lib/format";
import { colors, spacing, typography } from "../../lib/theme";

export default function HistoryScreen() {
  const { isReady } = useRequireAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  const load = useCallback(() => {
    api.transactions.list().then(({ transactions }) => setTransactions(transactions));
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

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Noch keine Tankvorgänge.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => item.status === "COMPLETED" && router.push(`/(phone)/transaction/${item.id}/receipt`)}
          >
            <Card style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stationName}>{item.stationName}</Text>
                <Text style={styles.meta}>
                  {formatDateTime(item.createdAt)} · Zapfsäule {item.pumpLabel} · {fuelTypeLabel(item.fuelType)}
                </Text>
                {item.liters !== null && <Text style={styles.meta}>{formatLiters(item.liters)}</Text>}
                <StatusPill status={item.status} />
              </View>
              {item.capturedAmountRappen !== null && (
                <Text style={styles.amount}>{formatChf(item.capturedAmountRappen)}</Text>
              )}
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: 0 },
  title: { color: colors.textPrimary, ...typography.title },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { color: colors.textMuted, ...typography.body, textAlign: "center", marginTop: spacing.xxl },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  stationName: { color: colors.textPrimary, ...typography.bodyStrong },
  meta: { color: colors.textMuted, ...typography.caption },
  amount: { color: colors.textPrimary, ...typography.headline },
});
