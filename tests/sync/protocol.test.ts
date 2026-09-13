import {
  SYNC_PROTOCOL_VERSION,
  createEmptyCursor,
  normalizePullLimit,
} from "@/lib/sync/protocol";
import { canApplyOffline, getSyncPolicy } from "@/lib/sync/policies";

describe("sync protocol", () => {
  it("uses a stable protocol version and initial cursor", () => {
    expect(SYNC_PROTOCOL_VERSION).toBe(1);
    expect(createEmptyCursor()).toBe("0");
  });

  it("bounds pull requests to a safe server page size", () => {
    expect(normalizePullLimit(undefined)).toBe(100);
    expect(normalizePullLimit(0)).toBe(1);
    expect(normalizePullLimit(600)).toBe(500);
    expect(normalizePullLimit(101.9)).toBe(101);
  });

  it("allows offline registry work but not financial settlement", () => {
    expect(canApplyOffline("Patient", "CREATE")).toBe(true);
    expect(canApplyOffline("Visit", "UPDATE")).toBe(true);
    expect(canApplyOffline("Payment", "CREATE")).toBe(false);
    expect(canApplyOffline("ClinicSubscription", "UPDATE")).toBe(false);
    expect(canApplyOffline("Unknown", "CREATE")).toBe(false);
  });

  it("marks payment as requiring online verification", () => {
    expect(getSyncPolicy("Payment")).toMatchObject({
      requiresOnlineVerification: true,
      offlineCreate: false,
      offlineUpdate: false,
      offlineDelete: false,
    });
  });
});
