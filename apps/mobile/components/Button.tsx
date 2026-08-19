import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRef } from "react";
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

const VARIANT_STYLES: Record<Variant, { bg: string; border?: string; text: string; glow?: boolean }> = {
  primary: { bg: colors.primary, text: "#FFFFFF", glow: true },
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
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }]}>
      {style.glow && (
        <View style={styles.glow} pointerEvents="none" />
      )}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: style.bg,
            borderWidth: style.border ? StyleSheet.hairlineWidth : 0,
            borderColor: style.border,
            opacity: isDisabled ? 0.4 : pressed ? 0.88 : 1,
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  fullWidth: { width: "100%", alignSelf: "stretch" },
  text: { ...typography.headline, letterSpacing: 0.4 },
  contentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  glow: {
    position: "absolute",
    bottom: -12,
    left: "10%",
    right: "10%",
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryGlow,
  },
});
