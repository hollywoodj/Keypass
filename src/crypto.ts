import { gcm } from "@noble/ciphers/aes";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

export const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 32;
const NONCE_LEN = 12;
const SALT_LEN = 16;

export type EncryptedBlob = {
  v: 1;
  kdf: "pbkdf2-sha256";
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateSecretKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups: string[] = ["A3"];
  for (let g = 0; g < 6; g++) {
    let chunk = "";
    for (let i = 0; i < 6; i++) {
      const idx = getRandomBytes(1)[0]! % alphabet.length;
      chunk += alphabet[idx];
    }
    groups.push(chunk);
  }
  return groups.join("-");
}

export function normalizeSecretKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidSecretKey(value: string): boolean {
  return /^A3(-[A-Z2-9]{6}){6}$/.test(normalizeSecretKey(value));
}

export async function deriveKey(password: string, secretKey: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<Uint8Array> {
  const material = utf8ToBytes(`${password}\n${normalizeSecretKey(secretKey)}`);
  return pbkdf2(sha256, material, salt, { c: iterations, dkLen: KEY_LEN });
}

export async function encryptJson(data: unknown, password: string, secretKey: string, salt?: Uint8Array): Promise<EncryptedBlob> {
  const usedSalt = salt ?? getRandomBytes(SALT_LEN);
  const nonce = getRandomBytes(NONCE_LEN);
  const key = await deriveKey(password, secretKey, usedSalt);
  const aes = gcm(key, nonce);
  const plaintext = utf8ToBytes(JSON.stringify(data));
  const ciphertext = aes.encrypt(plaintext);
  return {
    v: 1,
    kdf: "pbkdf2-sha256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToHex(usedSalt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

export async function decryptJson<T>(blob: EncryptedBlob, password: string, secretKey: string): Promise<T> {
  const salt = hexToBytes(blob.salt);
  const nonce = hexToBytes(blob.nonce);
  const key = await deriveKey(password, secretKey, salt, blob.iterations || PBKDF2_ITERATIONS);
  const aes = gcm(key, nonce);
  const plaintext = aes.decrypt(hexToBytes(blob.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Terrible" | "Weak" | "Fair" | "Good" | "Excellent";
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "123456",
  "12345678",
  "123456789",
  "qwerty",
  "abc123",
  "letmein",
  "iloveyou",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "login",
  "passw0rd",
  "starwars",
  "master",
  "hello",
  "freedom",
  "whatever",
  "qwerty123",
  "trustno1",
]);

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "Terrible" };
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || password.length < 8) return { score: 0, label: "Terrible" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (COMMON_PASSWORDS.has(lower) || /(.)\1{3,}/.test(password) || /0123|1234|abcd|qwer/.test(lower)) score -= 2;
  score = Math.max(0, Math.min(4, score - 1));
  const labels: PasswordStrength["label"][] = ["Terrible", "Weak", "Fair", "Good", "Excellent"];
  return { score: score as PasswordStrength["score"], label: labels[score]! };
}

export function isWeakPassword(password: string): boolean {
  if (!password) return false;
  return passwordStrength(password).score <= 1;
}
