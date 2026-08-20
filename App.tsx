import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { CATEGORIES } from "./src/categories";
import { clickable, Hairline } from "./src/icons";
import { ItemDetail, ItemEditor, ItemListPane, LargeType, NewItemPicker, Sidebar } from "./src/items";
import { EmergencyKit, GeneratorPanel, HomeScreen, MobileTabs, QuickAccess, SettingsScreen, WatchtowerScreen } from "./src/extras";
import { LockScreen, SetupFlow } from "./src/lock";
import {
  duplicateItem,
  emptyDatabase,
  filterItems,
  maybeConvertPasswordToLogin,
  now,
  passwordOf,
  primaryUrlOf,
  sortItems,
  totpSecretOf,
  touchItem,
  usernameOf,
  VAULT_COLORS,
  type Database,
  type NavTarget,
  type SortMode,
  type VaultItem,
  makeId,
} from "./src/model";
import { hasVault, loadMeta, parseImportedDatabase, saveVault, unlockVault } from "./src/storage";
import { resolveTheme } from "./src/theme";
import { totpAt } from "./src/totp";
import { AppText, PillButton, SearchField, Sheet, Toast } from "./src/ui";
import { analyzeWatchtower } from "./src/watchtower";
import type { MenuCommand } from "./src/commands";
import { shortcut } from "./src/platform";

type PhoneTab = "home" | "items" | "search" | "watchtower";

