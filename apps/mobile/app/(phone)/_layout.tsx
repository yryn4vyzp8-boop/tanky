import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { PhoneFrame } from "../../components/PhoneFrame";
import { useAuth } from "../../lib/auth-context";
import { colors, spacing, typography } from "../../lib/theme";

export default function PhoneLayout() {
  const { isLoading } = useAuth();

  return (
    <PhoneFrame>
      {isLoading ? (
        <View style={styles.splash}>
          <Text style={styles.wordmark}>TANKY</Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      )}
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  wordmark: { color: colors.textPrimary, fontSize: 32, fontWeight: "800", letterSpacing: -1 },
});
