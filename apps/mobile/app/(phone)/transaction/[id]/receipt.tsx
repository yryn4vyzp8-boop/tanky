import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Receipt } from "@tanky/domain";
import { ScreenContainer } from "../../../../components/ScreenContainer";
import { api } from "../../../../lib/api-client";
import { formatChf, formatDateTime, formatLiters, formatPricePerLiter, fuelTypeLabel } from "../../../../lib/format";
import { colors, radius, spacing, typography } from "../../../../lib/theme";

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (id) api.transactions.receipt(id).then(({ receipt }) => setReceipt(receipt));
  }, [id]);

  if (!receipt) return null;

  return (
    <ScreenContainer style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.back}>← Zurück</Text>
      </Pressable>

      <View style={styles.receipt}>
        <Text style={styles.brand}>TANKY</Text>
        <View style={styles.divider} />

        <Text style={styles.stationName}>{receipt.stationName}</Text>
        <Text style={styles.stationAddress}>{receipt.stationAddress}</Text>
        <Text style={styles.timestamp}>{formatDateTime(receipt.issuedAt)}</Text>

        <View style={styles.divider} />

        <Row label="Zapfsäule" value={receipt.pumpLabel} />
        <Row label="Kraftstoff" value={fuelTypeLabel(receipt.fuelType)} />
        <Row label="Menge" value={formatLiters(receipt.liters)} />
        <Row label="Preis/Liter" value={formatPricePerLiter(receipt.pricePerLiterMilliFrancs)} />

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatChf(receipt.totalAmountRappen)}</Text>
        </View>

        <View style={styles.divider} />

        <Row label="Zahlungsmethode" value={receipt.paymentMethodLabel} />
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>BEZAHLT</Text>
        </View>

        <Text style={styles.txId}>{receipt.transactionId}</Text>
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  back: { color: colors.primaryMuted, ...typography.captionStrong },
  receipt: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  brand: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, borderStyle: "dashed", marginVertical: spacing.sm },
  stationName: { color: colors.textPrimary, ...typography.bodyStrong, textAlign: "center" },
  stationAddress: { color: colors.textMuted, ...typography.caption, textAlign: "center" },
  timestamp: { color: colors.textMuted, ...typography.caption, textAlign: "center", marginTop: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowLabel: { color: colors.textMuted, ...typography.caption },
  rowValue: { color: colors.textPrimary, ...typography.captionStrong },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: colors.textSecondary, ...typography.headline },
  totalValue: { color: colors.textPrimary, fontSize: 26, fontWeight: "800" },
  paidBadge: {
    alignSelf: "center",
    marginTop: spacing.md,
    backgroundColor: colors.successTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  paidBadgeText: { color: colors.success, ...typography.micro },
  txId: { color: colors.textMuted, ...typography.micro, textAlign: "center", marginTop: spacing.lg },
});
