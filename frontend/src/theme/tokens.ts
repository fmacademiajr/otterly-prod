// Otterly design tokens — extended for Stitch-imported designs (v2).
// Adds warm cream palette + cartoon-otter direction.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 9999,
} as const;

export const colorsLight = {
  background: "#FFFFFF",
  // Warm cream — used on Inbox / Paywall / warm hero screens
  warmBg: "#F5F1E8",
  warmSurface: "#FBF8F0",
  warmBorder: "#E5DFCE",

  surface: "#FAFAFA",
  surfaceMuted: "#F4F4F5",
  border: "#E4E4E7",
  text: "#18181B",
  textMuted: "#52525B",
  textSubtle: "#71717A",

  // Teal band header washes
  tealBand: "#E7EFEA",
  tealBandBorder: "#C7D9CF",

  primary: "#5E8B82",
  primaryHover: "#4E7670",
  primaryActive: "#3F605B",
  primarySurface: "#EDF4F1",
  primarySurfaceStrong: "#D6E4DD",

  accent: "#D4A24F",
  accentSoft: "#EBD6A6",
  accentSurface: "#F6E9C9",

  success: "#3F7D58",
  warning: "#B58A3F",
  danger: "#A04848",
  onPrimary: "#FFFFFF",
  onAccent: "#FFFFFF",
} as const;

export const colorsDark = {
  background: "#14201D",
  warmBg: "#1D2622",
  warmSurface: "#243029",
  warmBorder: "#334037",

  surface: "#1B2926",
  surfaceMuted: "#20302C",
  border: "#2C3A36",
  text: "#F3F5F4",
  textMuted: "#A8B3B0",
  // Was #7E8A87: 4.34:1 on warmBg, 4.22 on surface, 3.86 on surfaceMuted — under the
  // 4.5 bar for body text on three real readable sites, including the "Sign out"
  // label. Low-contrast text costs extraneous cognitive load, which this audience
  // has none of to spare. #8F9B98 clears every surface (4.78-5.83) and still sits
  // below textMuted, so the hierarchy holds.
  textSubtle: "#8F9B98",

  tealBand: "#1F2D29",
  tealBandBorder: "#2C3A36",

  primary: "#7BA89F",
  primaryHover: "#8FB8B0",
  primaryActive: "#8FB8B0",
  primarySurface: "#1F2D29",
  primarySurfaceStrong: "#2A3F39",

  accent: "#E0B26A",
  accentSoft: "#4A3E24",
  accentSurface: "#3A2F1C",

  success: "#5E9E78",
  warning: "#B58A3F",
  danger: "#B25656",
  onPrimary: "#14201D",
  onAccent: "#14201D",
} as const;

// Onboarding palette — a named, fixed light set. The first-run flow renders this
// look regardless of device theme (approved Jul 19, 2026): a dark-device user sees
// a light flow once. Do not build an onboardingDark set. inkSoft is #5f675f (not the
// brief's #6c746d) so support text clears WCAG AA on the cream backgrounds; inkFaint
// is for skip/Not-now affordances only, never content.
export const onboardingLight = {
  bg: "#eef1ee",
  screen: "#f7f5f0",
  screenWarm: "#f1ede4",
  ink: "#39403b",
  inkSoft: "#5f675f",
  inkFaint: "#9aa39b",
  water: "#7fa8a0",
  waterSoft: "#cfe0db",
  line: "#e2ddd2",
  card: "#fffdf8",
} as const;

export type ThemeColors = typeof colorsLight;

export const fonts = {
  display: "Fraunces_500Medium",
  displayBold: "Fraunces_600SemiBold",
  body: "GeneralSans_Regular",
  bodyMedium: "GeneralSans_Medium",
  bodySemibold: "GeneralSans_Semibold",
  numeric: "DMSans_500Medium",
} as const;
