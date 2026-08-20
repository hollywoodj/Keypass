import { hmac } from "@noble/hashes/hmac";
import { sha1 } from "@noble/hashes/sha1";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function parseTotpSecret(input: string): { secret: string; period: number; digits: number } | null {
  const raw = input.trim();
  if (!raw) return null;
  let secret = raw;
  let period = 30;
  let digits = 6;
  if (raw.toLowerCase().startsWith("otpauth://")) {
    try {
      const url = new URL(raw);
      secret = url.searchParams.get("secret") ?? "";
      period = Number(url.searchParams.get("period") ?? "30") || 30;
      digits = Number(url.searchParams.get("digits") ?? "6") || 6;
    } catch {
      return null;
    }
  }
  const cleaned = secret.replace(/\s+/g, "").toUpperCase().replace(/=+$/g, "");
  if (!cleaned || /[^A-Z2-7]/.test(cleaned)) return null;
  return { secret: cleaned, period, digits };
}

function base32ToBytes(secret: string): Uint8Array {
  let bits = "";
  for (const char of secret) {
    const value = BASE32.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Uint8Array.from(bytes);
}

function hotp(secret: Uint8Array, counter: number, digits: number): string {
  const buffer = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  const digest = hmac(sha1, secret, buffer);
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  const mod = 10 ** digits;
  return String(code % mod).padStart(digits, "0");
}

export type TotpCode = {
  code: string;
  period: number;
  remaining: number;
  progress: number;
};

export function totpAt(secretInput: string, nowMs = Date.now()): TotpCode | null {
  const parsed = parseTotpSecret(secretInput);
  if (!parsed) return null;
  const key = base32ToBytes(parsed.secret);
  if (key.length === 0) return null;
  const seconds = Math.floor(nowMs / 1000);
  const counter = Math.floor(seconds / parsed.period);
  const remaining = parsed.period - (seconds % parsed.period);
  return {
    code: hotp(key, counter, parsed.digits),
    period: parsed.period,
    remaining,
    progress: remaining / parsed.period,
  };
}

export function formatTotp(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}
