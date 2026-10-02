import { describe, expect, it } from "vitest";
import {
  MAX_CAMERA_HEIGHT_M,
  MAX_PITCH_DEG,
  MIN_CAMERA_HEIGHT_M,
  MIN_PITCH_DEG,
  RECENTER_HEIGHT_M,
  RECENTER_PITCH_DEG,
  ROTATE_STEP_DEG,
  TILT_STEP_DEG,
  ZOOM_STEP_FRACTION,
  applyCameraStep,
  enuFrameFromMatrix,
  headingDeg,
  pitchDeg,
  planCameraStep,
  poseToLocal,
  poseToWorld,
  recenterPose,
  viewTarget,
  type CameraPose,
  type NeighborhoodCameraStep,
  type Vec3,
} from "./neighborhood-camera";

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function step(pose: CameraPose, action: NeighborhoodCameraStep): CameraPose {
  const plan = planCameraStep(pose, action);
  expect(plan).not.toBeNull();
  return applyCameraStep(pose, plan!);
}

function expectVecClose(actual: Vec3, expected: Vec3, digits = 6) {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
}

describe("recenterPose", () => {
  it("frames the property from the south, centred on screen", () => {
    const pose = recenterPose();
    expect(pose.position.z).toBeCloseTo(RECENTER_HEIGHT_M, 6);
    expect(pose.position.y).toBeLessThan(0);
    expect(headingDeg(pose)).toBeCloseTo(0, 6);
    expect(pitchDeg(pose)).toBeCloseTo(RECENTER_PITCH_DEG, 6);
    // Centred: the screen-centre ground point is the property itself.
    expectVecClose(viewTarget(pose), { x: 0, y: 0, z: 0 });
  });
});

describe("rotate", () => {
  it("turns the map counterclockwise by raising the heading, orbiting the screen centre", () => {
    const start = recenterPose();
    const turned = step(start, "rotate-ccw");
    expect(headingDeg(turned)).toBeCloseTo(ROTATE_STEP_DEG, 6);
    expect(pitchDeg(turned)).toBeCloseTo(pitchDeg(start), 6);
    expect(turned.position.z).toBeCloseTo(start.position.z, 6);
    expectVecClose(viewTarget(turned), viewTarget(start));
  });

  it("turns clockwise the other way, and the two undo each other", () => {
    const start = recenterPose();
    const turned = step(start, "rotate-cw");
    expect(headingDeg(turned)).toBeCloseTo(360 - ROTATE_STEP_DEG, 6);
    const back = step(turned, "rotate-ccw");
    expectVecClose(back.position, start.position);
    expectVecClose(back.direction, start.direction);
  });

  it("keeps whatever is on screen in place when the view is off the property", () => {
    // Panned 400 m east: the pivot is the new screen centre, not the property.
    const start = recenterPose();
    const panned: CameraPose = { ...start, position: { ...start.position, x: 400 } };
    const turned = step(panned, "rotate-ccw");
    expectVecClose(viewTarget(turned), { x: 400, y: 0, z: 0 });
  });
});

describe("tilt", () => {
  it("tilts down toward overhead about the screen-centre point", () => {
    const start = recenterPose();
    const tilted = step(start, "tilt-down");
    expect(pitchDeg(tilted)).toBeCloseTo(RECENTER_PITCH_DEG - TILT_STEP_DEG, 6);
    expect(headingDeg(tilted)).toBeCloseTo(0, 6);
    expectVecClose(viewTarget(tilted), viewTarget(start));
    expect(distance(tilted.position, viewTarget(tilted))).toBeCloseTo(distance(start.position, viewTarget(start)), 6);
    // Roll stays level: the up vector keeps pointing skyward.
    expect(tilted.up.z).toBeGreaterThan(0);
  });

  it("tilts up toward the horizon", () => {
    const tilted = step(recenterPose(), "tilt-up");
    expect(pitchDeg(tilted)).toBeCloseTo(RECENTER_PITCH_DEG + TILT_STEP_DEG, 6);
  });

  it("stops at the overhead limit with a partial step, then refuses", () => {
    let pose = recenterPose(280, MIN_PITCH_DEG + 4);
    pose = step(pose, "tilt-down");
    expect(pitchDeg(pose)).toBeCloseTo(MIN_PITCH_DEG, 6);
    expect(planCameraStep(pose, "tilt-down")).toBeNull();
  });

  it("stops at the horizon limit", () => {
    const pose = recenterPose(280, MAX_PITCH_DEG);
    expect(planCameraStep(pose, "tilt-up")).toBeNull();
  });

  it("refuses to tilt the camera down below the height floor", () => {
    // Close to the roofline: lifting the view would drop the camera under it.
    const pose = recenterPose(MIN_CAMERA_HEIGHT_M + 1, -40);
    expect(planCameraStep(pose, "tilt-up")).toBeNull();
  });
});

