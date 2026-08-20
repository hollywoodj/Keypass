import { TWO_FACTOR_SITES } from "./categories";
import { isWeakPassword } from "./crypto";
import { hostnameOf, isActiveItem, passwordOf, primaryUrlOf, totpSecretOf, type Database, type VaultItem } from "./model";

export type WatchtowerSectionId =
  | "reused"
  | "weak"
  | "unsecured"
  | "inactive2fa"
  | "expiring";

export type WatchtowerHit = {
  item: VaultItem;
  detail: string;
};

export type WatchtowerSection = {
  id: WatchtowerSectionId;
  title: string;
  subtitle: string;
  items: WatchtowerHit[];
};

export type WatchtowerReport = {
  totalActive: number;
  issueCount: number;
  score: number;
  sections: WatchtowerSection[];
};

function parseExpiry(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const monthYear = trimmed.match(/^(\d{1,2})[/-](\d{2}|\d{4})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    let year = Number(monthYear[2]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12) return null;
    return new Date(year, month, 0);
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}

function expiryField(item: VaultItem): string {
  return item.fields.find((field) => field.id === "expiry" || field.id === "expires")?.value ?? "";
}

function isUnsecured(item: VaultItem): boolean {
  const url = primaryUrlOf(item).trim().toLowerCase();
  return url.startsWith("http://");
}

function supportsTwoFactor(item: VaultItem): boolean {
  const host = hostnameOf(primaryUrlOf(item)).toLowerCase();
  if (!host) return false;
  return TWO_FACTOR_SITES.some((site) => host === site || host.endsWith(`.${site}`));
}

export function analyzeWatchtower(db: Database, now = Date.now()): WatchtowerReport {
  const active = db.items.filter(isActiveItem);
  const passwordItems = active.filter((item) => passwordOf(item));
  const byPassword = new Map<string, VaultItem[]>();
  for (const item of passwordItems) {
    const password = passwordOf(item);
    const list = byPassword.get(password) ?? [];
    list.push(item);
    byPassword.set(password, list);
  }

  const reused: WatchtowerHit[] = [];
  for (const [password, items] of byPassword) {
    if (!password || items.length < 2) continue;
    for (const item of items) {
      reused.push({ item, detail: `Used on ${items.length} items` });
    }
  }

  const weak: WatchtowerHit[] = passwordItems
    .filter((item) => isWeakPassword(passwordOf(item)))
    .map((item) => ({ item, detail: "This password is too easy to guess" }));

  const unsecured: WatchtowerHit[] = active
    .filter(isUnsecured)
    .map((item) => ({ item, detail: primaryUrlOf(item) }));

  const inactive2fa: WatchtowerHit[] = active
    .filter((item) => item.category === "login" && supportsTwoFactor(item) && !totpSecretOf(item).trim())
    .map((item) => ({ item, detail: `${hostnameOf(primaryUrlOf(item))} supports two-factor authentication` }));

  const horizon = now + 90 * 24 * 60 * 60 * 1000;
  const expiring: WatchtowerHit[] = active
    .map((item) => {
      const date = parseExpiry(expiryField(item));
      return date ? { item, date } : null;
    })
    .filter((entry): entry is { item: VaultItem; date: Date } => !!entry && entry.date.getTime() <= horizon)
    .map(({ item, date }) => ({
      item,
      detail: date.getTime() < now ? `Expired ${date.toLocaleDateString()}` : `Expires ${date.toLocaleDateString()}`,
    }));

  const sections: WatchtowerSection[] = [
    { id: "reused", title: "Reused passwords", subtitle: "Unique passwords are much harder to crack.", items: reused },
    { id: "weak", title: "Weak passwords", subtitle: "Change these to long, unique passwords.", items: weak },
    { id: "unsecured", title: "Unsecured websites", subtitle: "These sites don’t use HTTPS.", items: unsecured },
    { id: "inactive2fa", title: "Inactive two-factor authentication", subtitle: "Add a one-time password where the site supports it.", items: inactive2fa },
    { id: "expiring", title: "Expiring items", subtitle: "Cards, licenses, and passports nearing expiry.", items: expiring },
  ];

  const uniqueIssueIds = new Set(sections.flatMap((section) => section.items.map((hit) => hit.item.id)));
  const issueCount = uniqueIssueIds.size;
  const totalActive = active.length;
  const score = totalActive === 0 ? 100 : Math.max(5, Math.round((1 - issueCount / Math.max(totalActive, 1)) * 100));

  return { totalActive, issueCount, score, sections };
}
