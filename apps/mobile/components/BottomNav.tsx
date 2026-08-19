import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../lib/theme";

const ITEMS = [
  { href: "/(phone)/home" as const, label: "Start", match: "/home" },
  { href: "/(phone)/history" as const, label: "Verlauf", match: "/history" },
  { href: "/(phone)/profile" as const, label: "Profil", match: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {ITEMS.map((item) => {
        const active = pathname.includes(item.match);
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            hitSlop={8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    // Simulated glassmorphism: very dark translucent over the near-black bg
    backgroundColor: "rgba(3, 3, 7, 0.92)",
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: spacing.md, minHeight: 44 },
  itemPressed: { opacity: 0.5 },
  label: { color: colors.textMuted, ...typography.captionStrong, letterSpacing: 0.3 },
  labelActive: { color: colors.primaryMuted },
});
