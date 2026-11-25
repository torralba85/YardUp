"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./CostStack.module.css";
import type { CostLayer, StackMotion } from "./cost-stack-motion";
import type { CalloutNodes } from "./CostStackScene";

// three.js and the scene load only when the stage nears the viewport, so the
// landing's first paint never waits on WebGL.
const CostStackScene = dynamic(() => import("./CostStackScene"), { ssr: false });

/** A still of the exploded model: the first frame before WebGL, and the fallback without a GPU. */
const POSTER = "/landing/cost-stack-3d.webp";

/** Each callout's leader, in px from its anchor on the model to its numbered badge. */
const CALLOUTS: readonly { layer: CostLayer; index: string; dx: number; dy: number }[] = [
  { layer: "roof", index: "01", dx: 40, dy: -24 },
  { layer: "openings", index: "02", dx: 42, dy: -16 },
  { layer: "shell", index: "03", dx: 44, dy: 10 },
  { layer: "soft", index: "04", dx: 34, dy: 18 },
];

// A cheap check only: creating a test context costs a few hundred ms on
// some GPUs. A context that fails to start, including one refused for
// software rendering, lands in SceneBoundary.
const webglAvailable = () => typeof window.WebGL2RenderingContext === "function" || typeof window.WebGLRenderingContext === "function";

/** If WebGL fails to start, the poster simply stays. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The cost stack's 3D model of the demo backyard home. The figure is one
 * labelled image to assistive tech; the canvas and its callouts are
 * decoration inside it.
 */
export function CostStackModel({ layer, label, motion }: { layer: CostLayer; label: string; motion: StackMotion }) {
  const ref = useRef<HTMLDivElement>(null);
  const callouts = useRef<CalloutNodes>({});
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const markUnsupported = useMemo(() => () => setUnsupported(true), []);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        if (webglAvailable()) setLive(true);
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.model} role="img" aria-label={label} data-ready={ready ? "true" : "false"}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static still under the canvas, sized by CSS */}
      <img className={styles.poster} src={POSTER} alt="" width={772} height={950} loading="lazy" decoding="async" />
      {live && !unsupported && (
        <SceneBoundary>
          <CostStackScene
            className={styles.canvas}
            layer={layer}
            motion={motion}
            callouts={callouts}
            onReady={() => setReady(true)}
            onUnsupported={markUnsupported}
          />
          {CALLOUTS.map(({ layer: key, index, dx, dy }) => (
            <span
              key={key}
              ref={(node) => {
                callouts.current[key] = node;
              }}
              className={styles.callout}
              data-active={layer === key ? "true" : "false"}
            >
              <span className={styles.calloutDot} />
              <span
                className={styles.calloutLine}
                style={{ width: `${Math.max(0, Math.hypot(dx, dy) - 15)}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` }}
              />
              <span className={styles.calloutBadge} style={{ transform: `translate(${dx}px, ${dy}px)` }}>
                {index}
              </span>
            </span>
          ))}
        </SceneBoundary>
      )}
    </div>
  );
}
