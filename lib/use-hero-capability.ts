"use client";

import { useEffect, useState } from "react";
import { isWebGLAvailable } from "./webgl";

export type HeroMode = "3d" | "2d" | "static";

export interface HeroEnv {
  reducedMotion: boolean;
  webgl: boolean;
  finePointer: boolean;
  wide: boolean;
}

/** Pure decision: which hero variant to render for a given environment. */
export function decideHeroMode(env: HeroEnv): HeroMode {
  if (env.reducedMotion) return "static";
  if (!env.webgl || !env.finePointer || !env.wide) return "2d";
  return "3d";
}

const MIN_3D_WIDTH = 1024;

/**
 * Resolves the hero mode on the client. Returns "static" during SSR/first
 * paint so the server markup is the safe, fully-legible frame; upgrades after
 * mount once capabilities are known.
 */
export function useHeroCapability(): HeroMode {
  const [mode, setMode] = useState<HeroMode>("static");

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const wide = window.innerWidth >= MIN_3D_WIDTH;
    setMode(
      decideHeroMode({
        reducedMotion,
        webgl: isWebGLAvailable(),
        finePointer,
        wide,
      }),
    );
  }, []);

  return mode;
}
