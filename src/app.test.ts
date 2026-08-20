import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { decryptJson, encryptJson, generateSecretKey, isValidSecretKey, isWeakPassword, passwordStrength } from "./crypto.ts";
import { fieldsFor, newItem } from "./categories.ts";
import { generatePassword, DEFAULT_GENERATOR } from "./generator.ts";
import {
  duplicateItem,
  emptyDatabase,
  filterItems,
  matchesQuery,
  maybeConvertPasswordToLogin,
  sortItems,
  type VaultItem,
} from "./model.ts";
import { formatTotp, parseTotpSecret, totpAt } from "./totp.ts";
import { analyzeWatchtower } from "./watchtower.ts";

test("secret keys match 1Password-style Emergency Kit format", () => {
  const key = generateSecretKey();
  assert.equal(isValidSecretKey(key), true);
  assert.match(key, /^A3(-[A-Z2-9]{6}){6}$/);
});

test("encrypt then decrypt round-trips a vault", async () => {
  const secret = generateSecretKey();
  const db = emptyDatabase({ name: "Ada", email: "ada@example.com", secretKey: secret });
  const blob = await encryptJson(db, "correct-horse-battery", secret);
  const unlocked = await decryptJson<typeof db>(blob, "correct-horse-battery", secret);
  assert.equal(unlocked.account.email, "ada@example.com");
  assert.equal(unlocked.vaults[0]?.name, "Private");
  await assert.rejects(() => decryptJson(blob, "wrong-password", secret));
});

test("password strength flags common and short secrets", () => {
  assert.equal(passwordStrength("password").label, "Terrible");
  assert.equal(isWeakPassword("abc"), true);
  assert.equal(isWeakPassword("correct-horse-battery-staple-32!"), false);
  assert.ok(passwordStrength("correct-horse-battery-staple-32!").score >= 3);
});

test("generator produces the requested character classes", () => {
  const password = generatePassword({ ...DEFAULT_GENERATOR, mode: "password", length: 32, digits: true, symbols: true });
  assert.equal(password.length, 32);
  assert.match(password, /[A-Za-z]/);
  assert.match(password, /\d/);
  const pin = generatePassword({ ...DEFAULT_GENERATOR, mode: "pin", pinLength: 6 });
  assert.match(pin, /^\d{6}$/);
  const memorable = generatePassword({ ...DEFAULT_GENERATOR, mode: "memorable", words: 4, includeNumber: true });
  assert.equal(memorable.split("-").length, 4);
});

test("TOTP matches RFC 6238 SHA-1 vector", () => {
  // RFC 6238 uses ASCII secret "12345678901234567890"
  // Our generator is base32; verify parse + hotp against node crypto for a known secret.
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32 of 12345678901234567890
  const parsed = parseTotpSecret(secret);
  assert.ok(parsed);
  const result = totpAt(secret, 59 * 1000);
  assert.ok(result);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(1, 4); // T=59, period 30 -> counter 1
  const digest = createHmac("sha1", Buffer.from("12345678901234567890")).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  assert.equal(result.code, String(code % 1_000_000).padStart(6, "0"));
  assert.equal(formatTotp("123456"), "123 456");
});

test("otpauth URIs are accepted as TOTP secrets", () => {
  const parsed = parseTotpSecret("otpauth://totp/GitHub:ada?secret=JBSWY3DPEHPK3PXP&period=30&digits=6");
  assert.equal(parsed?.secret, "JBSWY3DPEHPK3PXP");
});

test("new login items include username, password, and TOTP fields", () => {
  const item = newItem("login", "vault-1");
  assert.equal(item.category, "login");
  assert.deepEqual(
    fieldsFor("login").map((field) => field.id),
    ["username", "password", "totp"],
  );
  assert.equal(item.urls.length, 1);
});

test("password items convert to logins when a username is present", () => {
  const item = newItem("password", "vault-1");
  item.fields = item.fields.map((field) => (field.id === "username" ? { ...field, value: "ada" } : field));
  assert.equal(maybeConvertPasswordToLogin(item).category, "login");
});

test("search and sidebar filters hide archived and deleted items", () => {
  const db = emptyDatabase({ name: "Ada", email: "ada@example.com", secretKey: generateSecretKey() });
  const login = newItem("login", db.vaults[0]!.id);
  login.title = "GitHub";
  login.fields = login.fields.map((field) => (field.id === "username" ? { ...field, value: "ada" } : field));
  const note = newItem("secureNote", db.vaults[0]!.id);
  note.title = "Wi-Fi";
  note.archived = true;
  const trash = newItem("creditCard", db.vaults[0]!.id);
  trash.title = "Visa";
  trash.trashed = true;
  db.items = [login, note, trash];

  assert.equal(filterItems(db, { kind: "all" }, "").length, 1);
  assert.equal(filterItems(db, { kind: "archive" }, "").length, 1);
  assert.equal(filterItems(db, { kind: "trash" }, "").length, 1);
  assert.equal(filterItems(db, { kind: "category", category: "login" }, "github").length, 1);
  assert.equal(matchesQuery(login, "ADA github"), true);
  assert.equal(sortItems(db.items, "title")[0]?.title, "GitHub");
});

test("Watchtower finds reused, weak, http, missing 2FA, and expiring cards", () => {
  const db = emptyDatabase({ name: "Ada", email: "ada@example.com", secretKey: generateSecretKey() });
  const vaultId = db.vaults[0]!.id;
  const weak = newItem("login", vaultId);
  weak.title = "Legacy";
  weak.urls = [{ id: "u1", label: "website", href: "http://legacy.example" }];
  weak.fields = weak.fields.map((field) => {
    if (field.id === "password") return { ...field, value: "password" };
    if (field.id === "username") return { ...field, value: "ada" };
    return field;
  });
  const github = newItem("login", vaultId);
  github.title = "GitHub";
  github.urls = [{ id: "u2", label: "website", href: "https://github.com" }];
  github.fields = github.fields.map((field) => {
    if (field.id === "password") return { ...field, value: "password" };
    if (field.id === "username") return { ...field, value: "ada" };
    return field;
  });
  const card = newItem("creditCard", vaultId);
  card.title = "Visa";
  card.fields = card.fields.map((field) => (field.id === "expiry" ? { ...field, value: "01/2099" } : field));
  const oldCard = newItem("creditCard", vaultId);
  oldCard.title = "Amex";
  oldCard.fields = oldCard.fields.map((field) => (field.id === "expiry" ? { ...field, value: "01/2020" } : field));
  db.items = [weak, github, card, oldCard];

  const report = analyzeWatchtower(db, Date.parse("2026-08-19T00:00:00Z"));
  const ids = Object.fromEntries(report.sections.map((section) => [section.id, section.items.map((hit) => hit.item.title)]));
  assert.ok(ids.reused?.includes("GitHub"));
  assert.ok(ids.weak?.includes("Legacy"));
  assert.ok(ids.unsecured?.includes("Legacy"));
  assert.ok(ids.inactive2fa?.includes("GitHub"));
  assert.ok(ids.expiring?.includes("Amex"));
  assert.ok(!ids.expiring?.includes("Visa"));
  assert.ok(report.issueCount >= 3);
});

test("duplicate item gets a new id and drops favorite/trash state", () => {
  const item = newItem("login", "vault-1") as VaultItem;
  item.title = "Work";
  item.favorite = true;
  const copy = duplicateItem(item);
  assert.notEqual(copy.id, item.id);
  assert.equal(copy.favorite, false);
  assert.match(copy.title, /copy$/);
});
