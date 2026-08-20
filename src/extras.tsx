import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { CATEGORIES } from "./categories";
import { DEFAULT_GENERATOR, generatePassword, type GeneratorOptions } from "./generator";
import { clickable, ItemBadge } from "./icons";
import { formatWhen } from "./items";
import { isActiveItem, itemLetter, itemSubtitle, type Database, type Settings, type VaultItem } from "./model";
import type { Theme } from "./theme";
import { AppText, PillButton, SearchField, Segmented } from "./ui";
import type { WatchtowerReport } from "./watchtower";
import { shortcut } from "./platform";

export function HomeScreen({
  theme,
  db,
  onOpenItem,
  onNavigateCategory,
}: {
  theme: Theme;
  db: Database;
  onOpenItem: (id: string) => void;
  onNavigateCategory: (category: (typeof CATEGORIES)[number]["id"]) => void;
}) {
  const active = db.items.filter(isActiveItem);
  const favorites = active.filter((item) => item.favorite);
  const recent = [...active].sort((a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt)).slice(0, 8);
  const pinned = db.pinnedFields
    .map((pin) => {
      const item = active.find((entry) => entry.id === pin.itemId);
      const field = item?.fields.find((entry) => entry.id === pin.fieldId);
      return item && field ? { item, field } : null;
    })
    .filter(Boolean) as { item: VaultItem; field: VaultItem["fields"][number] }[];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <AppText theme={theme} size={32} weight="700">
        Home
      </AppText>
      {pinned.length ? (
        <Section title="Pinned" theme={theme}>
          {pinned.map(({ item, field }) => (
            <Pressable
              key={`${item.id}-${field.id}`}
              onPress={() => onOpenItem(item.id)}
              style={[clickable, { backgroundColor: theme.fieldBg, borderRadius: 12, padding: 12, marginBottom: 8 }]}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>{item.title} · {field.label}</Text>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginTop: 4 }}>
                {field.kind === "password" || field.kind === "concealed" ? "••••••••" : field.value}
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : null}
      {favorites.length ? (
        <Section title="Favorites" theme={theme}>
          {favorites.map((item) => (
            <MiniRow key={item.id} theme={theme} item={item} onPress={() => onOpenItem(item.id)} />
          ))}
        </Section>
      ) : null}
      <Section title="Categories" theme={theme}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CATEGORIES.filter((category) => category.common).map((category) => (
            <Pressable
              key={category.id}
              onPress={() => onNavigateCategory(category.id)}
              style={[clickable, { width: "47%", backgroundColor: theme.fieldBg, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }]}
            >
              <ItemBadge category={category.id} color={category.color} size={28} />
              <Text style={{ fontWeight: "600", color: theme.text }}>{category.title}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
      <Section title="Recently Used" theme={theme}>
        {recent.length === 0 ? (
          <AppText theme={theme} size={14} color={theme.textSecondary}>
            Items you use will show up here.
          </AppText>
        ) : (
          recent.map((item) => <MiniRow key={item.id} theme={theme} item={item} onPress={() => onOpenItem(item.id)} />)
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, theme, children }: { title: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <AppText theme={theme} size={13} weight="700" color={theme.textSecondary} style={{ marginBottom: 10 }}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function MiniRow({ theme, item, onPress }: { theme: Theme; item: VaultItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [clickable, { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, opacity: pressed ? 0.7 : 1 }]}>
      <ItemBadge category={item.category} letter={itemLetter(item)} color={item.iconColor} size={30} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "600" }}>{item.title || "Untitled"}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{itemSubtitle(item)}</Text>
      </View>
    </Pressable>
  );
}

export function WatchtowerScreen({
  theme,
  report,
  onOpenItem,
}: {
  theme: Theme;
  report: WatchtowerReport;
  onOpenItem: (id: string) => void;
}) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <AppText theme={theme} size={28} weight="700">
        Watchtower
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 18, marginBottom: 8 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            borderWidth: 8,
            borderColor: report.score >= 80 ? theme.success : report.score >= 50 ? theme.warning : theme.danger,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>{report.score}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <AppText theme={theme} size={16} weight="700">
            {report.issueCount === 0 ? "Looking good" : `${report.issueCount} item${report.issueCount === 1 ? "" : "s"} need attention`}
          </AppText>
          <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 4 }}>
            Watchtower checks your vault for weak, reused, and aging credentials.
          </AppText>
        </View>
      </View>
      {report.sections.map((section) => (
        <View key={section.id} style={{ marginTop: 22 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <AppText theme={theme} size={16} weight="700">
              {section.title}
            </AppText>
            <Text style={{ color: section.items.length ? theme.danger : theme.success, fontWeight: "700" }}>{section.items.length}</Text>
          </View>
          <AppText theme={theme} size={12} color={theme.textSecondary} style={{ marginTop: 4, marginBottom: 8 }}>
            {section.subtitle}
          </AppText>
          {section.items.length === 0 ? (
            <AppText theme={theme} size={13} color={theme.textTertiary}>
              No items
            </AppText>
          ) : (
            section.items.map((hit) => (
              <Pressable
                key={`${section.id}-${hit.item.id}`}
                onPress={() => onOpenItem(hit.item.id)}
                style={[clickable, { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }]}
              >
                <ItemBadge category={hit.item.category} letter={itemLetter(hit.item)} color={hit.item.iconColor} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{hit.item.title}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{hit.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </Pressable>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

export function GeneratorPanel({
  theme,
  onUse,
}: {
  theme: Theme;
  onUse: (password: string) => void;
}) {
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR);
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_GENERATOR));
  const regen = (next = options) => setPassword(generatePassword(next));

  return (
    <View style={{ gap: 14 }}>
      <Segmented
        theme={theme}
        value={options.mode}
        onChange={(mode) => {
          const next = { ...options, mode: mode as GeneratorOptions["mode"] };
          setOptions(next);
          regen(next);
        }}
        options={[
          { id: "password", label: "Password" },
          { id: "memorable", label: "Memorable" },
          { id: "pin", label: "PIN" },
        ]}
      />
      <View style={{ backgroundColor: theme.fieldBg, borderRadius: 12, padding: 16, alignItems: "center" }}>
        <Text selectable style={{ fontSize: 20, fontWeight: "700", color: theme.text, textAlign: "center" }}>
          {password}
        </Text>
      </View>
      {options.mode === "password" ? (
        <>
          <SliderRow theme={theme} label={`Length: ${options.length}`} value={options.length} min={8} max={50} onChange={(length) => {
            const next = { ...options, length };
            setOptions(next);
            regen(next);
          }} />
          <ToggleRow theme={theme} label="Digits" value={options.digits} onChange={(digits) => {
            const next = { ...options, digits };
            setOptions(next);
            regen(next);
          }} />
          <ToggleRow theme={theme} label="Symbols" value={options.symbols} onChange={(symbols) => {
            const next = { ...options, symbols };
            setOptions(next);
            regen(next);
          }} />
          <ToggleRow theme={theme} label="Avoid ambiguous characters" value={options.avoidAmbiguous} onChange={(avoidAmbiguous) => {
            const next = { ...options, avoidAmbiguous };
            setOptions(next);
            regen(next);
          }} />
        </>
      ) : null}
      {options.mode === "memorable" ? (
        <>
          <SliderRow theme={theme} label={`Words: ${options.words}`} value={options.words} min={3} max={8} onChange={(words) => {
            const next = { ...options, words };
            setOptions(next);
            regen(next);
          }} />
          <ToggleRow theme={theme} label="Capitalize" value={options.capitalize} onChange={(capitalize) => {
            const next = { ...options, capitalize };
            setOptions(next);
            regen(next);
          }} />
          <ToggleRow theme={theme} label="Include a number" value={options.includeNumber} onChange={(includeNumber) => {
            const next = { ...options, includeNumber };
            setOptions(next);
            regen(next);
          }} />
        </>
      ) : null}
      {options.mode === "pin" ? (
        <SliderRow theme={theme} label={`Digits: ${options.pinLength}`} value={options.pinLength} min={3} max={12} onChange={(pinLength) => {
          const next = { ...options, pinLength };
          setOptions(next);
          regen(next);
        }} />
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <PillButton label="Regenerate" theme={theme} onPress={() => regen()} />
        <PillButton label="Use" theme={theme} primary onPress={() => onUse(password)} />
      </View>
    </View>
  );
}

function ToggleRow({ theme, label, value, onChange }: { theme: Theme; label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <AppText theme={theme} size={14}>{label}</AppText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function SliderRow({
  theme,
  label,
  value,
  min,
  max,
  onChange,
}: {
  theme: Theme;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View>
      <AppText theme={theme} size={14}>{label}</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={clickable}>
          <Ionicons name="remove-circle" size={22} color={theme.accent} />
        </Pressable>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.searchBg }}>
          <View style={{ width: `${((value - min) / (max - min)) * 100}%`, height: 6, borderRadius: 3, backgroundColor: theme.accent }} />
        </View>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={clickable}>
          <Ionicons name="add-circle" size={22} color={theme.accent} />
        </Pressable>
      </View>
    </View>
  );
}

export function QuickAccess({
  theme,
  items,
  onClose,
  onOpen,
  onCopyUser,
  onCopyPassword,
}: {
  theme: Theme;
  items: VaultItem[];
  onClose: () => void;
  onOpen: (id: string) => void;
  onCopyUser: (item: VaultItem) => void;
  onCopyPassword: (item: VaultItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = items.filter(isActiveItem);
    if (!q) return pool.slice(0, 12);
    return pool.filter((item) => `${item.title} ${itemSubtitle(item)}`.toLowerCase().includes(q)).slice(0, 12);
  }, [items, query]);
  const current = filtered[index] ?? filtered[0];

  return (
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: theme.overlay, alignItems: "center", paddingTop: 80 }}>
      <Pressable
        onPress={() => undefined}
        style={{ width: "92%", maxWidth: 560, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.border }}
      >
        <View style={{ padding: 12 }}>
          <SearchField theme={theme} value={query} onChange={(value) => { setQuery(value); setIndex(0); }} placeholder="Quick Access" autoFocus />
        </View>
        {filtered.map((item, i) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            style={[
              clickable,
              { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: current?.id === item.id ? theme.selected : "transparent" },
            ]}
          >
            <ItemBadge category={item.category} letter={itemLetter(item)} color={item.iconColor} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{item.title}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{itemSubtitle(item)}</Text>
            </View>
            {current?.id === item.id ? (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable onPress={() => onCopyUser(item)} style={clickable}><Text style={{ color: theme.accent, fontSize: 12 }}>user</Text></Pressable>
                <Pressable onPress={() => onCopyPassword(item)} style={clickable}><Text style={{ color: theme.accent, fontSize: 12 }}>pass</Text></Pressable>
              </View>
            ) : null}
          </Pressable>
        ))}
        <Text style={{ color: theme.textTertiary, fontSize: 11, padding: 12 }}>
          {shortcut("⇧⌘Space", "Ctrl+Shift+Space")} to close · {shortcut("⌘C", "Ctrl+C")} copy username · {shortcut("⇧⌘C", "Ctrl+Shift+C")} copy password · updated {formatWhen(Date.now())}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export function SettingsScreen({
  theme,
  db,
  onChange,
  onLock,
  onShowKit,
}: {
  theme: Theme;
  db: Database;
  onChange: (settings: Settings) => void;
  onLock: () => void;
  onShowKit: () => void;
}) {
  const settings = db.settings;
  return (
    <ScrollView contentContainerStyle={{ padding: 8, gap: 14 }}>
      <AppText theme={theme} size={13} color={theme.textSecondary}>Appearance</AppText>
      <Segmented
        theme={theme}
        value={settings.theme}
        onChange={(value) => onChange({ ...settings, theme: value as Settings["theme"] })}
        options={[
          { id: "system", label: "System" },
          { id: "light", label: "Light" },
          { id: "dark", label: "Dark" },
        ]}
      />
      <ToggleRow theme={theme} label="Always show categories in sidebar" value={settings.showCategoriesInSidebar} onChange={(showCategoriesInSidebar) => onChange({ ...settings, showCategoriesInSidebar })} />
      <ToggleRow theme={theme} label="Always show tags in sidebar" value={settings.showTagsInSidebar} onChange={(showTagsInSidebar) => onChange({ ...settings, showTagsInSidebar })} />
      <ToggleRow theme={theme} label="Always show vaults in sidebar" value={settings.showVaultsInSidebar} onChange={(showVaultsInSidebar) => onChange({ ...settings, showVaultsInSidebar })} />
      <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 8 }}>Security</AppText>
      <SliderRow
        theme={theme}
        label={`Auto-lock after ${settings.autoLockMinutes} minutes`}
        value={settings.autoLockMinutes}
        min={1}
        max={60}
        onChange={(autoLockMinutes) => onChange({ ...settings, autoLockMinutes })}
      />
      <ToggleRow theme={theme} label="Hold Option to reveal secure fields" value={settings.holdOptionToReveal} onChange={(holdOptionToReveal) => onChange({ ...settings, holdOptionToReveal })} />
      <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 8 }}>Account</AppText>
      <TextInput editable={false} value={db.account.name} style={{ color: theme.text }} />
      <TextInput editable={false} value={db.account.email} style={{ color: theme.text }} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <PillButton label="Emergency Kit" theme={theme} onPress={onShowKit} />
        <PillButton label="Lock" theme={theme} danger onPress={onLock} />
      </View>
    </ScrollView>
  );
}

export function EmergencyKit({ theme, db }: { theme: Theme; db: Database }) {
  return (
    <View style={{ gap: 10 }}>
      <AppText theme={theme} size={14} color={theme.textSecondary}>
        Keep this somewhere safe. Anyone with your account password and Secret Key can decrypt your vault.
      </AppText>
      <View style={{ backgroundColor: theme.fieldBg, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Name</Text>
        <Text selectable style={{ color: theme.text, fontWeight: "600" }}>{db.account.name}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Email</Text>
        <Text selectable style={{ color: theme.text, fontWeight: "600" }}>{db.account.email}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>Secret Key</Text>
        <Text selectable style={{ color: theme.text, fontWeight: "700", letterSpacing: 0.4 }}>{db.account.secretKey}</Text>
      </View>
    </View>
  );
}

export function MobileTabs({
  theme,
  tab,
  onTab,
}: {
  theme: Theme;
  tab: "home" | "items" | "search" | "watchtower";
  onTab: (tab: "home" | "items" | "search" | "watchtower") => void;
}) {
  const tabs = [
    { id: "home", label: "Home", icon: "home" },
    { id: "items", label: "Items", icon: "apps" },
    { id: "search", label: "Search", icon: "search" },
    { id: "watchtower", label: "Watchtower", icon: "shield-checkmark" },
  ] as const;
  return (
    <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.hairline, backgroundColor: theme.card, paddingBottom: 10, paddingTop: 6 }}>
      {tabs.map((entry) => {
        const active = entry.id === tab;
        return (
          <Pressable key={entry.id} onPress={() => onTab(entry.id)} style={[clickable, { flex: 1, alignItems: "center", gap: 2 }]}>
            <Ionicons name={active ? entry.icon : `${entry.icon}-outline`} size={22} color={active ? theme.accent : theme.textTertiary} />
            <Text style={{ fontSize: 10, color: active ? theme.accent : theme.textTertiary, fontWeight: "600" }}>{entry.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
