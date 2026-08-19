import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors, radius, spacing, typography } from "../lib/theme";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.title}>Laden fehlgeschlagen</Text>
      <Text style={styles.message}>{message}</Text>
      <Button variant="secondary" fullWidth={false} onPress={onRetry}>
        Erneut versuchen
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.md, padding: spacing.xxxl },
  iconWrap: {
    width: 56, height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.dangerTint,
    borderWidth: 1,
    borderColor: colors.danger + "30",
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.sm,
  },
  iconText: { color: colors.danger, fontSize: 26, fontWeight: "700" as const, lineHeight: 30 },
  title: { color: colors.textPrimary, ...typography.headline },
  message: { color: colors.textMuted, ...typography.body, textAlign: "center", maxWidth: 260 },
});
