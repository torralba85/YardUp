import { describe, expect, it } from "vitest";
import { bedroomClassForFootprint } from "./bedroom";

describe("bedroomClassForFootprint", () => {
  it("maps footprint sizes to HUD bedroom classes", () => {
    expect(bedroomClassForFootprint(400)).toBe("studio");
    expect(bedroomClassForFootprint(600)).toBe("1br");
    expect(bedroomClassForFootprint(800)).toBe("1br");
    expect(bedroomClassForFootprint(1000)).toBe("2br");
  });

  it("clamps below and above the known footprint options", () => {
    expect(bedroomClassForFootprint(350)).toBe("studio");
    expect(bedroomClassForFootprint(1500)).toBe("2br");
  });
});
