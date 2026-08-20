import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { generateSecretKey, passwordStrength } from "./crypto";
import { clickable, font, ItemBadge } from "./icons";
import type { Theme } from "./theme";
import { AppText, PillButton } from "./ui";

function Logo({ size = 72 }: { size?: number }) {
  return <ItemBadge category="login" letter="K" color="#0572EC" size={size} />;
}

function PasswordInput({
  theme,
  value,
  onChange,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  theme: Theme;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        height: 44,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        secureTextEntry={!reveal}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        style={{ flex: 1, color: theme.text, fontSize: 16, fontFamily: font }}
      />
      <Pressable onPress={() => setReveal((v) => !v)} style={clickable}>
        <Ionicons name={reveal ? "eye-off" : "eye"} size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

export function LockScreen({
  theme,
  name,
  email,
  error,
  busy,
  onUnlock,
}: {
  theme: Theme;
  name: string;
  email: string;
  error: string | null;
  busy: boolean;
  onUnlock: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  return (
    <View style={{ flex: 1, backgroundColor: theme.lockBg, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Logo />
      <AppText theme={theme} size={22} weight="700" style={{ marginTop: 18 }}>
        Unlock Keypass
      </AppText>
      <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 6 }}>
        {name} · {email}
      </AppText>
      <View style={{ width: "100%", maxWidth: 360, marginTop: 28, gap: 12 }}>
        <PasswordInput
          theme={theme}
          value={password}
          onChange={setPassword}
          placeholder="Account password"
          autoFocus
          onSubmit={() => onUnlock(password)}
        />
        {error ? (
          <AppText theme={theme} size={13} color={theme.danger}>
            {error}
          </AppText>
        ) : null}
        <PillButton label={busy ? "Unlocking…" : "Unlock"} theme={theme} primary onPress={() => onUnlock(password)} disabled={busy || !password} />
      </View>
    </View>
  );
}

export function SetupFlow({
  theme,
  busy,
  error,
  onCreate,
}: {
  theme: Theme;
  busy: boolean;
  error: string | null;
  onCreate: (input: { name: string; email: string; password: string; secretKey: string }) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secretKey] = useState(() => generateSecretKey());
  const [saved, setSaved] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.lockBg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Logo size={88} />
        <AppText theme={theme} size={28} weight="700" style={{ marginTop: 22 }}>
          Welcome to Keypass
        </AppText>
        <AppText theme={theme} size={15} color={theme.textSecondary} style={{ marginTop: 10, textAlign: "center", maxWidth: 420 }}>
          Remember a password for every site and app. Your vault is encrypted on this device with your account password and Secret Key.
        </AppText>
        <View style={{ marginTop: 28 }}>
          <PillButton label="Get Started" theme={theme} primary onPress={() => setStep(2)} />
        </View>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.lockBg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <AppText theme={theme} size={22} weight="700">
          Create your account
        </AppText>
        <View style={{ width: "100%", maxWidth: 400, marginTop: 22, gap: 10 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textTertiary}
            style={inputStyle(theme)}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.textTertiary}
            style={inputStyle(theme)}
          />
          <PillButton label="Continue" theme={theme} primary onPress={() => name.trim() && email.trim() && setStep(3)} disabled={!name.trim() || !email.trim()} />
        </View>
      </View>
    );
  }

  if (step === 3) {
    const ok = password.length >= 10 && password === confirm && strength.score >= 2;
    return (
      <View style={{ flex: 1, backgroundColor: theme.lockBg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <AppText theme={theme} size={22} weight="700">
          Choose your account password
        </AppText>
        <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 8, textAlign: "center", maxWidth: 400 }}>
          This is the only password you’ll need to remember. Make it long and unique. Keypass cannot recover it.
        </AppText>
        <View style={{ width: "100%", maxWidth: 400, marginTop: 22, gap: 10 }}>
          <PasswordInput theme={theme} value={password} onChange={setPassword} placeholder="Account password" autoFocus />
          <PasswordInput theme={theme} value={confirm} onChange={setConfirm} placeholder="Confirm password" />
          <StrengthMeter theme={theme} score={strength.score} label={strength.label} />
          {password && password !== confirm ? (
            <AppText theme={theme} size={13} color={theme.danger}>
              Passwords don’t match
            </AppText>
          ) : null}
          <PillButton label="Continue" theme={theme} primary onPress={() => setStep(4)} disabled={!ok} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.lockBg, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <AppText theme={theme} size={22} weight="700">
        Save your Emergency Kit
      </AppText>
      <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 8, textAlign: "center", maxWidth: 460 }}>
        Your Secret Key is unique to this account. Together with your account password, it encrypts your vault. Store it somewhere safe.
      </AppText>
      <View
        style={{
          width: "100%",
          maxWidth: 460,
          marginTop: 22,
          backgroundColor: theme.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
          gap: 10,
        }}
      >
        <Row theme={theme} label="Name" value={name} />
        <Row theme={theme} label="Email" value={email} />
        <Row theme={theme} label="Secret Key" value={secretKey} mono />
      </View>
      <Pressable onPress={() => setSaved((v) => !v)} style={[clickable, { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }]}>
        <Ionicons name={saved ? "checkbox" : "square-outline"} size={20} color={theme.accent} />
        <AppText theme={theme} size={14}>
          I have saved my Emergency Kit
        </AppText>
      </Pressable>
      {error ? (
        <AppText theme={theme} size={13} color={theme.danger} style={{ marginTop: 10 }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ marginTop: 18 }}>
        <PillButton
          label={busy ? "Creating…" : "Create Account"}
          theme={theme}
          primary
          disabled={!saved || busy}
          onPress={() => onCreate({ name: name.trim(), email: email.trim(), password, secretKey })}
        />
      </View>
    </View>
  );
}

function Row({ theme, label, value, mono }: { theme: Theme; label: string; value: string; mono?: boolean }) {
  return (
    <View>
      <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text
        selectable
        style={{
          color: theme.text,
          fontSize: 14,
          marginTop: 2,
          fontFamily: mono ? PlatformMono : font,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const PlatformMono = font;

function inputStyle(theme: Theme) {
  return {
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    height: 44,
    color: theme.text,
    fontSize: 16,
    fontFamily: font,
  };
}

function StrengthMeter({ theme, score, label }: { theme: Theme; score: number; label: string }) {
  const colors = [theme.danger, theme.danger, theme.warning, theme.success, theme.success];
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= score ? colors[score] : theme.border,
            }}
          />
        ))}
      </View>
      <AppText theme={theme} size={12} color={theme.textSecondary}>
        Password strength: {label}
      </AppText>
    </View>
  );
}
