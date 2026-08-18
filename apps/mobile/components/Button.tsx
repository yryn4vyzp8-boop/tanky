import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { PropsWithChildren } from "react";
import { colors, radius, spacing, typography } from "../lib/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<Variant, { bg: string; border?: string; text: string }> = {
  primary: { bg: colors.primary, text: "#FFFFFF" },
  secondary: { bg: colors.surfaceElevated, border: colors.borderStrong, text: colors.textPrimary },
  danger: { bg: colors.danger, text: "#FFFFFF" },
  ghost: { bg: "transparent", text: colors.primaryMuted },
};

export function Button({
  onPress,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
  children,
}: PropsWithChildren<ButtonProps>) {
  const style = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: style.bg,
          borderWidth: style.border ? 1 : 0,
          borderColor: style.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={style.text} />
      ) : typeof children === "string" ? (
        <Text style={[styles.text, { color: style.text }]}>{children}</Text>
      ) : (
        <View style={styles.contentRow}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  fullWidth: { width: "100%" },
  text: { ...typography.headline },
  contentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
