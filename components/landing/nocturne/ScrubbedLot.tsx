"use client";

import { Player, type PlayerRef } from "@remotion/player";
import type { RefObject } from "react";
import { BlueHourLot } from "@/remotion/nocturne/BlueHourLot";
import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  BLUE_HOUR_FPS,
  BLUE_HOUR_HEIGHT,
  BLUE_HOUR_WIDTH,
  type SurveyHighlight,
} from "@/remotion/nocturne/constants";

/**
 * The scroll-scrubbed Remotion composition, split out of {@link BlueHourHero}
 * so `next/dynamic` can keep the Player and the composition's module graph out
 * of the landing's initial bundle. The hero already gates this behind
 * `mounted && !reducedMotion`, so reduced-motion visitors never fetch it.
 *
 * `playerRef` is an ordinary prop, not a forwarded ref: `next/dynamic` does not
 * forward refs across the loadable boundary.
 */
export default function ScrubbedLot({
  playerRef,
  highlight,
}: {
  playerRef: RefObject<PlayerRef | null>;
  highlight: SurveyHighlight;
}) {
  return (
    <Player
      ref={playerRef}
      component={BlueHourLot}
      inputProps={{ highlight }}
      durationInFrames={BLUE_HOUR_DURATION_IN_FRAMES}
      fps={BLUE_HOUR_FPS}
      compositionWidth={BLUE_HOUR_WIDTH}
      compositionHeight={BLUE_HOUR_HEIGHT}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      acknowledgeRemotionLicense
      style={{ width: "100%", height: "100%" }}
    />
  );
}
