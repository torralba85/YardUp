import { describe, expect, it } from "vitest";
import { Vector2 } from "three";
import { polygonInset } from "./polygonInset";

describe("polygonInset", () => {
  it("insets a rectangular parcel by four feet", () => {
    const result = polygonInset([
      new Vector2(-20, -50),
      new Vector2(20, -50),
      new Vector2(20, 50),
      new Vector2(-20, 50),
    ], 4);

    expect(result).toHaveLength(4);
    expect(result.map((point) => [point.x, point.y])).toEqual([
      [-16, -46],
      [16, -46],
      [16, 46],
      [-16, 46],
    ]);
  });

  it("preserves the result for clockwise input", () => {
    const result = polygonInset([
      new Vector2(-20, -50),
      new Vector2(-20, 50),
      new Vector2(20, 50),
      new Vector2(20, -50),
    ], 4);

    expect(result.map((point) => [Math.abs(point.x), Math.abs(point.y)])).toEqual([
      [16, 46],
      [16, 46],
      [16, 46],
      [16, 46],
    ]);
  });

  it("rejects degenerate boundaries", () => {
    expect(polygonInset([new Vector2(0, 0), new Vector2(1, 0)], 4)).toEqual([]);
  });
});
