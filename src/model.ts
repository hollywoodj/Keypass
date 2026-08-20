export type Category =
  | "login"
  | "secureNote"
  | "creditCard"
  | "identity"
  | "password"
  | "document"
  | "apiCredential"
  | "bankAccount"
  | "cryptoWallet"
  | "database"
  | "driverLicense"
  | "emailAccount"
  | "medicalRecord"
  | "membership"
  | "outdoorLicense"
  | "passport"
  | "rewardProgram"
  | "sshKey"
  | "server"
  | "ssn"
  | "softwareLicense"
  | "wirelessRouter";

export type FieldKind =
  | "text"
  | "password"
  | "url"
  | "email"
  | "totp"
  | "monthYear"
  | "concealed"
  | "phone"
  | "date"
  | "textarea"
  | "number"
  | "menu";

export type Field = {
  id: string;
  label: string;
  value: string;
  kind: FieldKind;
  section?: string;
};

export type ItemUrl = {
  id: string;
  label: string;
  href: string;
};

export type VaultItem = {
  id: string;
  vaultId: string;
  category: Category;
  title: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt?: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  useCount: number;
  fields: Field[];
  urls: ItemUrl[];
  iconColor?: string;
  iconLetter?: string;
};

export type Vault = {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
};

export type Account = {
  name: string;
  email: string;
  secretKey: string;
};

export type ThemePreference = "system" | "light" | "dark";

export type Settings = {
  theme: ThemePreference;
  autoLockMinutes: number;
  showCategoriesInSidebar: boolean;
  showTagsInSidebar: boolean;
  showVaultsInSidebar: boolean;
  holdOptionToReveal: boolean;
};

export type PinnedField = {
  itemId: string;
  fieldId: string;
};

export type Database = {
  version: 1;
  account: Account;
  vaults: Vault[];
  items: VaultItem[];
  settings: Settings;
  pinnedFields: PinnedField[];
};

export type SortMode = "title" | "updated" | "created" | "used";

export type NavTarget =
  | { kind: "home" }
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "watchtower" }
  | { kind: "search" }
  | { kind: "generator" }
  | { kind: "category"; category: Category }
  | { kind: "tag"; tag: string }
  | { kind: "vault"; vaultId: string }
  | { kind: "archive" }
  | { kind: "trash" };

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  autoLockMinutes: 10,
  showCategoriesInSidebar: true,
  showTagsInSidebar: true,
  showVaultsInSidebar: true,
  holdOptionToReveal: true,
};

export const VAULT_COLORS = ["#0572EC", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA", "#8E8E93", "#FF3B30"];

export function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function now(): number {
  return Date.now();
}

export function defaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

export function emptyDatabase(account: Account): Database {
  const createdAt = now();
  return {
    version: 1,
    account,
    vaults: [
      {
        id: makeId(),
        name: "Private",
        description: "Your personal vault",
        color: "#0572EC",
        createdAt,
      },
    ],
    items: [],
    settings: defaultSettings(),
    pinnedFields: [],
  };
}

export function fieldValue(item: VaultItem, id: string): string {
  return item.fields.find((field) => field.id === id)?.value ?? "";
}

export function fieldByKind(item: VaultItem, kind: FieldKind): Field | undefined {
  return item.fields.find((field) => field.kind === kind && field.value.trim());
}

export function usernameOf(item: VaultItem): string {
  return fieldValue(item, "username") || fieldValue(item, "email") || "";
}

export function passwordOf(item: VaultItem): string {
  const labeled = item.fields.find((field) => field.id === "password" || field.kind === "password");
  return labeled?.value ?? "";
}

export function totpSecretOf(item: VaultItem): string {
  return item.fields.find((field) => field.kind === "totp")?.value ?? "";
}

export function primaryUrlOf(item: VaultItem): string {
  const fromUrls = item.urls.find((url) => url.href.trim())?.href ?? "";
  if (fromUrls) return fromUrls;
  return fieldValue(item, "website") || fieldValue(item, "url") || "";
}

export function hostnameOf(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? trimmed;
  }
}

export function itemSubtitle(item: VaultItem): string {
  switch (item.category) {
    case "login":
      return usernameOf(item) || hostnameOf(primaryUrlOf(item));
    case "password":
      return hostnameOf(primaryUrlOf(item)) || "Password";
    case "creditCard": {
      const number = fieldValue(item, "number").replace(/\s+/g, "");
      return number ? `•••• ${number.slice(-4)}` : fieldValue(item, "cardholder");
    }
    case "identity":
      return fieldValue(item, "email") || [fieldValue(item, "firstName"), fieldValue(item, "lastName")].filter(Boolean).join(" ");
    case "secureNote":
      return item.notes.split("\n").find((line) => line.trim())?.slice(0, 80) ?? "Secure Note";
    case "bankAccount":
      return fieldValue(item, "bankName") || fieldValue(item, "accountNumber");
    case "softwareLicense":
      return fieldValue(item, "version") || fieldValue(item, "registeredEmail");
    case "wirelessRouter":
      return fieldValue(item, "networkName");
    case "server":
    case "database":
    case "emailAccount":
    case "apiCredential":
      return fieldValue(item, "hostname") || fieldValue(item, "username") || primaryUrlOf(item);
    default:
      return item.fields.find((field) => field.value.trim() && field.kind !== "password")?.value ?? item.notes.split("\n")[0] ?? "";
  }
}

