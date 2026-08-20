import { Platform } from "react-native";

export function isApplePlatform(): boolean {
  if (Platform.OS === "ios") return true;
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad/.test(platform) || /Mac OS X/.test(ua);
}

export function shortcut(mac: string, windows: string): string {
  return isApplePlatform() ? mac : windows;
}
