import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES, activityKcal } from "./activity";

describe("activityKcal", () => {
  it("applies MET × kg × hours", () => {
    expect(activityKcal(3.5, 80, 60)).toBe(280);
    expect(activityKcal(9.8, 70, 30)).toBe(343);
  });
  it("returns 0 for invalid input", () => {
    expect(activityKcal(5, 0, 30)).toBe(0);
    expect(activityKcal(5, 70, -10)).toBe(0);
  });
  it("has unique ids", () => {
    expect(new Set(ACTIVITY_TYPES.map((a) => a.id)).size).toBe(ACTIVITY_TYPES.length);
  });
});
