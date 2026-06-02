"use client";

import { useEffect, useState } from "react";
import type { MotionValue } from "motion/react";

/**
 * Mirror a numeric MotionValue into React state. Use ONLY for HTML overlay
 * content that must re-render per frame (e.g. a count-up number) — never to
 * feed the WebGL tree, which should read the MotionValue directly in useFrame.
 */
export function useStateFromMotionNumber(mv: MotionValue<number>): number {
  const [n, setN] = useState(() => mv.get());
  useEffect(() => mv.on("change", setN), [mv]);
  return n;
}
