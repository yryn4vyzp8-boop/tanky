import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Link } from "expo-router";
import { colors, radius, spacing, typography } from "../lib/theme";

const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;
const DESKTOP_BREAKPOINT = 860;

/**
 * On a wide desktop web viewport, renders children inside a realistic iPhone
 * device frame so the app can be demoed straight from a MacBook browser. On
 * native or a narrow (real mobile) viewport, renders children edge-to-edge
 * as a normal app — the frame is purely a desktop demo affordance, never
 * part of the real navigation tree.
 */
export function PhoneFrame({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  if (!isDesktopWeb) {
    return <View style={styles.fullBleed}>{children}</View>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.backdropGlowA} pointerEvents="none" />
      <View style={styles.backdropGlowB} pointerEvents="none" />

      {width >= 1180 && (
        <View style={styles.brandColumn} pointerEvents="none">
          <Text style={styles.brandWordmark}>TANKY</Text>
          <Text style={styles.brandTagline}>Tanken. Bezahlen. Weiterfahren.</Text>
          <Text style={styles.brandSub}>Live-Vorschau · Mobile Fueling &amp; Payment Platform</Text>
        </View>
      )}

      <View style={styles.phoneShadowWrap}>
        <View style={styles.bezel} nativeID="tanky-phone-bezel">
          <View style={styles.dynamicIsland} pointerEvents="none" />
          <View style={styles.screen}>
            <View style={styles.screenContent}>{children}</View>
          </View>
          <View style={styles.homeIndicator} pointerEvents="none" />
        </View>
      </View>

      <View style={styles.quickNav}>
        <Link href="/" style={styles.quickNavLink}>
          Start
        </Link>
        <Link href="/demo-control" style={styles.quickNavLink}>
          Demo Control
        </Link>
        <Link href="/admin" style={styles.quickNavLink}>
          Admin
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBleed: { flex: 1, backgroundColor: colors.background },
  backdrop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    overflow: "hidden",
  },
  backdropGlowA: {
    position: "absolute",
    top: -160,
    left: -160,
    width: 480,
    height: 480,
    borderRadius: 999,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  backdropGlowB: {
    position: "absolute",
    bottom: -200,
    right: -160,
    width: 520,
    height: 520,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
    opacity: 0.1,
  },
  brandColumn: {
    position: "absolute",
    left: 64,
    top: "50%",
    transform: [{ translateY: -60 }],
    maxWidth: 320,
  },
  brandWordmark: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
  },
  brandTagline: {
    color: colors.textSecondary,
    ...typography.headline,
    marginTop: spacing.sm,
  },
  brandSub: {
    color: colors.textMuted,
    ...typography.caption,
    marginTop: spacing.md,
  },
  phoneShadowWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20,
  },
  bezel: {
    width: PHONE_WIDTH + 16,
    height: PHONE_HEIGHT + 16,
    borderRadius: 62,
    backgroundColor: "#060709",
    padding: 8,
    borderWidth: 2,
    borderColor: "#1c1f26",
    alignItems: "center",
  },
  screen: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 52,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  // The Dynamic Island notch below is a purely decorative overlay — the
  // browser has no idea it's there, so react-native-safe-area-context can't
  // account for it. This padding is what actually keeps screen content
  // (headers, titles) clear of it.
  screenContent: {
    flex: 1,
    paddingTop: 46,
    paddingBottom: 26,
  },
  dynamicIsland: {
    position: "absolute",
    top: 20,
    left: "50%",
    transform: [{ translateX: -60 }],
    width: 120,
    height: 34,
    borderRadius: 20,
    backgroundColor: "#000",
    zIndex: 10,
  },
  homeIndicator: {
    position: "absolute",
    bottom: 14,
    left: "50%",
    transform: [{ translateX: -67 }],
    width: 134,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.35)",
    zIndex: 10,
  },
  quickNav: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickNavLink: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
});
