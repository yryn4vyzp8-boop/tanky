import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors, spacing, typography } from "../lib/theme";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <Button variant="secondary" fullWidth={false} onPress={onRetry}>
        Erneut versuchen
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  message: { color: colors.textSecondary, ...typography.body, textAlign: "center" },
});
