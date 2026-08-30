export const PALETTE = {
  bg: "#161826",
  surface: "#232532",
  accent: "#9184d9",
  accentText: "#d2cefd",
  text: "#e9e9ed",
  textSecondary: "#b2b6ca",
  textMuted: "#75798c",
  success: "#7fc4a0",
  warning: "#e0a54e",
  danger: "#e0736b",
  streak: "#e08a5a",
};

export interface ThemeType {
  // Base Palette tokens
  bg: string;
  surface: string;
  accent: string;
  accentText: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  streak: string;

  // Semantic / Component tokens
  card: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputBgFocus: string;
  textSub: string;
  label: string;
  primary: string;
  primaryText: string;
  primaryShadow: string;
  forgotText: string;
  signUpText: string;
  signUpLink: string;
  trackActive: string;
  trackInactive: string;
  trackBorder: string;
  thumb: string;
  iconColor: string;
  blobLeft: string;
  blobRight: string;
  statusBar: "light" | "dark" | "auto" | "inverted";
}

export const DARK: ThemeType = {
  // Base Palette
  bg: PALETTE.bg,
  surface: PALETTE.surface,
  accent: PALETTE.accent,
  accentText: PALETTE.accentText,
  text: PALETTE.text,
  textSecondary: PALETTE.textSecondary,
  textMuted: PALETTE.textMuted,
  success: PALETTE.success,
  warning: PALETTE.warning,
  danger: PALETTE.danger,
  streak: PALETTE.streak,

  // Component Mappings
  card: PALETTE.surface,
  cardBorder: "#2E3244",
  inputBg: "#1C1E2D",
  inputBorder: "#2E3244",
  inputBorderFocus: PALETTE.accent,
  inputBgFocus: PALETTE.surface,
  textSub: PALETTE.textSecondary,
  label: PALETTE.accentText,
  primary: PALETTE.accent,
  primaryText: "#FFFFFF",
  primaryShadow: PALETTE.accent,
  forgotText: PALETTE.accentText,
  signUpText: PALETTE.textSecondary,
  signUpLink: PALETTE.accentText,
  trackActive: PALETTE.accent,
  trackInactive: PALETTE.surface,
  trackBorder: "#2E3244",
  thumb: PALETTE.text,
  iconColor: PALETTE.accentText,
  blobLeft: PALETTE.accent,
  blobRight: PALETTE.accentText,
  statusBar: "light" as const,
};

export const LIGHT: ThemeType = {
  // Base Palette
  bg: "#F5F6FA",
  surface: "#FFFFFF",
  accent: PALETTE.accent,
  accentText: "#6C5CE7",
  text: "#161826",
  textSecondary: "#5B6077",
  textMuted: PALETTE.textMuted,
  success: PALETTE.success,
  warning: PALETTE.warning,
  danger: PALETTE.danger,
  streak: PALETTE.streak,

  // Component Mappings
  card: "#FFFFFF",
  cardBorder: "#E2E5EE",
  inputBg: "#EDEFF5",
  inputBorder: "#D5D9E5",
  inputBorderFocus: PALETTE.accent,
  inputBgFocus: "#FFFFFF",
  textSub: "#5B6077",
  label: "#6C5CE7",
  primary: PALETTE.accent,
  primaryText: "#FFFFFF",
  primaryShadow: PALETTE.accent,
  forgotText: "#6C5CE7",
  signUpText: "#5B6077",
  signUpLink: "#6C5CE7",
  trackActive: PALETTE.accent,
  trackInactive: "#E2E5EE",
  trackBorder: "#D5D9E5",
  thumb: "#FFFFFF",
  iconColor: "#6C5CE7",
  blobLeft: PALETTE.accent,
  blobRight: PALETTE.accentText,
  statusBar: "dark" as const,
};
