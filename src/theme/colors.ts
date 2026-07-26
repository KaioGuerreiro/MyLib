export interface ThemeType {
  bg: string;
  card: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputBgFocus: string;
  text: string;
  textSub: string;
  label: string;
  primary: string;
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
  bg: "#253916", // Dark green background
  card: "#2C421A", // Slightly lighter for cards
  cardBorder: "#385422",
  inputBg: "#2A3F19",
  inputBorder: "#385422",
  inputBorderFocus: "#65d067", // Vibrant green focus
  inputBgFocus: "#2E471C",
  text: "#f2f6f0", // Very light for text
  textSub: "#A3B899", // Muted light green
  label: "#c9ea63", // Lime/yellow-green for labels
  primary: "#65d067", // Vibrant green for buttons
  primaryShadow: "#65d067",
  forgotText: "#c9ea63", // Lime for links
  signUpText: "#A3B899",
  signUpLink: "#c9ea63",
  trackActive: "#65d067",
  trackInactive: "#2A3F19",
  trackBorder: "#385422",
  thumb: "#f2f6f0",
  iconColor: "#c9ea63",
  blobLeft: "#65d067", // Vibrant green
  blobRight: "#c9ea63", // Lime
  statusBar: "light" as const,
};

export const LIGHT: ThemeType = {
  bg: "#f2f6f0", // Very light greenish-white
  card: "#FFFFFF",
  cardBorder: "#DCE5D7",
  inputBg: "#EAF0E6",
  inputBorder: "#DCE5D7",
  inputBorderFocus: "#65d067",
  inputBgFocus: "#FFFFFF",
  text: "#253916", // Darkest green for text
  textSub: "#5D7A4A",
  label: "#253916",
  primary: "#65d067", // Vibrant green
  primaryShadow: "#65d067",
  forgotText: "#253916",
  signUpText: "#5D7A4A",
  signUpLink: "#253916",
  trackActive: "#65d067",
  trackInactive: "#DCE5D7",
  trackBorder: "#C0D1B6",
  thumb: "#FFFFFF",
  iconColor: "#65d067",
  blobLeft: "#65d067",
  blobRight: "#c9ea63",
  statusBar: "dark" as const,
};
