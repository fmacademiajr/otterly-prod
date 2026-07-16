// Otterly design tokens — MUST match DESIGN.md from the upstream repo.
// Do not invent values. Only add via explicit design approval.

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
  pill: 9999,
} as const;

export const colorsLight = {
  background: "#FFFFFF",
  surface: "#FAFAFA",
  surfaceMuted: "#F4F4F5",
  border: "#E4E4E7",
  text: "#18181B",
  textMuted: "#52525B",
  textSubtle: "#71717A",
  primary: "#5E8B82",
  primaryHover: "#4E7670",
  primaryActive: "#3F605B",
  primarySurface: "#EDF4F1",
  accent: "#D4A24F",
  success: "#3F7D58",
  warning: "#B58A3F",
  danger: "#A04848",
  onPrimary: "#FFFFFF",
} as const;

export const colorsDark = {
  background: "#14201D",
  surface: "#1B2926",
  surfaceMuted: "#20302C",
  border: "#2C3A36",
  text: "#F3F5F4",
  textMuted: "#A8B3B0",
  textSubtle: "#7E8A87",
  primary: "#7BA89F",
  primaryHover: "#8FB8B0",
  primaryActive: "#8FB8B0",
  primarySurface: "#1F2D29",
  accent: "#E0B26A",
  success: "#5E9E78",
  warning: "#B58A3F",
  danger: "#B25656",
  onPrimary: "#14201D",
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
