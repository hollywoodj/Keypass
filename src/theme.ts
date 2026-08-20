export type Theme = {
  mode: "light" | "dark";
  accent: string;
  accentSoft: string;
  bg: string;
  sidebar: string;
  list: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  hairline: string;
  searchBg: string;
  selected: string;
  selectedText: string;
  danger: string;
  warning: string;
  success: string;
  overlay: string;
  fieldBg: string;
  lockBg: string;
};

export const LIGHT: Theme = {
  mode: "light",
  accent: "#0572EC",
  accentSoft: "#E8F1FE",
  bg: "#FFFFFF",
  sidebar: "#F3F4F6",
  list: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1C1C1E",
  textSecondary: "#6E6E73",
  textTertiary: "#8E8E93",
  border: "#E5E5EA",
  hairline: "#ECECEF",
  searchBg: "#E8E8ED",
  selected: "#E8F1FE",
  selectedText: "#0572EC",
  danger: "#FF3B30",
  warning: "#FF9500",
  success: "#34C759",
  overlay: "rgba(0,0,0,0.45)",
  fieldBg: "#F2F2F7",
  lockBg: "#F2F2F7",
};

export const DARK: Theme = {
  mode: "dark",
  accent: "#0A84FF",
  accentSoft: "#153154",
  bg: "#1C1C1E",
  sidebar: "#2C2C2E",
  list: "#1C1C1E",
  card: "#2C2C2E",
  text: "#F2F2F7",
  textSecondary: "#A1A1A6",
  textTertiary: "#8E8E93",
  border: "#3A3A3C",
  hairline: "#3A3A3C",
  searchBg: "#3A3A3C",
  selected: "#153154",
  selectedText: "#64B5FF",
  danger: "#FF453A",
  warning: "#FF9F0A",
  success: "#32D74B",
  overlay: "rgba(0,0,0,0.62)",
  fieldBg: "#3A3A3C",
  lockBg: "#000000",
};

export function resolveTheme(preference: "system" | "light" | "dark", system: string | null | undefined): Theme {
  const mode = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  return mode === "dark" ? DARK : LIGHT;
}
