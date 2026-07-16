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
  textSubtle: "#7E8A87",

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

export type ThemeColors = typeof colorsLight;

export const fonts = {
  display: "Fraunces_500Medium",
  displayBold: "Fraunces_600SemiBold",
  body: "GeneralSans_Regular",
  bodyMedium: "GeneralSans_Medium",
  bodySemibold: "GeneralSans_Semibold",
  numeric: "DMSans_500Medium",
} as const;
