import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { FeasibilityBadge } from "./FeasibilityBadge";
import { parcelPresets } from "@/lib/feasibility";

const californiaParcel = { ...parcelPresets[0], state: "CA" } as typeof parcelPresets[0];

it("rotates its disclosure chevron from its own details element", () => {
  const { container } = render(
    <FeasibilityBadge parcel={californiaParcel} config={{ footprint: 600, width: 20, length: 30 }} surface="light" />,
  );
  const details = container.querySelector("details");
  const openVariants = container.querySelectorAll('[class*="group-open:"]');

  expect(details).not.toBeNull();
  expect(openVariants.length).toBeGreaterThan(0);
  // A `group-open:` utility only fires under an ancestor marked `group`.
  for (const element of Array.from(openVariants)) expect(element.closest("details.group")).toBe(details);
});
