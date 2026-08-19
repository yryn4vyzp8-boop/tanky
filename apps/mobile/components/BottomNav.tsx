import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../lib/theme";
import { SPRING_PRESS_IN, SPRING_PRESS_OUT } from "../lib/motion";

const ITEMS = [
  { href: "/(phone)/home" as const, label: "Start", match: "/home" },
  { href: "/(phone)/history" as const, label: "Verlauf", match: "/history" },
  { href: "/(phone)/profile" as const, label: "Profil", match: "/profile" },
];

function NavItem({ item, active, onPress }: { item: typeof ITEMS[0]; active: boolean; onPress: () => void }) {
  const itemScale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(active ? 1 : 0.4)).current;
  const labelOpacity = useRef(new Animated.Value(active ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(dotOpacity, { toValue: active ? 1 : 0, speed: 50, bounciness: active ? 3 : 0, useNativeDriver: true }),
      Animated.spring(dotScale, { toValue: active ? 1 : 0.4, speed: 50, bounciness: active ? 4 : 0, useNativeDriver: true }),
      Animated.timing(labelOpacity, { toValue: active ? 1 : 0.45, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(itemScale, { toValue: 0.88, ...SPRING_PRESS_IN }).start()}
      onPressOut={() => Animated.spring(itemScale, { toValue: 1, ...SPRING_PRESS_OUT }).start()}
      hitSlop={8}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ scale: itemScale }], alignItems: "center", gap: 5 }}>
        <Animated.Text style={[styles.label, { opacity: labelOpacity, color: active ? colors.primaryMuted : colors.textMuted }]}>
          {item.label}
        </Animated.Text>
        <Animated.View
          style={[
            styles.dot,
            { opacity: dotOpacity, transform: [{ scale: dotScale }], backgroundColor: colors.primary },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {ITEMS.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={pathname.includes(item.match)}
          onPress={() => router.push(item.href)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.10)",
    backgroundColor: "rgba(3, 3, 7, 0.94)",
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: spacing.md, minHeight: 44 },
  label: { ...typography.captionStrong, letterSpacing: 0.3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
