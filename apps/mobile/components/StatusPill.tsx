import { StyleSheet, Text, View } from "react-native";
import type { TransactionStatus } from "@tanky/domain";
import { colors, radius, spacing, typography } from "../lib/theme";

const FAILURE_STATUSES = new Set<TransactionStatus>([
  "PAYMENT_FAILED",
  "PUMP_AUTHORIZATION_FAILED",
  "FUELING_FAILED",
  "PAYMENT_CAPTURE_FAILED",
  "TRANSACTION_CANCELLED",
  "TIMEOUT",
]);

const LABELS: Record<TransactionStatus, string> = {
  CREATED: "Erstellt",
  PAYMENT_AUTHORIZING: "Zahlung wird autorisiert",
  PAYMENT_AUTHORIZED: "Zahlung autorisiert",
  PUMP_AUTHORIZING: "Zapfsäule wird freigeschaltet",
  PUMP_AUTHORIZED: "Zapfsäule bereit",
  FUELING: "Tankvorgang läuft",
  FUELING_COMPLETED: "Tanken abgeschlossen",
  FINAL_AMOUNT_RECEIVED: "Betrag ermittelt",
  PAYMENT_CAPTURING: "Zahlung wird verarbeitet",
  PAYMENT_CAPTURED: "Zahlung erfolgt",
  COMPLETED: "Abgeschlossen",
  PAYMENT_FAILED: "Zahlung fehlgeschlagen",
  PUMP_AUTHORIZATION_FAILED: "Zapfsäule nicht verfügbar",
  FUELING_FAILED: "Tankvorgang fehlgeschlagen",
  PAYMENT_CAPTURE_FAILED: "Belastung fehlgeschlagen",
  TRANSACTION_CANCELLED: "Abgebrochen",
  TIMEOUT: "Zeitüberschreitung",
};

export function StatusPill({ status }: { status: TransactionStatus }) {
  const isFailure = FAILURE_STATUSES.has(status);
  const isSuccess = status === "COMPLETED";
  const bg = isFailure ? colors.dangerTint : isSuccess ? colors.successTint : colors.primaryTint;
  const fg = isFailure ? colors.danger : isSuccess ? colors.success : colors.primaryMuted;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  text: { ...typography.captionStrong },
});
