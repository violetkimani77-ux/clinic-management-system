import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const PERIOD_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

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

export function verifyTotp(secret: string, providedCode: string, now = Date.now()): boolean {
  const code = providedCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;

  const key = decodeBase32(secret);
  const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
  const supplied = Buffer.from(code);

  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    const expected = Buffer.from(hotp(key, counter + offset));
    if (timingSafeEqual(expected, supplied)) return true;
  }
  return false;
}
