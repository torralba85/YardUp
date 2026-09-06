import type { LocalPoint, Pose2D } from "./scene-model";

/** Gemini T05 gesture state: a preview is transient; finish consumes the commit once. */
export class DragController {
  private initial: Pose2D | null = null;
  private offset: LocalPoint | null = null;
  private preview: Pose2D | null = null;
  isActive() { return this.initial !== null; }
  start(point: LocalPoint, pose: Pose2D) {
    if (this.isActive() || !Object.values(point).every(Number.isFinite)) return false;
    this.initial = { ...pose }; this.preview = { ...pose };
    this.offset = { x: pose.x-point.x, z: pose.z-point.z }; return true;
  }
  move(point: LocalPoint, constrain: (pose: Pose2D) => Pose2D = p => p) {
    if (!this.initial || !this.offset || !Object.values(point).every(Number.isFinite)) return null;
    this.preview = constrain({ ...this.initial, x: point.x+this.offset.x, z: point.z+this.offset.z });
    return { ...this.preview };
  }
  cancel() { const original = this.initial; this.reset(); return original ? { ...original } : null; }
  finish() { const final = this.preview; this.reset(); return final ? { ...final } : null; }
  private reset() { this.initial = null; this.offset = null; this.preview = null; }
}
