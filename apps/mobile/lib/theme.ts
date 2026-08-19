export const colors = {
  // Near-black gradient: avoid pure #000 (OLED smear)
  background: "#030307",
  backgroundTop: "#06060E",

  // Translucent surfaces — no solid fills
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceElevated: "rgba(255, 255, 255, 0.08)",
  surfaceHighlight: "rgba(255, 255, 255, 0.12)",

  // Hairline-only borders
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",

  // Indigo accent — more premium than flat blue
  primary: "#5E6AD2",
  primaryMuted: "#8B93E0",
  primaryTint: "rgba(94, 106, 210, 0.15)",
  primaryGlow: "rgba(94, 106, 210, 0.25)",

  success: "#22C55E",
  successTint: "rgba(34, 197, 94, 0.12)",
  danger: "#F04438",
  dangerTint: "rgba(240, 68, 56, 0.12)",
  warning: "#F5A524",
  warningTint: "rgba(245, 165, 36, 0.12)",

  textPrimary: "#EDEDEF",
  textSecondary: "#8A8F98",
  textMuted: "#52566A",
  textInverse: "#020203",

  overlay: "rgba(2, 2, 5, 0.76)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  fontFamily: "System",
  // Apple principle: negative tracking grows with size — tighten headings, leave body near 0
  display:      { fontSize: 36, fontWeight: "800" as const, letterSpacing: -1.2, lineHeight: 40 },
  title:        { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.8, lineHeight: 30 },
  headline:     { fontSize: 17, fontWeight: "600" as const, letterSpacing: -0.3, lineHeight: 24 },
  body:         { fontSize: 15, fontWeight: "400" as const, letterSpacing:  0,   lineHeight: 22 },
  bodyStrong:   { fontSize: 15, fontWeight: "600" as const, letterSpacing: -0.1, lineHeight: 22 },
  caption:      { fontSize: 13, fontWeight: "400" as const, letterSpacing:  0,   lineHeight: 18 },
  captionStrong:{ fontSize: 13, fontWeight: "500" as const, letterSpacing:  0.1, lineHeight: 18 },
  micro:        { fontSize: 11, fontWeight: "600" as const, letterSpacing:  0.8, lineHeight: 14 },
  // Tabular numbers for CHF amounts — tighter tracking at large sizes
  amount:       { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.6, fontVariant: ["tabular-nums" as const] },
  amountLg:     { fontSize: 32, fontWeight: "800" as const, letterSpacing: -1.2, fontVariant: ["tabular-nums" as const] },
};