export default function App() {
  const system = useColorScheme();
  const { width } = useWindowDimensions();
  const compact = width < 820;

  const [booted, setBooted] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [metaName, setMetaName] = useState("");
  const [metaEmail, setMetaEmail] = useState("");
  const [locked, setLocked] = useState(true);
  const [password, setPassword] = useState<string | null>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nav, setNav] = useState<NavTarget>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("title");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VaultItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorField, setGeneratorField] = useState<string | null>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showVaultPrompt, setShowVaultPrompt] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [largeType, setLargeType] = useState<string | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [phoneTab, setPhoneTab] = useState<PhoneTab>("home");
  const [phoneList, setPhoneList] = useState(false);
  const lastActivity = useRef(Date.now());
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = resolveTheme(db?.settings.theme ?? "system", system);

  useEffect(() => {
    (async () => {
      const exists = await hasVault();
      setHasAccount(exists);
      if (exists) {
        const meta = await loadMeta();
        if (meta) {
          setMetaName(meta.name);
          setMetaEmail(meta.email);
        }
      }
      setBooted(true);
    })();
  }, []);

  const persist = useCallback(
    async (next: Database, secret = password) => {
      if (!secret) return;
      await saveVault(next, secret);
    },
    [password],
  );

  const updateDb = useCallback(
    (updater: (current: Database) => Database) => {
      setDb((current) => {
        if (!current) return current;
        const next = updater(current);
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => {
          persist(next).catch(() => setToast("Couldn’t save vault"));
        }, 200);
        return next;
      });
    },
    [persist],
  );

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 1600);
  }, []);

  const copyText = useCallback(
    async (value: string, label: string) => {
      if (!value) return;
      await Clipboard.setStringAsync(value);
      flash(`Copied ${label}`);
      lastActivity.current = Date.now();
    },
    [flash],
  );

  const selected = db?.items.find((item) => item.id === selectedId) ?? null;
  const items = useMemo(() => {
    if (!db) return [];
    return sortItems(filterItems(db, nav.kind === "home" || nav.kind === "search" || nav.kind === "watchtower" || nav.kind === "generator" ? { kind: "all" } : nav, query), sort);
  }, [db, nav, query, sort]);

  const watchtower = useMemo(() => (db ? analyzeWatchtower(db) : null), [db]);

  const currentVaultId = nav.kind === "vault" ? nav.vaultId : db?.vaults[0]?.id ?? "";

  const openItem = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPhoneList(true);
      setDraft(null);
      updateDb((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === id ? touchItem(item) : item)),
      }));
    },
    [updateDb],
  );

  const startNew = useCallback(
    (partial: VaultItem) => {
      if (!db) return;
      const item = { ...partial, vaultId: partial.vaultId || currentVaultId || db.vaults[0]!.id };
      setDraft(item);
      setSelectedId(item.id);
      setShowNew(false);
      setNewQuery("");
      setPhoneList(true);
    },
    [currentVaultId, db],
  );

  const saveDraft = useCallback(() => {
    if (!draft) return;
    const item = maybeConvertPasswordToLogin({ ...draft, title: draft.title.trim() || "Untitled", updatedAt: now() });
    updateDb((current) => {
      const exists = current.items.some((entry) => entry.id === item.id);
      return { ...current, items: exists ? current.items.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...current.items] };
    });
    setSelectedId(item.id);
    setDraft(null);
    flash("Saved");
  }, [draft, flash, updateDb]);

  const mutateSelected = useCallback(
    (mapper: (item: VaultItem) => VaultItem) => {
      if (!selectedId) return;
      updateDb((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === selectedId ? mapper({ ...item, updatedAt: now() }) : item)),
      }));
    },
    [selectedId, updateDb],
  );

  const lock = useCallback(() => {
    setPassword(null);
    setDb(null);
    setLocked(true);
    setDraft(null);
    setRevealAll(false);
    setShowQuick(false);
    setShowSettings(false);
  }, []);

  useEffect(() => {
    if (!db || locked) return;
    const minutes = db.settings.autoLockMinutes || 10;
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > minutes * 60_000) lock();
    }, 5000);
    return () => clearInterval(timer);
  }, [db, lock, locked]);

  const openUrl = useCallback((url: string) => {
    const href = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) ? url : `https://${url}`;
    if (typeof window !== "undefined" && window.keypass?.openExternal) window.keypass.openExternal(href);
    else Linking.openURL(href);
  }, []);

  const handleCommand = useCallback(
    (command: MenuCommand) => {
      lastActivity.current = Date.now();
      switch (command.type) {
        case "newItem":
          setShowNew(true);
          break;
        case "newVault":
          setShowVaultPrompt(true);
          break;
        case "lock":
          lock();
          break;
        case "settings":
          setShowSettings(true);
          break;
        case "search":
          if (compact) setPhoneTab("search");
          break;
        case "edit":
          if (selected) setDraft({ ...selected });
          break;
        case "save":
          saveDraft();
          break;
        case "cancel":
          setDraft(null);
          break;
        case "copyUsername":
          if (selected) copyText(usernameOf(selected), "username");
          break;
        case "copyPassword":
          if (selected) copyText(passwordOf(selected), "password");
          break;
        case "copyTotp": {
          if (!selected) break;
          const code = totpAt(totpSecretOf(selected))?.code;
          if (code) copyText(code, "one-time password");
          break;
        }
        case "favorite":
          mutateSelected((item) => ({ ...item, favorite: !item.favorite }));
          break;
        case "archive":
          mutateSelected((item) => ({ ...item, archived: true }));
          flash("Archived");
          break;
        case "delete":
          mutateSelected((item) => ({ ...item, trashed: true, trashedAt: now(), archived: false }));
          flash("Moved to Recently Deleted");
          break;
        case "duplicate":
          if (selected) {
            const copy = duplicateItem(selected);
            updateDb((current) => ({ ...current, items: [copy, ...current.items] }));
            openItem(copy.id);
          }
          break;
        case "reveal":
          setRevealAll((value) => !value);
          break;
        case "quickAccess":
          setShowQuick((value) => !value);
          break;
        case "generator":
          setShowGenerator(true);
          break;
        case "allItems":
          setNav({ kind: "all" });
          break;
        case "favorites":
          setNav({ kind: "favorites" });
          break;
        case "watchtower":
          setNav({ kind: "watchtower" });
          break;
        case "toggleSidebar":
          setSidebarCollapsed((value) => !value);
          break;
        case "openWebsite":
          if (selected) {
            const url = primaryUrlOf(selected);
            if (url) openUrl(url);
          }
          break;
        case "export":
          if (db) copyText(JSON.stringify(db, null, 2), "vault export");
          break;
        case "import":
          if (Platform.OS === "web") {
            const raw = window.prompt("Paste a Keypass vault JSON export");
            if (!raw) break;
            try {
              const imported = parseImportedDatabase(raw);
              updateDb(() => imported);
              flash("Imported vault");
            } catch {
              flash("Invalid vault file");
            }
          }
          break;
        case "shortcuts":
          setShowShortcuts(true);
          break;
      }
    },
    [compact, copyText, db, flash, lock, mutateSelected, openItem, openUrl, saveDraft, selected, updateDb],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.keypass) return;
    return window.keypass.onMenuCommand(handleCommand);
  }, [handleCommand]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.keypass || !db) return;
    window.keypass.setWindowTitle("Keypass");
  }, [db]);

  useEffect(() => {
    if (locked || !db) return;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (event.key === " " && event.shiftKey && meta) {
        event.preventDefault();
        handleCommand({ type: "quickAccess" });
      } else if (event.key.toLowerCase() === "l" && event.shiftKey && meta) {
        event.preventDefault();
        handleCommand({ type: "lock" });
      } else if (event.key.toLowerCase() === "n" && meta) {
        event.preventDefault();
        handleCommand({ type: "newItem" });
      } else if (event.key.toLowerCase() === "e" && meta) {
        event.preventDefault();
        handleCommand({ type: "edit" });
      } else if (event.key.toLowerCase() === "s" && meta) {
        event.preventDefault();
        handleCommand({ type: "save" });
      } else if (event.key.toLowerCase() === "f" && meta) {
        event.preventDefault();
        handleCommand({ type: "search" });
      } else if (event.key.toLowerCase() === "c" && meta && event.shiftKey) {
        event.preventDefault();
        handleCommand({ type: "copyPassword" });
      } else if (event.key.toLowerCase() === "c" && meta && event.altKey) {
        event.preventDefault();
        handleCommand({ type: "copyTotp" });
      } else if (event.key.toLowerCase() === "c" && meta && !draft) {
        const sel = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
        if (!sel) {
          event.preventDefault();
          handleCommand({ type: "copyUsername" });
        }
      } else if (event.key.toLowerCase() === "r" && meta) {
        event.preventDefault();
        handleCommand({ type: "reveal" });
      } else if (event.key.toLowerCase() === "d" && event.shiftKey && meta) {
        event.preventDefault();
        handleCommand({ type: "toggleSidebar" });
      } else if (event.key.toLowerCase() === "," && meta) {
        event.preventDefault();
        handleCommand({ type: "settings" });
      } else if (event.key === "/" && meta) {
        event.preventDefault();
        handleCommand({ type: "shortcuts" });
      } else if (event.key === "Escape") {
        if (showQuick) setShowQuick(false);
        else if (draft) setDraft(null);
        else if (query) setQuery("");
      } else if (event.key === "Backspace" && meta) {
        handleCommand({ type: "delete" });
      } else if (event.key === "Backspace" && !meta && !draft) {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        handleCommand({ type: "archive" });
      } else if (event.altKey && db.settings.holdOptionToReveal) {
        setRevealAll(true);
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.key === "Alt" && db.settings.holdOptionToReveal) setRevealAll(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [db, draft, handleCommand, locked, query, showQuick]);

  const onUnlock = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const vault = await unlockVault(value);
      setDb(vault);
      setPassword(value);
      setLocked(false);
      lastActivity.current = Date.now();
    } catch {
      setError("Incorrect account password");
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (input: { name: string; email: string; password: string; secretKey: string }) => {
    setBusy(true);
    setError(null);
    try {
      const vault = emptyDatabase({ name: input.name, email: input.email, secretKey: input.secretKey });
      await saveVault(vault, input.password);
      setDb(vault);
      setPassword(input.password);
      setHasAccount(true);
      setLocked(false);
      setMetaName(input.name);
      setMetaEmail(input.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t create account");
    } finally {
      setBusy(false);
    }
  };

  const createVault = () => {
    const name = vaultName.trim();
    if (!name || !db) return;
    const vault = { id: makeId(), name, description: "", color: VAULT_COLORS[db.vaults.length % VAULT_COLORS.length]!, createdAt: now() };
    updateDb((current) => ({ ...current, vaults: [...current.vaults, vault] }));
    setVaultName("");
    setShowVaultPrompt(false);
    setNav({ kind: "vault", vaultId: vault.id });
  };

  if (!booted) {
    return <View style={{ flex: 1, backgroundColor: theme.lockBg }} />;
  }

  if (!hasAccount) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.lockBg }}>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <SetupFlow theme={theme} busy={busy} error={error} onCreate={onCreate} />
      </SafeAreaView>
    );
  }

  if (locked || !db) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.lockBg }}>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <LockScreen theme={theme} name={metaName} email={metaEmail} error={error} busy={busy} onUnlock={onUnlock} />
      </SafeAreaView>
    );
  }

  const detailItem = draft ?? selected;
  const vault = db.vaults.find((entry) => entry.id === detailItem?.vaultId);

  const moreActions = [
    { label: selected?.favorite ? "Remove from Favorites" : "Add to Favorites", run: () => handleCommand({ type: "favorite" }) },
    { label: "Duplicate", run: () => handleCommand({ type: "duplicate" }) },
    { label: selected?.archived ? "Restore Item" : "Archive Item", run: () => mutateSelected((item) => ({ ...item, archived: !item.archived })) },
    { label: selected?.trashed ? "Restore Item" : "Delete", run: () => mutateSelected((item) => (item.trashed ? { ...item, trashed: false, trashedAt: undefined } : { ...item, trashed: true, trashedAt: now() })) },
    { label: "Copy Username", run: () => handleCommand({ type: "copyUsername" }) },
    { label: "Copy Password", run: () => handleCommand({ type: "copyPassword" }) },
  ];

  const desktopMain =
    nav.kind === "watchtower" && watchtower ? (
      <WatchtowerScreen theme={theme} report={watchtower} onOpenItem={(id) => { setNav({ kind: "all" }); openItem(id); }} />
    ) : (
      <View style={{ flex: 1, flexDirection: "row" }}>
        <ItemListPane
          theme={theme}
          db={db}
          nav={nav}
          items={items}
          selectedId={selectedId}
          query={query}
          sort={sort}
          onQuery={setQuery}
          onSort={() => setSort((current) => (current === "title" ? "updated" : current === "updated" ? "created" : current === "created" ? "used" : "title"))}
          onSelect={openItem}
          onNew={() => setShowNew(true)}
        />
        {draft ? (
          <ItemEditor
            theme={theme}
            item={draft}
            vaults={db.vaults}
            onChange={setDraft}
            onSave={saveDraft}
            onCancel={() => setDraft(null)}
            onGeneratePassword={(fieldId) => {
              setGeneratorField(fieldId);
              setShowGenerator(true);
            }}
          />
        ) : (
          <ItemDetail
            theme={theme}
            item={detailItem}
            vault={vault}
            revealAll={revealAll}
            onCopy={copyText}
            onEdit={() => selected && setDraft({ ...selected })}
            onMore={() => setShowMore(true)}
            onOpenUrl={openUrl}
            onReveal={() => setRevealAll((value) => !value)}
            onLargeType={setLargeType}
            onPin={(fieldId) => {
              if (!selected) return;
              updateDb((current) => ({
                ...current,
                pinnedFields: current.pinnedFields.some((pin) => pin.itemId === selected.id && pin.fieldId === fieldId)
                  ? current.pinnedFields.filter((pin) => !(pin.itemId === selected.id && pin.fieldId === fieldId))
                  : [...current.pinnedFields, { itemId: selected.id, fieldId }],
              }));
              flash("Pinned to Home");
            }}
          />
        )}
      </View>
    );

  const phoneBody = (() => {
    if (draft) {
      return (
        <ItemEditor
          theme={theme}
          item={draft}
          vaults={db.vaults}
          onChange={setDraft}
          onSave={saveDraft}
          onCancel={() => setDraft(null)}
          onGeneratePassword={(fieldId) => {
            setGeneratorField(fieldId);
            setShowGenerator(true);
          }}
        />
      );
    }
    if (selected && (phoneTab !== "home" || phoneList) && phoneTab !== "watchtower" && (phoneTab === "items" || phoneTab === "search" || phoneList)) {
      if (phoneTab === "items" && phoneList && selected) {
        return (
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => { setSelectedId(null); }} style={[clickable, { padding: 12 }]}>
              <AppText theme={theme} color={theme.accent}>‹ Items</AppText>
            </Pressable>
            <ItemDetail
              theme={theme}
              item={selected}
              vault={vault}
              revealAll={revealAll}
              onCopy={copyText}
              onEdit={() => setDraft({ ...selected })}
              onMore={() => setShowMore(true)}
              onOpenUrl={openUrl}
              onReveal={() => setRevealAll((value) => !value)}
              onLargeType={setLargeType}
              onPin={(fieldId) => {
                updateDb((current) => ({ ...current, pinnedFields: [...current.pinnedFields, { itemId: selected.id, fieldId }] }));
                flash("Pinned to Home");
              }}
            />
          </View>
        );
      }
    }
    if (phoneTab === "home") {
      return (
        <HomeScreen
          theme={theme}
          db={db}
          onOpenItem={(id) => {
            setPhoneTab("items");
            setPhoneList(true);
            openItem(id);
          }}
          onNavigateCategory={(category) => {
            setNav({ kind: "category", category });
            setPhoneTab("items");
            setPhoneList(true);
            setSelectedId(null);
          }}
        />
      );
    }
    if (phoneTab === "watchtower" && watchtower) {
      return (
        <WatchtowerScreen
          theme={theme}
          report={watchtower}
          onOpenItem={(id) => {
            setPhoneTab("items");
            setPhoneList(true);
            openItem(id);
          }}
        />
      );
    }
    if (phoneTab === "search") {
      const results = sortItems(filterItems(db, { kind: "all" }, query), "title");
      return (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 10 }}>
            <AppText theme={theme} size={32} weight="700">Search</AppText>
            <SearchField theme={theme} value={query} onChange={setQuery} placeholder="Search items, tags, and vaults" autoFocus />
          </View>
          <ItemListPane
            theme={theme}
            db={db}
            nav={{ kind: "search" }}
            items={results}
            selectedId={selectedId}
            query={query}
            sort={sort}
            fill
            hideHeader
            onQuery={setQuery}
            onSort={() => undefined}
            onSelect={(id) => {
              setPhoneTab("items");
              setPhoneList(true);
              openItem(id);
            }}
            onNew={() => setShowNew(true)}
          />
        </View>
      );
    }
    if (phoneTab === "items" && !phoneList) {
      return (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText theme={theme} size={32} weight="700">Items</AppText>
            <Pressable onPress={() => setShowSettings(true)} style={clickable}>
              <AppText theme={theme} color={theme.accent}>Account</AppText>
            </Pressable>
          </View>
          {[
            { label: "All Items", target: { kind: "all" } as NavTarget },
            { label: "Favorites", target: { kind: "favorites" } as NavTarget },
            ...CATEGORIES.filter((category) => category.common).map((category) => ({ label: category.title, target: { kind: "category", category: category.id } as NavTarget })),
            ...db.vaults.map((entry) => ({ label: entry.name, target: { kind: "vault", vaultId: entry.id } as NavTarget })),
            { label: "Archive", target: { kind: "archive" } as NavTarget },
            { label: "Recently Deleted", target: { kind: "trash" } as NavTarget },
          ].map((row) => (
            <Pressable
              key={row.label}
              onPress={() => {
                setNav(row.target);
                setPhoneList(true);
                setSelectedId(null);
              }}
              style={[clickable, { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.hairline }]}
            >
              <Text style={{ fontSize: 17, color: theme.text }}>{row.label}</Text>
            </Pressable>
          ))}
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <Pressable onPress={() => { setPhoneList(false); setSelectedId(null); }} style={[clickable, { padding: 12 }]}>
          <AppText theme={theme} color={theme.accent}>‹ Items</AppText>
        </Pressable>
        {selected ? (
          <ItemDetail
            theme={theme}
            item={selected}
            vault={vault}
            revealAll={revealAll}
            onCopy={copyText}
            onEdit={() => setDraft({ ...selected })}
            onMore={() => setShowMore(true)}
            onOpenUrl={openUrl}
            onReveal={() => setRevealAll((value) => !value)}
            onLargeType={setLargeType}
            onPin={(fieldId) => {
              updateDb((current) => ({ ...current, pinnedFields: [...current.pinnedFields, { itemId: selected.id, fieldId }] }));
              flash("Pinned to Home");
            }}
          />
        ) : (
          <ItemListPane
            theme={theme}
            db={db}
            nav={nav}
            items={items}
            selectedId={selectedId}
            query={query}
            sort={sort}
            fill
            onQuery={setQuery}
            onSort={() => setSort((current) => (current === "title" ? "updated" : "title"))}
            onSelect={openItem}
            onNew={() => setShowNew(true)}
          />
        )}
      </View>
    );
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} onTouchStart={() => { lastActivity.current = Date.now(); }}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {compact ? (
        <View style={{ flex: 1 }}>
          {phoneBody}
          <MobileTabs
            theme={theme}
            tab={phoneTab}
            onTab={(tab) => {
              setPhoneTab(tab);
              setPhoneList(false);
              if (tab === "items") setNav({ kind: "all" });
              if (tab === "search") setQuery("");
            }}
          />
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Sidebar
            theme={theme}
            db={db}
            nav={nav}
            collapsed={sidebarCollapsed}
            onNavigate={(target) => {
              setNav(target);
              setSelectedId(null);
              setDraft(null);
            }}
            onAccount={() => setShowSettings(true)}
            onNewVault={() => setShowVaultPrompt(true)}
          />
          <Hairline theme={theme} vertical />
          {desktopMain}
        </View>
      )}

      <Toast message={toast} theme={theme} />

      <Sheet visible={showNew} onClose={() => setShowNew(false)} theme={theme} title="New Item">
        <NewItemPicker theme={theme} query={newQuery} onQuery={setNewQuery} onChoose={startNew} />
      </Sheet>
      <Sheet visible={showSettings} onClose={() => setShowSettings(false)} theme={theme} title="Settings">
        <SettingsScreen theme={theme} db={db} onChange={(settings) => updateDb((current) => ({ ...current, settings }))} onLock={lock} onShowKit={() => setShowKit(true)} />
      </Sheet>
      <Sheet visible={showGenerator} onClose={() => setShowGenerator(false)} theme={theme} title="Password Generator">
        <GeneratorPanel
          theme={theme}
          onUse={(value) => {
            if (draft && generatorField) {
              setDraft({ ...draft, fields: draft.fields.map((field) => (field.id === generatorField ? { ...field, value } : field)) });
            } else {
              copyText(value, "password");
            }
            setShowGenerator(false);
            setGeneratorField(null);
          }}
        />
      </Sheet>
      <Sheet visible={showKit} onClose={() => setShowKit(false)} theme={theme} title="Emergency Kit">
        <EmergencyKit theme={theme} db={db} />
      </Sheet>
      <Sheet visible={showMore} onClose={() => setShowMore(false)} theme={theme} title="Item" width={360}>
        {moreActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              action.run();
              setShowMore(false);
            }}
            style={[clickable, { paddingVertical: 12 }]}
          >
            <Text style={{ fontSize: 16, color: theme.text }}>{action.label}</Text>
          </Pressable>
        ))}
      </Sheet>
      <Sheet visible={showShortcuts} onClose={() => setShowShortcuts(false)} theme={theme} title="Keyboard Shortcuts">
        {[
          [shortcut("⌘N", "Ctrl+N"), "New Item"],
          [shortcut("⌘E", "Ctrl+E"), "Edit"],
          [shortcut("⌘S", "Ctrl+S"), "Save"],
          [shortcut("⌘F", "Ctrl+F"), "Search"],
          [shortcut("⌘C", "Ctrl+C"), "Copy username"],
          [shortcut("⇧⌘C", "Ctrl+Shift+C"), "Copy password"],
          [shortcut("⌥⌘C", "Ctrl+Alt+C"), "Copy one-time password"],
          [shortcut("⌘R", "Ctrl+R"), "Reveal secure fields"],
          [shortcut("⇧⌘L", "Ctrl+Shift+L"), "Lock"],
          [shortcut("⇧⌘Space", "Ctrl+Shift+Space"), "Quick Access"],
          [shortcut("⇧⌘D", "Ctrl+Shift+D"), "Show or hide sidebar"],
          [shortcut("⌘,", "Ctrl+,"), "Settings"],
        ].map(([key, label]) => (
          <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
            <Text style={{ color: theme.text }}>{label}</Text>
            <Text style={{ color: theme.textSecondary }}>{key}</Text>
          </View>
        ))}
      </Sheet>
      <Sheet visible={showVaultPrompt} onClose={() => setShowVaultPrompt(false)} theme={theme} title="New Vault" width={400}>
        <TextInput value={vaultName} onChangeText={setVaultName} placeholder="Vault name" placeholderTextColor={theme.textTertiary} style={{ backgroundColor: theme.fieldBg, borderRadius: 10, padding: 12, color: theme.text }} />
        <View style={{ marginTop: 14, alignItems: "flex-end" }}>
          <PillButton label="Create" theme={theme} primary onPress={createVault} disabled={!vaultName.trim()} />
        </View>
      </Sheet>

      <Modal visible={showQuick} transparent animationType="fade" onRequestClose={() => setShowQuick(false)}>
        <QuickAccess
          theme={theme}
          items={db.items}
          onClose={() => setShowQuick(false)}
          onOpen={(id) => {
            setShowQuick(false);
            setNav({ kind: "all" });
            openItem(id);
          }}
          onCopyUser={(item) => copyText(usernameOf(item), "username")}
          onCopyPassword={(item) => copyText(passwordOf(item), "password")}
        />
      </Modal>
      <Modal visible={!!largeType} transparent animationType="fade" onRequestClose={() => setLargeType(null)}>
        {largeType ? <LargeType value={largeType} onClose={() => setLargeType(null)} theme={theme} /> : null}
      </Modal>
    </SafeAreaView>
  );
}
