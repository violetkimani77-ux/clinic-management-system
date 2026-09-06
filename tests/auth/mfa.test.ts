import {
  createMfaChallengeToken,
  createTotpProvisioningUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  getMfaChallengeExpiry,
  hashMfaChallengeToken,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotp,
} from "@/lib/auth/mfa";

describe("MFA helpers", () => {
  beforeAll(() => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterAll(() => {
    delete process.env.MFA_ENCRYPTION_KEY;
  });

  it("generates a 160-bit Base32 TOTP secret", () => {
    const secret = generateTotpSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret).toHaveLength(32);
  });

  it("verifies RFC 6238 TOTP test vectors within the configured window", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    expect(verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotp(secret, "081804", 1_111_111_109_000)).toBe(true);
    expect(verifyTotp(secret, "000000", 59_000)).toBe(false);
  });

  it("encrypts and decrypts the MFA secret", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret);

    expect(encrypted.split(".")).toHaveLength(3);
    expect(decryptMfaSecret(encrypted)).toBe(secret);
  });

  it("rejects a tampered encrypted MFA secret", () => {
    const encrypted = encryptMfaSecret(generateTotpSecret());
    const [iv, ciphertext, tag] = encrypted.split(".");
    const tampered = `${iv}.${ciphertext.slice(0, -1)}x.${tag}`;

    expect(() => decryptMfaSecret(tampered)).toThrow();
  });

  it("generates unique recovery codes and normalizes formatting", () => {
    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[0-9A-F]{16}$/.test(code))).toBe(true);
    expect(normalizeRecoveryCode(` ${codes[0].slice(0, 4)}-${codes[0].slice(4)} `)).toBe(codes[0]);
  });

  it("hashes recovery codes and challenge tokens deterministically", () => {
    const code = "ABCD1234EF567890";
    const token = createMfaChallengeToken();

    expect(hashRecoveryCode(code)).toBe(hashRecoveryCode("abcd-1234 ef56-7890"));
    expect(hashMfaChallengeToken(token)).toBe(hashMfaChallengeToken(token));
    expect(hashMfaChallengeToken(token)).not.toBe(hashMfaChallengeToken(createMfaChallengeToken()));
  });

  it("creates a TOTP provisioning URI with the expected parameters", () => {
    const uri = createTotpProvisioningUri("JBSWY3DPEHPK3PXP", "staff@example.com");

    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });

  it("creates a challenge expiry five minutes in the future", () => {
    const before = Date.now();
    const expiry = getMfaChallengeExpiry().getTime();
    const after = Date.now();

    expect(expiry).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(after + 5 * 60 * 1000);
  });
});
