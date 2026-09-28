import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clickable, font } from "./icons";
import type { Theme } from "./theme";

export function AppText({
  children,
  theme,
  size = 14,
  weight = "400",
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  theme: Theme;
  size?: number;
  weight?: "400" | "500" | "600" | "700";
  color?: string;
  style?: StyleProp<ViewStyle | object>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: font, fontSize: size, fontWeight: weight, color: color ?? theme.text },
        style as object,
      ]}
    >
      {children}
    </Text>
  );
}

export function IconButton({
  name,
  theme,
  onPress,
  size = 22,
  color,
  disabled,
}: {
  name: keyof typeof Ionicons.glyphMap;
  theme: Theme;
  onPress?: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        clickable,
        {
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.35 : pressed ? 0.65 : 1,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

export function PillButton({
  label,
  theme,
  onPress,
  primary,
  danger,
  disabled,
}: {
  label: string;
  theme: Theme;
  onPress?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const bg = danger ? theme.danger : primary ? theme.accent : theme.fieldBg;
  const fg = danger || primary ? "#fff" : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        clickable,
        {
          backgroundColor: bg,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ color: fg, fontWeight: "600", fontSize: 14, fontFamily: font }}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({
  theme,
  value,
  onChange,
  placeholder = "Search",
  autoFocus,
  onSubmit,
}: {
  theme: Theme;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!autoFocus) return;
    // Popups used to leave focus on the dismiss layer. Put it on the field
    // after layout so typing works as soon as the popup is visible.
    const focus = () => inputRef.current?.focus();
    const frame = requestAnimationFrame(focus);
    const timer = setTimeout(focus, 50);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [autoFocus]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.searchBg,
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 32,
        gap: 6,
      }}
    >
      <Ionicons name="search" size={14} color={theme.textTertiary} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        style={{
          flex: 1,
          color: theme.text,
          fontSize: 13,
          fontFamily: font,
          paddingVertical: 0,
          ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
        }}
      />
      {value ? (
        <Pressable onPress={() => onChange("")} style={clickable}>
          <Ionicons name="close-circle" size={14} color={theme.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Toast({ message, theme }: { message: string | null; theme: Theme }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [message, opacity]);
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 28,
        alignSelf: "center",
        backgroundColor: theme.mode === "dark" ? "#3A3A3C" : "#1C1C1E",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        opacity,
        zIndex: 50,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>{message}</Text>
    </Animated.View>
  );
}

export function Overlay({
  onClose,
  theme,
  children,
  placement = "center",
}: {
  onClose: () => void;
  theme: Theme;
  children: React.ReactNode;
  placement?: "center" | "top";
}) {
  const rootRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement;
    const root = rootRef.current as unknown as { contains?: (node: unknown) => boolean } | null;
    if (active && root?.contains?.(active)) return;
    (active as { blur?: () => void } | null)?.blur?.();
  }, []);

  return (
    <View
      ref={rootRef}
      accessibilityViewIsModal
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        alignItems: "center",
        justifyContent: placement === "center" ? "center" : "flex-start",
        paddingHorizontal: 24,
        paddingTop: placement === "top" ? 80 : 24,
        paddingBottom: 24,
      }}
    >
      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        onPress={onClose}
        tabIndex={-1}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, zIndex: 0 }]}
      />
      {children}
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  theme,
  children,
  width = 520,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  children: React.ReactNode;
  width?: number;
  title?: string;
}) {
  if (!visible) return null;
  return (
    <Overlay onClose={onClose} theme={theme}>
      <View
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90%",
          backgroundColor: theme.card,
          borderRadius: 14,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          zIndex: 1,
        }}
      >
        {title ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText theme={theme} size={17} weight="700">
              {title}
            </AppText>
            <IconButton name="close" theme={theme} onPress={onClose} />
          </View>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18 }}>
          {children}
        </ScrollView>
      </View>
    </Overlay>
  );
}

export function FieldBox({
  theme,
  label,
  children,
  onPress,
}: {
  theme: Theme;
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        clickable,
        {
          backgroundColor: theme.fieldBg,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          opacity: pressed && onPress ? 0.75 : 1,
        },
      ]}
    >
      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "lowercase", marginBottom: 4 }}>
        {label}
      </Text>
      {children}
    </Pressable>
  );
}

export function Segmented({
  theme,
  options,
  value,
  onChange,
}: {
  theme: Theme;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: theme.searchBg, borderRadius: 8, padding: 2 }}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              clickable,
              {
                flex: 1,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: active ? theme.card : "transparent",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: active ? theme.text : theme.textSecondary }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
