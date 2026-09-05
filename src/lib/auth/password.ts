import "server-only";

import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hashes staff passwords with a salted, memory-hard password KDF.
 *
 * Passwords are never stored or compared as plaintext. The encoded result
 * contains the salt needed to verify the password later.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/** Verifies a password without exposing the stored password hash. */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = storedHash.split(":");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  if (salt.length !== SALT_BYTES || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}
