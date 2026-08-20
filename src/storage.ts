import AsyncStorage from "@react-native-async-storage/async-storage";
import { decryptJson, encryptJson, type EncryptedBlob } from "./crypto";
import { type Account, type Database } from "./model";

const META_KEY = "keypass.meta.v1";
const BLOB_KEY = "keypass.vault.v1";

export type StoredMeta = {
  name: string;
  email: string;
  secretKey: string;
};

export async function loadMeta(): Promise<StoredMeta | null> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredMeta;
  } catch {
    return null;
  }
}

export async function hasVault(): Promise<boolean> {
  const [meta, blob] = await Promise.all([AsyncStorage.getItem(META_KEY), AsyncStorage.getItem(BLOB_KEY)]);
  return !!meta && !!blob;
}

export async function saveVault(db: Database, password: string): Promise<void> {
  const blob = await encryptJson(db, password, db.account.secretKey);
  const meta: StoredMeta = {
    name: db.account.name,
    email: db.account.email,
    secretKey: db.account.secretKey,
  };
  await AsyncStorage.multiSet([
    [META_KEY, JSON.stringify(meta)],
    [BLOB_KEY, JSON.stringify(blob)],
  ]);
}

export async function unlockVault(password: string): Promise<Database> {
  const [metaRaw, blobRaw] = await Promise.all([AsyncStorage.getItem(META_KEY), AsyncStorage.getItem(BLOB_KEY)]);
  if (!metaRaw || !blobRaw) throw new Error("No vault found");
  const meta = JSON.parse(metaRaw) as StoredMeta;
  const blob = JSON.parse(blobRaw) as EncryptedBlob;
  return decryptJson<Database>(blob, password, meta.secretKey);
}

export async function exportVaultJson(db: Database): Promise<string> {
  return JSON.stringify(db, null, 2);
}

export function parseImportedDatabase(raw: string): Database {
  const parsed = JSON.parse(raw) as Database;
  if (!parsed || parsed.version !== 1 || !parsed.account || !Array.isArray(parsed.items) || !Array.isArray(parsed.vaults)) {
    throw new Error("Not a Keypass vault export");
  }
  return parsed;
}

export async function wipeVault(): Promise<void> {
  await AsyncStorage.multiRemove([META_KEY, BLOB_KEY]);
}

export function accountFromMeta(meta: StoredMeta): Account {
  return { name: meta.name, email: meta.email, secretKey: meta.secretKey };
}
