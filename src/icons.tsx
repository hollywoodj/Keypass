import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { Category } from "./model";
import { CATEGORY_BY_ID } from "./categories";
import type { Theme } from "./theme";

export function iconName(category: Category): React.ComponentProps<typeof Ionicons>["name"] {
  const map: Record<Category, React.ComponentProps<typeof Ionicons>["name"]> = {
    login: "person-circle",
    secureNote: "document-text",
    creditCard: "card",
    identity: "person",
    password: "key",
    document: "folder",
    apiCredential: "code-slash",
    bankAccount: "cash",
    cryptoWallet: "wallet",
    database: "server",
    driverLicense: "car",
    emailAccount: "mail",
    medicalRecord: "medkit",
    membership: "ribbon",
    outdoorLicense: "leaf",
    passport: "airplane",
    rewardProgram: "star",
    sshKey: "terminal",
    server: "desktop",
    ssn: "shield",
    softwareLicense: "pricetag",
    wirelessRouter: "wifi",
  };
  return map[category];
}

export function CategoryGlyph({
  category,
  size = 18,
  color = "#fff",
}: {
  category: Category;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={iconName(category)} size={size} color={color} />;
}

export function ItemBadge({
  category,
  letter,
  color,
  size = 32,
}: {
  category: Category;
  letter?: string;
  color?: string;
  size?: number;
}) {
  const bg = color || CATEGORY_BY_ID[category].color;
  const radius = Math.round(size * 0.28);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {letter ? (
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.42 }}>{letter}</Text>
      ) : (
        <CategoryGlyph category={category} size={size * 0.52} />
      )}
    </View>
  );
}

export const font = Platform.select({
  ios: "System",
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
  default: "System",
});

export const clickable = Platform.select({
  web: { cursor: "pointer" as const },
  default: {},
});

export function Hairline({ theme, vertical, color }: { theme: Theme; vertical?: boolean; color?: string }) {
  return (
    <View
      style={
        vertical
          ? { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: color ?? theme.hairline }
          : { height: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: color ?? theme.hairline }
      }
    />
  );
}
