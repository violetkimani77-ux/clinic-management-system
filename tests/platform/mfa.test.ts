import { generateTotp, totpCounter, verifyTotp } from "@/lib/platform/mfa";

const SECRET = "JBSWY3DPEHPK3PXP";
const PERIOD_MS = 30_000;

describe("platform TOTP", () => {
  const now = 1_700_000_000_000;
  const boundary = Math.floor(now / PERIOD_MS) * PERIOD_MS;

  it("accepts a code generated for the current window and returns that counter", () => {
    const code = generateTotp(SECRET, boundary);
    const result = verifyTotp(SECRET, code, boundary);
    expect(result).toEqual({ ok: true, counter: totpCounter(boundary) });
  });

  it("accepts whitespace-padded 6-digit codes", () => {
    const code = generateTotp(SECRET, boundary);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(SECRET, spaced, boundary).ok).toBe(true);
  });

  it("rejects non-numeric or wrong-length codes without throwing", () => {
    expect(verifyTotp(SECRET, "12345", boundary)).toEqual({ ok: false });
    expect(verifyTotp(SECRET, "abcdef", boundary)).toEqual({ ok: false });
    expect(verifyTotp(SECRET, "", boundary)).toEqual({ ok: false });
  });

  it("accepts a code from the previous 30-second window", () => {
    const code = generateTotp(SECRET, boundary);
    expect(verifyTotp(SECRET, code, boundary + PERIOD_MS).ok).toBe(true);
  });

  it("rejects a code two periods later, outside the ±1 window", () => {
    const code = generateTotp(SECRET, boundary);
    expect(verifyTotp(SECRET, code, boundary + PERIOD_MS * 2)).toEqual({ ok: false });
  });

  it("is stateless: the same valid code verifies twice (replay is the caller's job)", () => {
    const code = generateTotp(SECRET, boundary);
    expect(verifyTotp(SECRET, code, boundary).ok).toBe(true);
    expect(verifyTotp(SECRET, code, boundary).ok).toBe(true);
  });

  it("throws on an invalid base32 secret", () => {
    expect(() => generateTotp("not-base32!!")).toThrow("Invalid TOTP secret.");
  });
});
