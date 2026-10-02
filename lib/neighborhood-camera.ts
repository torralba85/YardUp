/**
 * neighborhood-camera.ts — button-driven rotate, tilt, zoom and recenter for
 * the Neighborhood 3D view.
 *
 * Every step is computed in the property's local east-north-up frame, with the
 * property's measured ground as the z = 0 plane. Rotate and tilt are rigid
 * motions about the ground point at the centre of the screen, so whatever the
 * user is looking at keeps its place while the view turns around it — the
 * Google Earth behaviour, and the reason a step never throws the property off
 * screen. Zoom moves along the view ray toward that same point, like one
 * scroll-wheel notch.
 *
 * The maths is plain vectors so it can be tested without loading CesiumJS. The
 * component converts to and from world coordinates through the frame Cesium's
 * `Transforms.eastNorthUpToFixedFrame` returns; see `enuFrameFromMatrix`.
 */

/** A vector in metres. In the local frame: x east, y north, z up. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Camera position and orientation, all in the same frame. */
export interface CameraPose {
  position: Vec3;
  direction: Vec3;
  up: Vec3;
}

/** An east-north-up frame expressed in world (ECEF) coordinates. */
export interface EnuFrame {
  origin: Vec3;
  east: Vec3;
  north: Vec3;
  up: Vec3;
}

export type NeighborhoodCameraStep =
  | "zoom-in"
  | "zoom-out"
  | "rotate-ccw"
  | "rotate-cw"
  | "tilt-up"
  | "tilt-down";

/** One rotate press turns the view this far. */
export const ROTATE_STEP_DEG = 15;
/** One tilt press changes the view's pitch this far. */
export const TILT_STEP_DEG = 10;
/** One zoom-in press covers this share of the distance to the ground at screen centre. */
export const ZOOM_STEP_FRACTION = 0.35;
/**
 * Lowest the camera may sit above the property's ground. Low enough to read a
 * roofline, high enough that a zoom never ends inside one.
 */
export const MIN_CAMERA_HEIGHT_M = 25;
/** Highest a zoom-out may go: well past the neighborhood, short of the region. */
export const MAX_CAMERA_HEIGHT_M = 3000;
/** Farthest a zoom-out may back away from the property, whatever the pitch. */
export const MAX_DISTANCE_FROM_PROPERTY_M = 8000;
/**
 * Pitch limits for tilt. Straight down (-90°) is a singularity in Cesium's
 * heading/pitch/roll conversion, and a level view shows the sky, not the lot.
 */
export const MIN_PITCH_DEG = -88;
export const MAX_PITCH_DEG = -10;

/**
 * The recenter framing: the opening flight's pitch, low enough that the
 * property sits about as far away (~350 m) as that flight intends — it parks
 * 280 m up and 245 m south — but centred instead of below the middle.
 */
export const RECENTER_HEIGHT_M = 200;
export const RECENTER_PITCH_DEG = -35;

const DEG = Math.PI / 180;
const UNIT_Z: Vec3 = { x: 0, y: 0, z: 1 };
/** Below this, a step is too small to see and is reported as "at the limit". */
const MIN_VISIBLE_ANGLE_RAD = 0.01 * DEG;
const MIN_VISIBLE_MOVE_M = 0.05;

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const length = (a: Vec3): number => Math.sqrt(dot(a, a));
const normalize = (a: Vec3): Vec3 => {
  const len = length(a);
  return len > 0 ? scale(a, 1 / len) : a;
};

/** Rodrigues' rotation of `v` by `angle` radians about the unit `axis`, right-handed. */
function rotateVector(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return add(add(scale(v, cos), scale(cross(axis, v), sin)), scale(axis, dot(axis, v) * (1 - cos)));
}

/** Compass heading the camera faces, in degrees clockwise from north. */
export function headingDeg(pose: CameraPose): number {
  const deg = Math.atan2(pose.direction.x, pose.direction.y) / DEG;
  return (deg + 360) % 360;
}

/** How far the camera looks below level, in degrees; negative is downward. */
export function pitchDeg(pose: CameraPose): number {
  return Math.asin(Math.max(-1, Math.min(1, normalize(pose.direction).z))) / DEG;
}

/**
 * The point on the ground plane at the centre of the screen. A view that looks
 * level or up never meets the ground, so it falls back to the property itself.
 */
export function viewTarget(pose: CameraPose): Vec3 {
  const direction = normalize(pose.direction);
  if (direction.z < -1e-6 && pose.position.z > 0) {
    return add(pose.position, scale(direction, pose.position.z / -direction.z));
  }
  return { x: 0, y: 0, z: 0 };
}

/** A rigid rotation about an axis through a point, or a straight move. */
export type CameraStepPlan =
  | { kind: "rotate"; pivot: Vec3; axis: Vec3; angle: number }
  | { kind: "move"; offset: Vec3 };

/**
 * Plans one button press from the current local pose. Returns null when the
 * view is already at that control's limit, so the press is a no-op rather
 * than a lurch into the ground or the sky.
 */