describe("zoom", () => {
  it("moves toward the screen-centre point by a fixed share of the distance", () => {
    const start = recenterPose();
    const zoomed = step(start, "zoom-in");
    const before = distance(start.position, viewTarget(start));
    expect(distance(zoomed.position, viewTarget(zoomed))).toBeCloseTo(before * (1 - ZOOM_STEP_FRACTION), 6);
    expectVecClose(zoomed.direction, start.direction);
    expectVecClose(viewTarget(zoomed), viewTarget(start));
  });

  it("zooming out undoes zooming in", () => {
    const start = recenterPose();
    const back = step(step(start, "zoom-in"), "zoom-out");
    expectVecClose(back.position, start.position);
  });

  it("never zooms below the height floor, and refuses once there", () => {
    // A full step from 30 m would land at 19.5 m; it stops at the floor instead.
    let pose = recenterPose(30);
    pose = step(pose, "zoom-in");
    expect(pose.position.z).toBeCloseTo(MIN_CAMERA_HEIGHT_M, 6);
    expect(planCameraStep(pose, "zoom-in")).toBeNull();
    // The way back out is still open.
    expect(planCameraStep(pose, "zoom-out")).not.toBeNull();
  });

  it("never zooms out past the ceiling", () => {
    let pose = recenterPose(MAX_CAMERA_HEIGHT_M - 100);
    pose = step(pose, "zoom-out");
    expect(pose.position.z).toBeCloseTo(MAX_CAMERA_HEIGHT_M, 6);
    expect(planCameraStep(pose, "zoom-out")).toBeNull();
  });
});

describe("animation fractions", () => {
  it("reaches the planned pose at fraction 1 and the start at fraction 0", () => {
    const start = recenterPose();
    const plan = planCameraStep(start, "rotate-cw")!;
    expectVecClose(applyCameraStep(start, plan, 0).position, start.position);
    const half = applyCameraStep(start, plan, 0.5);
    expect(headingDeg(half)).toBeCloseTo(360 - ROTATE_STEP_DEG / 2, 6);
  });
});

describe("world ↔ local frame", () => {
  // A real east-north-up frame at Morgan Hill, CA, as Cesium would build it.
  const lat = (37.14268 * Math.PI) / 180;
  const lng = (-121.66842 * Math.PI) / 180;
  const radius = 6_371_000;
  const east = { x: -Math.sin(lng), y: Math.cos(lng), z: 0 };
  const north = { x: -Math.sin(lat) * Math.cos(lng), y: -Math.sin(lat) * Math.sin(lng), z: Math.cos(lat) };
  const up = { x: Math.cos(lat) * Math.cos(lng), y: Math.cos(lat) * Math.sin(lng), z: Math.sin(lat) };
  const origin = { x: up.x * radius, y: up.y * radius, z: up.z * radius };
  // Column-major, the layout of CesiumJS's Matrix4.
  const matrix = [
    east.x, east.y, east.z, 0,
    north.x, north.y, north.z, 0,
    up.x, up.y, up.z, 0,
    origin.x, origin.y, origin.z, 1,
  ];

  it("reads the axes and origin out of a column-major matrix", () => {
    const frame = enuFrameFromMatrix(matrix);
    expectVecClose(frame.east, east);
    expectVecClose(frame.north, north);
    expectVecClose(frame.up, up);
    expectVecClose(frame.origin, origin);
  });

  it("round-trips a pose through world coordinates", () => {
    const frame = enuFrameFromMatrix(matrix);
    const local = recenterPose();
    const world = poseToWorld(frame, local);
    // 280 m above the property in world terms is 280 m along the local up axis.
    expect(distance(world.position, origin)).toBeCloseTo(distance(local.position, { x: 0, y: 0, z: 0 }), 4);
    const back = poseToLocal(frame, world);
    expectVecClose(back.position, local.position, 4);
    expectVecClose(back.direction, local.direction);
    expectVecClose(back.up, local.up);
  });
});
