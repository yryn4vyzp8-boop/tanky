/**
 * TANKY design tokens. Premium fintech/mobility look: near-black navy
 * surfaces, a single confident accent blue, generous spacing, no visual
 * noise. Used directly (not via a theming library) since the MVP only ships
 * one look — see README for how to extend this to light mode / i18n later.
 */
export const colors = {
  background: "#0A0E1A",
  surface: "#12172A",
  surfaceElevated: "#1A2036",
  surfaceHighlight: "#212949",
  border: "#232A44",
  borderStrong: "#323C63",

  primary: "#0B5FFF",
  primaryMuted: "#3D7CFF",
  primaryTint: "#152246",

  success: "#22C55E",
  successTint: "#122A1D",
  danger: "#F04438",
  dangerTint: "#2E1516",
  warning: "#F5A524",
  warningTint: "#2E2410",

  textPrimary: "#F5F7FA",
  textSecondary: "#9AA4B8",
  textMuted: "#5C6480",
  textInverse: "#0A0E1A",

  overlay: "rgba(6, 9, 18, 0.72)",
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
  display: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  captionStrong: { fontSize: 13, fontWeight: "600" as const },
  micro: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.6 },
};
