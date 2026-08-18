import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Receipt } from "@tanky/domain";
import { Button } from "../../../../components/Button";
import { api } from "../../../../lib/api-client";
import { formatChf, formatLiters, fuelTypeLabel } from "../../../../lib/format";
import { colors, spacing, typography } from "../../../../lib/theme";

export default function CompletionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (id) api.transactions.receipt(id).then(({ receipt }) => setReceipt(receipt));
  }, [id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.title}>TANKEN ABGESCHLOSSEN</Text>

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
      </View>

      <View style={styles.actions}>
        <Button variant="secondary" onPress={() => router.push(`/(phone)/transaction/${id}/receipt`)}>
          Beleg anzeigen
        </Button>
        <Button onPress={() => router.replace("/(phone)/home")}>Fertig</Button>
      </View>
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
  paidRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  paidMethod: { color: colors.textPrimary, ...typography.bodyStrong },
  paidDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success },
  paidStatus: { color: colors.success, ...typography.bodyStrong },
  actions: { gap: spacing.md },
});
