import { describe, it, expect } from "vitest";
import { currentWaiverPeriod } from "../src/lib/waivers/period";

describe("currentWaiverPeriod", () => {
  it("returns the same day when today is Monday (UTC)", () => {
    expect(currentWaiverPeriod(new Date("2026-06-22T03:00:00Z"))).toBe("2026-06-22");
  });
  it("rolls a midweek day forward to the next Monday", () => {
    expect(currentWaiverPeriod(new Date("2026-06-17T20:00:00Z"))).toBe("2026-06-22"); // Wed
  });
  it("rolls Sunday forward to Monday", () => {
    expect(currentWaiverPeriod(new Date("2026-06-21T23:59:00Z"))).toBe("2026-06-22");
  });
});