export function planCameraStep(pose: CameraPose, step: NeighborhoodCameraStep): CameraStepPlan | null {
  const direction = normalize(pose.direction);
  const target = viewTarget(pose);

  switch (step) {
    case "rotate-ccw":
    case "rotate-cw": {
      // Turning the map counterclockwise means facing further clockwise, so the
      // heading rises: a negative right-handed turn about up.
      const sign = step === "rotate-ccw" ? -1 : 1;
      return { kind: "rotate", pivot: target, axis: UNIT_Z, angle: sign * ROTATE_STEP_DEG * DEG };
    }

    case "tilt-up":
    case "tilt-down": {
      const current = pitchDeg(pose);
      // Tilting up raises the pitch toward the horizon; down steepens it toward
      // overhead. Partial steps land exactly on the limit; a view already past
      // a limit can only come back toward the allowed range.
      const delta =
        step === "tilt-up"
          ? Math.max(0, Math.min(TILT_STEP_DEG, MAX_PITCH_DEG - current))
          : -Math.max(0, Math.min(TILT_STEP_DEG, current - MIN_PITCH_DEG));
      if (Math.abs(delta * DEG) < MIN_VISIBLE_ANGLE_RAD) return null;

      // The camera's horizontal right. Near straight down the view direction
      // has almost no horizontal part, so the screen's up vector stands in.
      const horizontal = Math.hypot(direction.x, direction.y) > 1e-6 ? direction : normalize(pose.up);
      const axis = normalize({ x: horizontal.y, y: -horizontal.x, z: 0 });
      // A positive turn about the right axis lifts the view toward the horizon.
      const plan: CameraStepPlan = { kind: "rotate", pivot: target, axis, angle: delta * DEG };
      // Tilting toward the horizon lowers the camera; refuse a step that would
      // put it below the floor rather than clip through rooftops.
      if (applyCameraStep(pose, plan, 1).position.z < MIN_CAMERA_HEIGHT_M) return null;
      return plan;
    }

    case "zoom-in":
    case "zoom-out": {
      const distance = length(sub(target, pose.position));
      let travel =
        step === "zoom-in"
          ? distance * ZOOM_STEP_FRACTION
          : // The inverse of a zoom-in step, so in-then-out returns to the start.
            -distance * (ZOOM_STEP_FRACTION / (1 - ZOOM_STEP_FRACTION));
      // Clamp the height the move would reach. Travel along a downward view
      // changes height by travel * direction.z.
      if (direction.z < -1e-6) {
        const height = pose.position.z;
        const maxIn = (height - MIN_CAMERA_HEIGHT_M) / -direction.z;
        const maxOut = (MAX_CAMERA_HEIGHT_M - height) / -direction.z;
        travel = Math.max(-Math.max(0, maxOut), Math.min(Math.max(0, maxIn), travel));
      }
      if (Math.abs(travel) < MIN_VISIBLE_MOVE_M) return null;
      const offset = scale(direction, travel);
      // A level view has no height to clamp, so bound how far out it can back.
      if (travel < 0 && length(add(pose.position, offset)) > MAX_DISTANCE_FROM_PROPERTY_M) return null;
      return { kind: "move", offset };
    }
  }
}

/** Applies a planned step, or `fraction` of it for an animation frame. */
export function applyCameraStep(pose: CameraPose, plan: CameraStepPlan, fraction = 1): CameraPose {
  if (plan.kind === "move") {
    return { ...pose, position: add(pose.position, scale(plan.offset, fraction)) };
  }
  const angle = plan.angle * fraction;
  const relative = sub(pose.position, plan.pivot);
  return {
    position: add(plan.pivot, rotateVector(relative, plan.axis, angle)),
    direction: rotateVector(pose.direction, plan.axis, angle),
    up: rotateVector(pose.up, plan.axis, angle),
  };
}

/**
 * The view the recenter control returns to: the property centred on screen,
 * facing north from the south.
 */
export function recenterPose(
  heightM = RECENTER_HEIGHT_M,
  pitch = RECENTER_PITCH_DEG,
  heading = 0,
): CameraPose {
  const p = pitch * DEG;
  const h = heading * DEG;
  const direction = { x: Math.sin(h) * Math.cos(p), y: Math.cos(h) * Math.cos(p), z: Math.sin(p) };
  const range = heightM / Math.sin(-p);
  return {
    position: scale(direction, -range),
    direction,
    up: { x: -Math.sin(h) * Math.sin(p), y: -Math.cos(h) * Math.sin(p), z: Math.cos(p) },
  };
}

/**
 * Reads the frame out of a column-major 4×4 matrix, which is how CesiumJS's
 * `Matrix4` stores `Transforms.eastNorthUpToFixedFrame`: columns 0-2 are the
 * east, north and up axes, column 3 is the origin.
 */
export function enuFrameFromMatrix(matrix: Readonly<Record<number, number>>): EnuFrame {
  const column = (c: number): Vec3 => ({ x: matrix[c * 4], y: matrix[c * 4 + 1], z: matrix[c * 4 + 2] });
  return { east: column(0), north: column(1), up: column(2), origin: column(3) };
}

function toLocalVector(frame: EnuFrame, v: Vec3): Vec3 {
  return { x: dot(v, frame.east), y: dot(v, frame.north), z: dot(v, frame.up) };
}

function toWorldVector(frame: EnuFrame, v: Vec3): Vec3 {
  return add(add(scale(frame.east, v.x), scale(frame.north, v.y)), scale(frame.up, v.z));
}

/** World camera pose to the property's local frame. */
export function poseToLocal(frame: EnuFrame, pose: CameraPose): CameraPose {
  return {
    position: toLocalVector(frame, sub(pose.position, frame.origin)),
    direction: toLocalVector(frame, pose.direction),
    up: toLocalVector(frame, pose.up),
  };
}

/** Local camera pose back to world coordinates. */
export function poseToWorld(frame: EnuFrame, pose: CameraPose): CameraPose {
  return {
    position: add(frame.origin, toWorldVector(frame, pose.position)),
    direction: toWorldVector(frame, pose.direction),
    up: toWorldVector(frame, pose.up),
  };
}
