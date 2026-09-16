import { decryptPlatformSecret, encryptPlatformSecret } from "@/lib/platform/crypto";

const KEY = "ab".repeat(32);

describe("platform secret encryption", () => {
  const previous = process.env.PLATFORM_AUTH_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = previous;
  });

  it("round-trips a secret", () => {
    const payload = encryptPlatformSecret("JBSWY3DPEHPK3PXP");
    expect(payload.startsWith("v1:")).toBe(true);
    expect(decryptPlatformSecret(payload)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces a different ciphertext each time because the IV is random", () => {
    const first = encryptPlatformSecret("same-secret");
    const second = encryptPlatformSecret("same-secret");
    expect(first).not.toBe(second);
    expect(decryptPlatformSecret(first)).toBe("same-secret");
    expect(decryptPlatformSecret(second)).toBe("same-secret");
  });

  it("rejects a tampered authentication tag", () => {
    const payload = encryptPlatformSecret("tamper-me");
    const parts = payload.split(":");
    const tag = Buffer.from(parts[2], "base64url");
    tag[0] ^= 0xff;
    parts[2] = tag.toString("base64url");
    expect(() => decryptPlatformSecret(parts.join(":"))).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptPlatformSecret("not-a-payload")).toThrow("Invalid platform secret payload.");
    expect(() => decryptPlatformSecret("v2:aa:bb:cc")).toThrow("Invalid platform secret payload.");
  });

  it("rejects a missing or non-32-byte encryption key", () => {
    delete process.env.PLATFORM_AUTH_ENCRYPTION_KEY;
    expect(() => encryptPlatformSecret("x")).toThrow("PLATFORM_AUTH_ENCRYPTION_KEY must be a 32-byte hex key.");
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = "abc";
    expect(() => encryptPlatformSecret("x")).toThrow("PLATFORM_AUTH_ENCRYPTION_KEY must be a 32-byte hex key.");
  });
});