export function itemLetter(item: VaultItem): string {
  if (item.iconLetter) return item.iconLetter.slice(0, 1).toUpperCase();
  const host = hostnameOf(primaryUrlOf(item));
  const source = host || item.title || "?";
  return source.slice(0, 1).toUpperCase();
}

export function allTags(items: VaultItem[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    if (item.trashed) continue;
    for (const tag of item.tags) {
      const cleaned = tag.trim();
      if (cleaned) tags.add(cleaned);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function matchesQuery(item: VaultItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.title,
    item.notes,
    item.category,
    ...item.tags,
    ...item.fields.map((field) => `${field.label} ${field.value}`),
    ...item.urls.map((url) => url.href),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((part) => haystack.includes(part));
}

export function isActiveItem(item: VaultItem): boolean {
  return !item.archived && !item.trashed;
}

export function filterItems(db: Database, nav: NavTarget, query: string): VaultItem[] {
  return db.items.filter((item) => {
    if (nav.kind === "archive") {
      if (!item.archived || item.trashed) return false;
    } else if (nav.kind === "trash") {
      if (!item.trashed) return false;
    } else if (item.archived || item.trashed) {
      return false;
    }

    if (nav.kind === "favorites" && !item.favorite) return false;
    if (nav.kind === "category" && item.category !== nav.category) return false;
    if (nav.kind === "tag" && !item.tags.includes(nav.tag)) return false;
    if (nav.kind === "vault" && item.vaultId !== nav.vaultId) return false;
    return matchesQuery(item, query);
  });
}

export function sortItems(items: VaultItem[], mode: SortMode): VaultItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (mode) {
      case "title":
        return a.title.localeCompare(b.title) || b.updatedAt - a.updatedAt;
      case "created":
        return b.createdAt - a.createdAt;
      case "used":
        return (b.useCount || 0) - (a.useCount || 0) || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
      case "updated":
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
  return copy;
}

export function navTitle(nav: NavTarget, db: Database): string {
  switch (nav.kind) {
    case "home":
      return "Home";
    case "all":
      return "All Items";
    case "favorites":
      return "Favorites";
    case "watchtower":
      return "Watchtower";
    case "search":
      return "Search";
    case "generator":
      return "Password Generator";
    case "category":
      return CATEGORY_TITLES[nav.category];
    case "tag":
      return nav.tag;
    case "vault":
      return db.vaults.find((vault) => vault.id === nav.vaultId)?.name ?? "Vault";
    case "archive":
      return "Archive";
    case "trash":
      return "Recently Deleted";
  }
}

export const CATEGORY_TITLES: Record<Category, string> = {
  login: "Logins",
  secureNote: "Secure Notes",
  creditCard: "Credit Cards",
  identity: "Identities",
  password: "Passwords",
  document: "Documents",
  apiCredential: "API Credentials",
  bankAccount: "Bank Accounts",
  cryptoWallet: "Crypto Wallets",
  database: "Databases",
  driverLicense: "Driver Licenses",
  emailAccount: "Email Accounts",
  medicalRecord: "Medical Records",
  membership: "Memberships",
  outdoorLicense: "Outdoor Licenses",
  passport: "Passports",
  rewardProgram: "Reward Programs",
  sshKey: "SSH Keys",
  server: "Servers",
  ssn: "Social Security Numbers",
  softwareLicense: "Software Licenses",
  wirelessRouter: "Wireless Routers",
};

export const CATEGORY_SINGULAR: Record<Category, string> = {
  login: "Login",
  secureNote: "Secure Note",
  creditCard: "Credit Card",
  identity: "Identity",
  password: "Password",
  document: "Document",
  apiCredential: "API Credential",
  bankAccount: "Bank Account",
  cryptoWallet: "Crypto Wallet",
  database: "Database",
  driverLicense: "Driver License",
  emailAccount: "Email Account",
  medicalRecord: "Medical Record",
  membership: "Membership",
  outdoorLicense: "Outdoor License",
  passport: "Passport",
  rewardProgram: "Reward Program",
  sshKey: "SSH Key",
  server: "Server",
  ssn: "Social Security Number",
  softwareLicense: "Software License",
  wirelessRouter: "Wireless Router",
};

export function maybeConvertPasswordToLogin(item: VaultItem): VaultItem {
  if (item.category !== "password") return item;
  const username = usernameOf(item);
  if (!username.trim()) return item;
  return { ...item, category: "login" };
}

export function touchItem(item: VaultItem): VaultItem {
  return { ...item, lastUsedAt: now(), useCount: (item.useCount || 0) + 1 };
}

export function duplicateItem(item: VaultItem, vaultId?: string): VaultItem {
  const createdAt = now();
  return {
    ...item,
    id: makeId(),
    vaultId: vaultId ?? item.vaultId,
    title: item.title.endsWith(" copy") ? item.title : `${item.title} copy`,
    favorite: false,
    archived: false,
    trashed: false,
    trashedAt: undefined,
    createdAt,
    updatedAt: createdAt,
    lastUsedAt: undefined,
    useCount: 0,
    fields: item.fields.map((field) => ({ ...field, id: field.id })),
    urls: item.urls.map((url) => ({ ...url })),
  };
}
