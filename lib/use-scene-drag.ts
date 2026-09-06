"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plane, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Pose2D } from "./scene-model";
import { DragController } from "./scene-drag";

type CaptureTarget = { setPointerCapture(id: number): void; releasePointerCapture(id: number): void };
interface DragProps {
  pose: Pose2D;
  controls: { enabled: boolean } | null;
  onPreview(pose: Pose2D): void;
  onCommit(pose: Pose2D): void;
  constrain?: (pose: Pose2D) => Pose2D;
  enabled?: boolean;
}
const plane = new Plane(new Vector3(0,1,0),0);
function project(event: ThreeEvent<PointerEvent>) {
  const point = event.ray.intersectPlane(plane,new Vector3());
  return point ? { x: point.x, z: point.z } : null;
}

export function useSceneDrag(props: DragProps) {
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; }, [props]);
  const controller = useRef(new DragController());
  const capture = useRef<{ id: number; target: CaptureTarget; controls: DragProps["controls"]; wasEnabled: boolean } | null>(null);
  const [active, setActive] = useState(false);
  const end = useCallback((commit: boolean, pointerId?: number) => {
    const saved = capture.current;
    if (!saved || (pointerId !== undefined && pointerId !== saved.id)) return;
    // Clear before releasing capture: lostpointercapture may dispatch synchronously.
    capture.current = null;
    const pose = commit ? controller.current.finish() : controller.current.cancel();
    if (saved.controls) saved.controls.enabled = saved.wasEnabled;
    try { saved.target.releasePointerCapture(saved.id); } catch { /* Browser may already have released capture. */ }
    setActive(false);
    if (pose) (commit ? latest.current.onCommit : latest.current.onPreview)(pose);
  }, []);
  useEffect(() => {
    const cancel = (event: PointerEvent) => end(false,event.pointerId);
    const finish = (event: PointerEvent) => end(true,event.pointerId);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") end(false); };
    const blur = () => end(false);
    window.addEventListener("pointercancel",cancel);
    window.addEventListener("lostpointercapture",cancel,true);
    window.addEventListener("pointerup",finish);
    window.addEventListener("keydown",escape);
    window.addEventListener("blur",blur);
    return () => {
      window.removeEventListener("pointercancel",cancel);
      window.removeEventListener("lostpointercapture",cancel,true);
      window.removeEventListener("pointerup",finish);
      window.removeEventListener("keydown",escape);
      window.removeEventListener("blur",blur);
      end(false);
    };
  }, [end]);
  useEffect(() => { if (props.enabled === false) end(false); }, [props.enabled,end]);
  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    const current = latest.current;
    if (current.enabled === false || event.button !== 0 || capture.current) return;
    const point = project(event); if (!point) return;
    const target = event.target as unknown as CaptureTarget;
    if (!target || typeof target.setPointerCapture !== "function" || typeof target.releasePointerCapture !== "function") return;
    try { target.setPointerCapture(event.pointerId); } catch { return; }
    if (!controller.current.start(point,current.pose)) { target.releasePointerCapture(event.pointerId); return; }
    event.stopPropagation();
    capture.current = { id: event.pointerId, target, controls: current.controls, wasEnabled: current.controls?.enabled ?? true };
    if (current.controls) current.controls.enabled = false;
    setActive(true);
  }, []);
  const onPointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (capture.current?.id !== event.pointerId) return;
    event.stopPropagation(); const point = project(event); if (!point) return;
    const pose = controller.current.move(point,latest.current.constrain);
    if (pose) latest.current.onPreview(pose);
  }, []);
  const onPointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (capture.current?.id !== event.pointerId) return;
    event.stopPropagation(); onPointerMove(event); end(true,event.pointerId);
  }, [end,onPointerMove]);
  const onPointerCancel = useCallback((event: ThreeEvent<PointerEvent>) => end(false,event.pointerId),[end]);
  return { active, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
