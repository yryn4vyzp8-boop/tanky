import { StyleSheet, Text, View } from "react-native";
import { Link, usePathname } from "expo-router";
import { colors, spacing, typography } from "../lib/theme";

const ITEMS = [
  { href: "/(phone)/home", label: "Start", match: "/home" },
  { href: "/(phone)/history", label: "Verlauf", match: "/history" },
  { href: "/(phone)/profile", label: "Profil", match: "/profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.bar}>
      {ITEMS.map((item) => {
        const active = pathname.includes(item.match);
        return (
          <Link key={item.href} href={item.href} style={styles.item}>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: spacing.sm },
  label: { color: colors.textMuted, ...typography.captionStrong },
  labelActive: { color: colors.primaryMuted },
});
