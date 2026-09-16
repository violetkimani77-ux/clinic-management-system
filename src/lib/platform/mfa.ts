import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const PERIOD_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export type TotpVerifyResult = { ok: true; counter: number } | { ok: false };

function decodeBase32(input: string): Buffer {
  const normalized = input.replace(/[=\s-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpCounter(now = Date.now()): number {
  return Math.floor(now / 1000 / PERIOD_SECONDS);
}

export function generateTotp(secret: string, now = Date.now()): string {
  return hotp(decodeBase32(secret), totpCounter(now));
}

export function verifyTotp(secret: string, providedCode: string, now = Date.now()): TotpVerifyResult {
  const code = providedCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false };

  const key = decodeBase32(secret);
  const counter = totpCounter(now);
  const supplied = Buffer.from(code);

  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    const candidate = counter + offset;
    const expected = Buffer.from(hotp(key, candidate));
    if (timingSafeEqual(expected, supplied)) return { ok: true, counter: candidate };
  }
  return { ok: false };
}
