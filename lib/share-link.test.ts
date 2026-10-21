import { describe, expect, it } from "vitest";
import { parseShareParams } from "./share-link";

describe("parseShareParams", () => {
  it("prihvaća poznatu igru i stvaran datum", () => {
    expect(parseShareParams("rijecko", "2026-10-21")?.game.name).toBe("Riječko");
  });
  it("odbija nepoznatu igru, krivi oblik i nepostojeći datum", () => {
    expect(parseShareParams("nepoznato", "2026-10-21")).toBeNull();
    expect(parseShareParams("rijecko", "21.10.2026")).toBeNull();
    expect(parseShareParams("rijecko", "2026-02-31")).toBeNull();
  });
});
