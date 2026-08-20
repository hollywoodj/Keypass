import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CATEGORIES, categoryMeta, newItem } from "./categories";
import { clickable, font, Hairline, ItemBadge } from "./icons";
import {
  CATEGORY_SINGULAR,
  allTags,
  fieldValue,
  hostnameOf,
  itemLetter,
  itemSubtitle,
  navTitle,
  passwordOf,
  type Category,
  type Database,
  type NavTarget,
  type SortMode,
  type Vault,
  type VaultItem,
} from "./model";
import type { Theme } from "./theme";
import { formatTotp, totpAt } from "./totp";
import { AppText, FieldBox, IconButton, PillButton, SearchField } from "./ui";

export function Sidebar({
  theme,
  db,
  nav,
  collapsed,
  onNavigate,
  onAccount,
  onNewVault,
}: {
  theme: Theme;
  db: Database;
  nav: NavTarget;
  collapsed?: boolean;
  onNavigate: (nav: NavTarget) => void;
  onAccount: () => void;
  onNewVault: () => void;
}) {
  if (collapsed) return null;
  const tags = allTags(db.items);
  const activeCount = (test: (item: VaultItem) => boolean) => db.items.filter((item) => !item.archived && !item.trashed && test(item)).length;
  const selected = (target: NavTarget) => JSON.stringify(target) === JSON.stringify(nav);

  return (
    <View style={{ width: 236, backgroundColor: theme.sidebar }}>
      <Pressable onPress={onAccount} style={({ pressed }) => [clickable, { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, opacity: pressed ? 0.7 : 1 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ItemBadge category="identity" letter={db.account.name.slice(0, 1).toUpperCase()} color="#0572EC" size={28} />
          <View style={{ flex: 1 }}>
            <AppText theme={theme} size={13} weight="700" numberOfLines={1}>
              {db.account.name}
            </AppText>
            <AppText theme={theme} size={11} color={theme.textSecondary} numberOfLines={1}>
              {db.account.email}
            </AppText>
          </View>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </View>
      </Pressable>
      <Hairline theme={theme} />
      <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}>
        <NavRow theme={theme} icon="apps" label="All Items" active={selected({ kind: "all" })} onPress={() => onNavigate({ kind: "all" })} />
        <NavRow theme={theme} icon="star" label="Favorites" active={selected({ kind: "favorites" })} onPress={() => onNavigate({ kind: "favorites" })} />
        <NavRow theme={theme} icon="shield-checkmark" label="Watchtower" active={selected({ kind: "watchtower" })} onPress={() => onNavigate({ kind: "watchtower" })} />

        {db.settings.showCategoriesInSidebar ? (
          <>
            <SectionLabel theme={theme} label="Categories" />
            {CATEGORIES.filter((category) => activeCount((item) => item.category === category.id) > 0 || category.common).map((category) => (
              <NavRow
                key={category.id}
                theme={theme}
                icon={undefined}
                swatch={category.color}
                label={category.title}
                active={selected({ kind: "category", category: category.id })}
                onPress={() => onNavigate({ kind: "category", category: category.id })}
              />
            ))}
          </>
        ) : null}

        {db.settings.showTagsInSidebar && tags.length ? (
          <>
            <SectionLabel theme={theme} label="Tags" />
            {tags.map((tag) => (
              <NavRow
                key={tag}
                theme={theme}
                icon="pricetag"
                label={tag}
                active={selected({ kind: "tag", tag })}
                onPress={() => onNavigate({ kind: "tag", tag })}
              />
            ))}
          </>
        ) : null}

        {db.settings.showVaultsInSidebar ? (
          <>
            <SectionLabel theme={theme} label="Vaults" action="+" onAction={onNewVault} />
            {db.vaults.map((vault) => (
              <NavRow
                key={vault.id}
                theme={theme}
                icon="lock-closed"
                swatch={vault.color}
                label={vault.name}
                active={selected({ kind: "vault", vaultId: vault.id })}
                onPress={() => onNavigate({ kind: "vault", vaultId: vault.id })}
              />
            ))}
          </>
        ) : null}

        <SectionLabel theme={theme} label="" />
        <NavRow theme={theme} icon="archive" label="Archive" active={selected({ kind: "archive" })} onPress={() => onNavigate({ kind: "archive" })} />
        <NavRow theme={theme} icon="trash" label="Recently Deleted" active={selected({ kind: "trash" })} onPress={() => onNavigate({ kind: "trash" })} />
      </ScrollView>
    </View>
  );
}

function SectionLabel({ theme, label, action, onAction }: { theme: Theme; label: string; action?: string; onAction?: () => void }) {
  if (!label && !action) return <View style={{ height: 8 }} />;
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.textTertiary, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Text>
      {action ? (
        <Pressable onPress={onAction} style={clickable}>
          <Text style={{ color: theme.accent, fontWeight: "700" }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NavRow({
  theme,
  icon,
  swatch,
  label,
  active,
  onPress,
}: {
  theme: Theme;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  swatch?: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        clickable,
        {
          marginHorizontal: 8,
          paddingHorizontal: 8,
          height: 30,
          borderRadius: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: active ? theme.selected : pressed ? theme.hairline : "transparent",
        },
      ]}
    >
      {swatch ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: swatch }} /> : null}
      {icon ? <Ionicons name={icon} size={15} color={active ? theme.selectedText : theme.textSecondary} /> : null}
      <Text style={{ fontSize: 13, color: active ? theme.selectedText : theme.text, fontWeight: active ? "600" : "400" }}>{label}</Text>
    </Pressable>
  );
}

export function ItemListPane({
  theme,
  db,
  nav,
  items,
  selectedId,
  query,
  sort,
  fill,
  hideHeader,
  onQuery,
  onSort,
  onSelect,
  onNew,
}: {
  theme: Theme;
  db: Database;
  nav: NavTarget;
  items: VaultItem[];
  selectedId: string | null;
  query: string;
  sort: SortMode;
  fill?: boolean;
  hideHeader?: boolean;
  onQuery: (value: string) => void;
  onSort: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const title = navTitle(nav, db);
  return (
    <View style={{ width: fill ? undefined : 320, flex: fill ? 1 : undefined, backgroundColor: theme.list, borderRightWidth: fill ? 0 : 1, borderRightColor: theme.hairline }}>
      <View style={{ paddingHorizontal: 12, paddingTop: hideHeader ? 0 : 10, paddingBottom: 8, gap: 8 }}>
        {hideHeader ? null : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <AppText theme={theme} size={20} weight="700">
              {title}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconButton name="swap-vertical" theme={theme} color={theme.textSecondary} onPress={onSort} />
              <IconButton name="add" theme={theme} color={theme.accent} onPress={onNew} />
            </View>
          </View>
        )}
        {hideHeader ? null : <SearchField theme={theme} value={query} onChange={onQuery} placeholder="Search" />}
        <AppText theme={theme} size={11} color={theme.textTertiary}>
          {items.length} item{items.length === 1 ? "" : "s"} · sorted by {sortLabel(sort)}
        </AppText>
      </View>
      <Hairline theme={theme} />
      <ScrollView>
        {items.length === 0 ? (
          <View style={{ padding: 28, alignItems: "center" }}>
            <Ionicons name="file-tray-outline" size={36} color={theme.textTertiary} />
            <AppText theme={theme} size={14} color={theme.textSecondary} style={{ marginTop: 10, textAlign: "center" }}>
              {query ? "No items match your search." : "No items in this list yet."}
            </AppText>
          </View>
        ) : (
          items.map((item) => (
            <ItemRow key={item.id} theme={theme} item={item} active={item.id === selectedId} onPress={() => onSelect(item.id)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function sortLabel(sort: SortMode): string {
  return { title: "title", updated: "date modified", created: "date created", used: "frequency" }[sort];
}

function ItemRow({ theme, item, active, onPress }: { theme: Theme; item: VaultItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        clickable,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: active ? theme.selected : pressed ? theme.hairline : "transparent",
        },
      ]}
    >
      <ItemBadge category={item.category} letter={itemLetter(item)} color={item.iconColor} size={32} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "600", color: theme.text }}>
            {item.title || CATEGORY_SINGULAR[item.category]}
          </Text>
          {item.favorite ? <Ionicons name="star" size={12} color="#FFCC00" /> : null}
        </View>
        <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>
          {itemSubtitle(item) || categoryMeta(item.category).singular}
        </Text>
      </View>
    </Pressable>
  );
}

export function ItemDetail({
  theme,
  item,
  vault,
  revealAll,
  onCopy,
  onEdit,
  onMore,
  onOpenUrl,
  onReveal,
  onLargeType,
  onPin,
}: {
  theme: Theme;
  item: VaultItem | null;
  vault?: Vault;
  revealAll: boolean;
  onCopy: (value: string, label: string) => void;
  onEdit: () => void;
  onMore: () => void;
  onOpenUrl: (url: string) => void;
  onReveal: () => void;
  onLargeType: (value: string) => void;
  onPin: (fieldId: string) => void;
}) {
  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <Ionicons name="lock-closed-outline" size={42} color={theme.textTertiary} />
        <AppText theme={theme} size={15} color={theme.textSecondary} style={{ marginTop: 12 }}>
          Select an item to view its details
        </AppText>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 28, paddingBottom: 80 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
        <PillButton label="Edit" theme={theme} onPress={onEdit} />
        <IconButton name="ellipsis-horizontal" theme={theme} onPress={onMore} />
      </View>
      <View style={{ alignItems: "center", marginBottom: 22 }}>
        <ItemBadge category={item.category} letter={itemLetter(item)} color={item.iconColor} size={72} />
        <AppText theme={theme} size={24} weight="700" style={{ marginTop: 12, textAlign: "center" }}>
          {item.title || CATEGORY_SINGULAR[item.category]}
        </AppText>
        <AppText theme={theme} size={13} color={theme.textSecondary} style={{ marginTop: 4 }}>
          {vault?.name ?? "Private"} · {categoryMeta(item.category).singular}
        </AppText>
      </View>

      <View style={{ gap: 8, maxWidth: 560, width: "100%", alignSelf: "center" }}>
        {item.urls.map((url) =>
          url.href.trim() ? (
            <FieldBox key={url.id} theme={theme} label={url.label || "website"} onPress={() => onOpenUrl(url.href)}>
              <Text style={{ color: theme.accent, fontSize: 16 }}>{url.href}</Text>
            </FieldBox>
          ) : null,
        )}
        {item.fields
          .filter((field) => field.value.trim())
          .map((field) => (
            <SecureField
              key={field.id}
              theme={theme}
              label={field.label}
              value={field.value}
              kind={field.kind}
              revealAll={revealAll}
              onCopy={() => onCopy(field.value, field.label)}
              onReveal={onReveal}
              onLargeType={() => onLargeType(field.value)}
              onPin={() => onPin(field.id)}
            />
          ))}
        {item.notes.trim() ? (
          <FieldBox theme={theme} label="notes" onPress={() => onCopy(item.notes, "notes")}>
            <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{item.notes}</Text>
          </FieldBox>
        ) : null}
        {item.tags.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {item.tags.map((tag) => (
              <View key={tag} style={{ backgroundColor: theme.fieldBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <AppText theme={theme} size={11} color={theme.textTertiary} style={{ marginTop: 12 }}>
          created {formatWhen(item.createdAt)} · updated {formatWhen(item.updatedAt)}
        </AppText>
      </View>
    </ScrollView>
  );
}

function SecureField({
  theme,
  label,
  value,
  kind,
  revealAll,
  onCopy,
  onReveal,
  onLargeType,
  onPin,
}: {
  theme: Theme;
  label: string;
  value: string;
  kind: VaultItem["fields"][number]["kind"];
  revealAll: boolean;
  onCopy: () => void;
  onReveal: () => void;
  onLargeType: () => void;
  onPin: () => void;
}) {
  const concealed = kind === "password" || kind === "concealed";
  const [localReveal, setLocalReveal] = useState(false);
  const show = !concealed || revealAll || localReveal;
  const totp = kind === "totp" ? totpAt(value) : null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (kind !== "totp") return;
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [kind]);

  const display = totp ? formatTotp(totp.code) : show ? value : "••••••••••••";

  return (
    <FieldBox theme={theme} label={label} onPress={onCopy}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text
          selectable={show && !totp}
          style={{
            flex: 1,
            color: theme.text,
            fontSize: totp ? 22 : 16,
            fontWeight: totp ? "700" : "500",
            letterSpacing: totp ? 1 : 0,
            fontVariant: concealed && show ? ["tabular-nums"] : undefined,
          }}
        >
          {display}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {totp ? <Countdown progress={totp.progress} remaining={totp.remaining} color={theme.accent} /> : null}
          {concealed ? (
            <IconButton
              name={show ? "eye-off" : "eye"}
              theme={theme}
              size={18}
              color={theme.textSecondary}
              onPress={() => (revealAll ? onReveal() : setLocalReveal((v) => !v))}
            />
          ) : null}
          {concealed || totp ? <IconButton name="expand" theme={theme} size={16} color={theme.textSecondary} onPress={onLargeType} /> : null}
          <IconButton name="pin-outline" theme={theme} size={16} color={theme.textSecondary} onPress={onPin} />
          <IconButton name="copy-outline" theme={theme} size={16} color={theme.textSecondary} onPress={onCopy} />
        </View>
      </View>
    </FieldBox>
  );
}

function Countdown({ progress, remaining, color }: { progress: number; remaining: number; color: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 28 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color, opacity: 0.25, position: "absolute" }} />
      <Text style={{ fontSize: 10, fontWeight: "700", color }}>{remaining}</Text>
    </View>
  );
}

export function ItemEditor({
  theme,
  item,
  vaults,
  onChange,
  onSave,
  onCancel,
  onGeneratePassword,
}: {
  theme: Theme;
  item: VaultItem;
  vaults: Vault[];
  onChange: (item: VaultItem) => void;
  onSave: () => void;
  onCancel: () => void;
  onGeneratePassword: (fieldId: string) => void;
}) {
  const setField = (id: string, value: string) =>
    onChange({ ...item, fields: item.fields.map((field) => (field.id === id ? { ...field, value } : field)) });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 80, maxWidth: 640, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }}>
        <PillButton label="Cancel" theme={theme} onPress={onCancel} />
        <PillButton label="Save" theme={theme} primary onPress={onSave} />
      </View>
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <ItemBadge category={item.category} letter={itemLetter(item)} color={item.iconColor} size={64} />
      </View>
      <LabeledInput theme={theme} label="Title" value={item.title} onChange={(title) => onChange({ ...item, title })} />
      <View style={{ marginTop: 10 }}>
        <AppText theme={theme} size={11} color={theme.textSecondary}>
          vault
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {vaults.map((vault) => (
            <Pressable
              key={vault.id}
              onPress={() => onChange({ ...item, vaultId: vault.id })}
              style={[
                clickable,
                {
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: item.vaultId === vault.id ? theme.accentSoft : theme.fieldBg,
                },
              ]}
            >
              <Text style={{ color: item.vaultId === vault.id ? theme.accent : theme.text, fontWeight: "600", fontSize: 13 }}>{vault.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {item.urls.map((url, index) => (
        <LabeledInput
          key={url.id}
          theme={theme}
          label={url.label || "website"}
          value={url.href}
          onChange={(href) => {
            const urls = item.urls.map((entry, i) => (i === index ? { ...entry, href } : entry));
            onChange({ ...item, urls });
          }}
        />
      ))}
      {item.fields.map((field) => (
        <View key={field.id} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText theme={theme} size={11} color={theme.textSecondary}>
              {field.label}
            </AppText>
            {field.kind === "password" ? (
              <Pressable onPress={() => onGeneratePassword(field.id)} style={clickable}>
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "600" }}>Generate</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            value={field.value}
            onChangeText={(value) => setField(field.id, value)}
            secureTextEntry={field.kind === "password" || field.kind === "concealed"}
            multiline={field.kind === "textarea"}
            placeholder={field.kind === "totp" ? "Secret or otpauth:// URI" : undefined}
            placeholderTextColor={theme.textTertiary}
            style={[editorInput(theme), field.kind === "textarea" ? { height: 88, textAlignVertical: "top" } : null]}
          />
        </View>
      ))}
      <View style={{ marginTop: 10 }}>
        <AppText theme={theme} size={11} color={theme.textSecondary}>
          notes
        </AppText>
        <TextInput
          value={item.notes}
          onChangeText={(notes) => onChange({ ...item, notes })}
          multiline
          placeholder={item.category === "secureNote" ? "Write a secure note. Markdown is supported." : "Notes"}
          placeholderTextColor={theme.textTertiary}
          style={[editorInput(theme), { height: 140, textAlignVertical: "top" }]}
        />
      </View>
      <LabeledInput
        theme={theme}
        label="tags"
        value={item.tags.join(", ")}
        onChange={(value) =>
          onChange({
            ...item,
            tags: value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          })
        }
      />
    </ScrollView>
  );
}

function LabeledInput({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ marginTop: 10 }}>
      <AppText theme={theme} size={11} color={theme.textSecondary}>
        {label}
      </AppText>
      <TextInput value={value} onChangeText={onChange} style={editorInput(theme)} placeholderTextColor={theme.textTertiary} />
    </View>
  );
}

function editorInput(theme: Theme) {
  return {
    marginTop: 4,
    backgroundColor: theme.fieldBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 16,
    fontFamily: font,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  };
}

const SUGGESTED_SITES = [
  { title: "Amazon", href: "https://amazon.com" },
  { title: "Apple", href: "https://apple.com" },
  { title: "Google", href: "https://accounts.google.com" },
  { title: "GitHub", href: "https://github.com" },
  { title: "Facebook", href: "https://facebook.com" },
  { title: "Instagram", href: "https://instagram.com" },
  { title: "LinkedIn", href: "https://linkedin.com" },
  { title: "X", href: "https://x.com" },
  { title: "Netflix", href: "https://netflix.com" },
  { title: "Spotify", href: "https://spotify.com" },
  { title: "Discord", href: "https://discord.com" },
  { title: "Slack", href: "https://slack.com" },
  { title: "Microsoft", href: "https://login.microsoftonline.com" },
  { title: "Dropbox", href: "https://dropbox.com" },
  { title: "PayPal", href: "https://paypal.com" },
  { title: "Cloudflare", href: "https://cloudflare.com" },
];

export function NewItemPicker({
  theme,
  query,
  onQuery,
  onChoose,
}: {
  theme: Theme;
  query: string;
  onQuery: (value: string) => void;
  onChoose: (item: VaultItem) => void;
}) {
  const q = query.trim().toLowerCase();
  const categories = CATEGORIES.filter((category) => !q || category.singular.toLowerCase().includes(q) || category.title.toLowerCase().includes(q));
  const sites = SUGGESTED_SITES.filter((site) => !q || site.title.toLowerCase().includes(q));

  return (
    <View>
      <SearchField theme={theme} value={query} onChange={onQuery} placeholder="Search categories and popular logins" autoFocus />
      {sites.length ? (
        <>
          <AppText theme={theme} size={12} color={theme.textTertiary} style={{ marginTop: 16, marginBottom: 8 }}>
            Popular logins
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {sites.map((site) => (
              <Pressable
                key={site.title}
                onPress={() => {
                  const item = newItem("login", "");
                  onChoose({ ...item, title: site.title, urls: [{ id: item.urls[0]?.id ?? site.title, label: "website", href: site.href }] });
                }}
                style={[clickable, { backgroundColor: theme.fieldBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 120 }]}
              >
                <Text style={{ fontWeight: "600", color: theme.text }}>{site.title}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{hostnameOf(site.href)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <AppText theme={theme} size={12} color={theme.textTertiary} style={{ marginTop: 18, marginBottom: 8 }}>
        Categories
      </AppText>
      <View style={{ gap: 4 }}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => onChoose(newItem(category.id, ""))}
            style={({ pressed }) => [clickable, { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, opacity: pressed ? 0.7 : 1 }]}
          >
            <ItemBadge category={category.id} color={category.color} size={28} />
            <Text style={{ fontSize: 15, color: theme.text }}>{category.singular}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function formatWhen(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

export function LargeType({ value, onClose, theme }: { value: string; onClose: () => void; theme: Theme }) {
  return (
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#fff", fontSize: value.length > 24 ? 36 : 64, fontWeight: "700", textAlign: "center" }}>{value}</Text>
      <Text style={{ color: "#8E8E93", marginTop: 24 }}>Click to close</Text>
    </Pressable>
  );
}

export function passwordPreview(item: VaultItem, revealed: boolean): string {
  const password = passwordOf(item);
  if (!password) return "";
  return revealed ? password : "••••••••";
}

export function fieldValueOrEmpty(item: VaultItem, id: string): string {
  return fieldValue(item, id);
}
