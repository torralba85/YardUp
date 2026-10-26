import { expect, it } from "vitest";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { buildConnectionSnapshot, buildLeadPreview } from "./marketplace";
import { calculateFeasibility } from "./feasibility";
import { buildIntakeScenarioJson } from "./advisor-intake";

function snapshot() {
  const { liveParcel: parcel, config, assumptions, pose } = EMAIL_SCENARIO;
  return buildConnectionSnapshot({ parcelKey: "live", parcel: parcel!, config, assumptions,
    result: { ...calculateFeasibility(parcel!, config, assumptions), placementPose: pose },
  });
}

it("retains the address, uncertainty, full assumptions and placed pose in the private layout", () => {
  const value = snapshot();
  const saved = JSON.parse(value.studioScenarioJson!);
  expect(saved).toMatchObject({ liveParcel: { address: EMAIL_SCENARIO.liveParcel!.address },
    pose: EMAIL_SCENARIO.pose, config: EMAIL_SCENARIO.config, assumptions: EMAIL_SCENARIO.assumptions,
  });
  expect(value.parcelCity).toBe("San Diego");
  expect(value.parcelState).toBe("CA");
  expect(value.advisorIntake?.slope).toBe("Not measured");
  const publicPreview = JSON.stringify(buildLeadPreview({ snapshot: value, previewSerial: "LF-EXAMPLE" }));
  expect(publicPreview).not.toContain("studioScenarioJson");
  expect(publicPreview).not.toContain("advisorIntake");
  expect(publicPreview).not.toContain(value.parcel.address);
});

it("does not manufacture a resumable demo for an incomplete real parcel", () => {
  const value = snapshot();
  value.parcel = { ...value.parcel, lat: NaN } as typeof value.parcel;
  expect(buildIntakeScenarioJson(value)).toBeUndefined();
});
