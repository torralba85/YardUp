import type { CSSProperties, ReactNode } from "react";
import styles from "./CostStack.module.css";

export type CostLayer = "roof" | "openings" | "shell" | "soft";

/*
 * The exploded backyard home, modelled in feet and projected to an isometric
 * view, so every board, plank and seam lines up with the next. Axes: x runs
 * down-right (the 20 ft width), y down-left (the 30 ft depth), z up. The light
 * comes from the upper left, so +y faces are lit and +x faces are in shade.
 *
 * Each part moves by its own screen offset times --stack-sep (0 assembled,
 * 1 exploded): the roof lifts off its rafters, the front walls swing out to
 * show the furnished room, the windows and doors pop out of their walls, and
 * the drawing set drops below the slab.
 */

type P3 = readonly [number, number, number];

const S = 11; // px per foot
const C = Math.cos(Math.PI / 6);
const H = 0.5;
const W = 20; // width, x
const D = 30; // depth, y
const T = 0.5; // wall thickness
const FLOOR = 1; // finished floor height
const RT = 0.7; // roof panel thickness

/** Shed roof: high at the back (x = 0), falling toward the slider wall. */
const zTop = (x: number) => 12.9 - 0.05 * (x + 1.5);
const wallTop = (x: number) => zTop(x) - RT;

const xy = ([x, y, z]: P3) => [(x - y) * C * S, (x + y) * H * S - z * S] as const;
const n1 = (value: number) => String(Math.round(value * 10) / 10);
const pts = (list: readonly P3[]) =>
  list
    .map((point) => {
      const [sx, sy] = xy(point);
      return `${n1(sx)},${n1(sy)}`;
    })
    .join(" ");
const loop = (list: readonly P3[]) => `M${pts(list).split(" ").join(" L")} Z`;

const quadX = (x: number, y0: number, y1: number, z0: number, z1: number): P3[] => [
  [x, y0, z0],
  [x, y1, z0],
  [x, y1, z1],
  [x, y0, z1],
];
const quadY = (y: number, x0: number, x1: number, z0: number, z1: number): P3[] => [
  [x0, y, z0],
  [x1, y, z0],
  [x1, y, z1],
  [x0, y, z1],
];
const quadZ = (z: number, x0: number, x1: number, y0: number, y1: number): P3[] => [
  [x0, y0, z],
  [x1, y0, z],
  [x1, y1, z],
  [x0, y1, z],
];
const disc = (cx: number, cy: number, z: number, r: number, n = 20): P3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z] as const;
  });
const arc = (cx: number, cy: number, r: number, from: number, to: number, n = 12): P3[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), 0] as const;
  });

/** A solid's three visible faces: top, the +x face and the +y face. */
function Box({
  b: [x0, x1, y0, y1, z0, z1],
  top,
  side,
  front,
}: {
  b: readonly [number, number, number, number, number, number];
  top: string;
  side: string;
  front: string;
}) {
  return (
    <>
      <polygon className={side} points={pts(quadX(x1, y0, y1, z0, z1))} />
      <polygon className={front} points={pts(quadY(y1, x0, x1, z0, z1))} />
      <polygon className={top} points={pts(quadZ(z1, x0, x1, y0, y1))} />
    </>
  );
}

function Line({ a, b, className }: { a: P3; b: P3; className: string }) {
  return <polyline className={className} points={pts([a, b])} />;
}

/** Spans of [lo, hi] left after removing the holes that cover position u. */
function openSpans(u: number, lo: number, hi: number, holes: readonly Hole[]) {
  const cuts = holes.filter((h) => u > h.u0 && u < h.u1).sort((a, b) => a.z0 - b.z0);
  const spans: Array<[number, number]> = [];
  let start = lo;
  for (const h of cuts) {
    if (h.z0 > start) spans.push([start, Math.min(h.z0, hi)]);
    start = Math.max(start, h.z1);
  }
  if (start < hi) spans.push([start, hi]);
  return spans;
}

interface Hole {
  u0: number;
  u1: number;
  z0: number;
  z1: number;
}

/** Text lying flat on the drawing sheet, reading along +x (or +y). */
function PlanText({
  at,
  size,
  along = "x",
  children,
}: {
  at: P3;
  size: number;
  along?: "x" | "y";
  children: ReactNode;
}) {
  const [ox, oy] = xy(at);
  const m =
    along === "x"
      ? [C * S, H * S, -C * S, H * S]
      : [-C * S, H * S, -C * S, -H * S];
  return (
    <text
      className={styles.sheetText}
      transform={`matrix(${m.map(n1).join(" ")} ${n1(ox)} ${n1(oy)})`}
      fontSize={size}
    >
      {children}
    </text>
  );
}

function Callout({ at, dx, dy, label }: { at: P3; dx: number; dy: number; label: string }) {
  const [ax, ay] = xy(at);
  const bx = ax + dx;
  const by = ay + dy;
  const len = Math.hypot(dx, dy);
  const ex = bx - (dx / len) * 17;
  const ey = by - (dy / len) * 17;
  return (
    <g className={styles.callout}>
      <circle className={styles.calloutDot} cx={n1(ax)} cy={n1(ay)} r="2.5" />
      <line x1={n1(ax)} y1={n1(ay)} x2={n1(ex)} y2={n1(ey)} />
      <circle cx={n1(bx)} cy={n1(by)} r="17" />
      <text x={n1(bx)} y={n1(by + 5.5)}>
        {label}
      </text>
    </g>
  );
}

/** A part that moves by (ox, oy) px when fully exploded. */
function Part({ ox = 0, oy = 0, children }: { ox?: number; oy?: number; children: ReactNode }) {
  return (
    <g className={styles.part} style={{ "--ox": ox, "--oy": oy } as CSSProperties}>
      {children}
    </g>
  );
}

// Exploded offsets, px. One foot along x moves (9.5, 5.5), along y (-9.5, 5.5).
const OFFSET = {
  sheetEngineering: [0, 196],
  sheetPlan: [0, 174],
  slab: [0, 50],
  floor: [0, 0],
  backWalls: [0, -30],
  wallSlider: [52, -6],
  wallEntry: [-52, -6],
  openSlider: [84, 12],
  openEntry: [-84, 12],
  rafters: [0, -168],
  roof: [0, -236],
} as const;

// Openings, in wall coordinates: u runs along the wall, z up.
const SLIDER: Hole = { u0: 10, u1: 22, z0: FLOOR, z1: 8.6 };
const CLERESTORY: Hole = { u0: 2, u1: 7.5, z0: 8.9, z1: 10.5 };
const WINDOW: Hole = { u0: 3, u1: 9, z0: 4, z1: 8 };
const DOOR: Hole = { u0: 13, u1: 16, z0: FLOOR, z1: 8 };
const SLIDER_WALL_HOLES = [SLIDER, CLERESTORY];
const ENTRY_WALL_HOLES = [WINDOW, DOOR];

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};

function DrawingSheet({ x0, x1, y0, y1, children }: { x0: number; x1: number; y0: number; y1: number; children?: ReactNode }) {
  const outline = quadZ(0, x0, x1, y0, y1);
  return (
    <>
      <polygon className={styles.sheetEdge} points={pts([[x1, y0, 0], [x1, y1, 0], [x1, y1, -0.12], [x1, y0, -0.12]])} />
      <polygon className={styles.sheetEdge} points={pts([[x0, y1, 0], [x1, y1, 0], [x1, y1, -0.12], [x0, y1, -0.12]])} />
      <polygon className={styles.sheet} points={pts(outline)} />
      <polygon className={styles.sheetBorder} points={pts(quadZ(0, x0 + 0.6, x1 - 0.6, y0 + 0.6, y1 - 0.6))} />
      {children}
    </>
  );
}

function SoftCosts({ active }: { active: boolean }) {
  // The plan, drawn on the sheet at full size.
  const wallRing = `${loop(quadZ(0, 0, W, 0, D))} ${loop(quadZ(0, T, W - T, T, D - T))}`;
  const gaps: P3[][] = [
    quadZ(0, W - T, W, SLIDER.u0, SLIDER.u1),
    quadZ(0, WINDOW.u0, WINDOW.u1, D - T, D),
    quadZ(0, DOOR.u0, DOOR.u1, D - T, D),
  ];
  return (
    <g className={styles.layer} data-active={active}>
      <Part ox={OFFSET.sheetEngineering[0]} oy={OFFSET.sheetEngineering[1]}>
        <DrawingSheet x0={-3} x1={28} y0={-2} y1={35}>
          {/* Structural grid with bubbles. */}
          {[0, 10, 20].map((x) => (
            <g key={`gx${x}`}>
              <Line className={styles.gridLine} a={[x, -0.5, 0]} b={[x, 32, 0]} />
              <polygon className={styles.gridBubble} points={pts(disc(x, 33, 0, 0.9))} />
            </g>
          ))}
          {[0, 10, 20, 30].map((y) => (
            <g key={`gy${y}`}>
              <Line className={styles.gridLine} a={[-0.5, y, 0]} b={[24, y, 0]} />
              <polygon className={styles.gridBubble} points={pts(disc(25.3, y, 0, 0.9))} />
            </g>
          ))}
          {range(2, 18, 2).map((x) => (
            <Line key={`j${x}`} className={styles.sheetFine} a={[x, 0.5, 0]} b={[x, 29.5, 0]} />
          ))}
        </DrawingSheet>
      </Part>

      <Part ox={OFFSET.sheetPlan[0]} oy={OFFSET.sheetPlan[1]}>
        <DrawingSheet x0={-4} x1={28} y0={-4} y1={34}>
          <path className={styles.planWall} d={wallRing} fillRule="evenodd" />
          {gaps.map((gap, i) => (
            <polygon key={`gap${i}`} className={styles.planGap} points={pts(gap)} />
          ))}
          <Line className={styles.planLine} a={[W - T / 2, SLIDER.u0, 0]} b={[W - T / 2, SLIDER.u1, 0]} />
          <Line className={styles.planLine} a={[WINDOW.u0, D - T / 2, 0]} b={[WINDOW.u1, D - T / 2, 0]} />
          {/* Bath partitions and door swings. */}
          <polygon className={styles.planWallSolid} points={pts(quadZ(0, 8, 8.35, T, 9.35))} />
          <polygon className={styles.planWallSolid} points={pts(quadZ(0, T, 4.5, 9, 9.35))} />
          <polygon className={styles.planWallSolid} points={pts(quadZ(0, 7, 8.35, 9, 9.35))} />
          <polyline className={styles.planSwing} points={pts(arc(DOOR.u0, D - T, 3, 0, -Math.PI / 2))} />
          <Line className={styles.planLine} a={[DOOR.u0, D - T, 0]} b={[DOOR.u0, D - T - 3, 0]} />
          <polyline className={styles.planSwing} points={pts(arc(7, 9, 2.5, Math.PI, Math.PI * 1.5))} />
          {/* Fixtures in outline. */}
          <polygon className={styles.planFixture} points={pts(quadZ(0, 9.5, 15.5, 0.6, 7.5))} />
          <polygon className={styles.planFixture} points={pts(quadZ(0, 0.5, 2.8, 12, 22))} />
          <polygon className={styles.planFixture} points={pts(quadZ(0, 6, 9, 13, 17))} />
          <polygon className={styles.planFixture} points={pts(quadZ(0, 10, 12.8, 21.5, 28))} />
          <polygon className={styles.planFixture} points={pts(quadZ(0, 0.5, 3.5, 0.5, 3.5))} />
          {/* Dimension strings. */}
          <Line className={styles.planDim} a={[0, -2, 0]} b={[W, -2, 0]} />
          {[0, 10, W].map((x) => (
            <Line key={`dx${x}`} className={styles.planDim} a={[x - 0.35, -2.35, 0]} b={[x + 0.35, -1.65, 0]} />
          ))}
          <Line className={styles.planDim} a={[-2, 0, 0]} b={[-2, D, 0]} />
          {[0, 9.35, 22, D].map((y) => (
            <Line key={`dy${y}`} className={styles.planDim} a={[-2.35, y - 0.35, 0]} b={[-1.65, y + 0.35, 0]} />
          ))}
          <PlanText at={[7.6, -2.5, 0]} size={1.1}>20&apos;-0&quot;</PlanText>
          <PlanText at={[-2.5, 18.2, 0]} size={1.1} along="y">30&apos;-0&quot;</PlanText>
          <PlanText at={[10.6, 4.6, 0]} size={0.85}>BEDROOM</PlanText>
          <PlanText at={[1.6, 6.6, 0]} size={0.85}>BATH</PlanText>
          <PlanText at={[4.5, 20, 0]} size={0.85}>KITCHEN</PlanText>
          <PlanText at={[13.4, 19.6, 0]} size={0.85}>LIVING</PlanText>
          {/* Title block, north arrow and the engineer's seal. */}
          <polygon className={styles.titleBlock} points={pts(quadZ(0, 21.5, 27, 24, 33))} />
          <Line className={styles.sheetFine} a={[21.5, 30, 0]} b={[27, 30, 0]} />
          <Line className={styles.sheetFine} a={[21.5, 31.6, 0]} b={[27, 31.6, 0]} />
          <PlanText at={[22.1, 28.8, 0]} size={1.5}>A-101</PlanText>
          <PlanText at={[22.1, 31, 0]} size={0.75}>FLOOR PLAN</PlanText>
          <PlanText at={[22.1, 32.6, 0]} size={0.75}>PERMIT SET</PlanText>
          <polygon className={styles.northRing} points={pts(disc(24.2, 2.5, 0, 1.6))} />
          <polygon className={styles.northArrow} points={pts([[24.2, 0.9, 0], [24.9, 3.2, 0], [24.2, 2.7, 0], [23.5, 3.2, 0]])} />
          <polygon className={styles.seal} points={pts(disc(24.2, 19.5, 0, 1.9))} />
          <polygon className={styles.sealRing} points={pts(disc(24.2, 19.5, 0, 1.35))} />
          <Callout at={[28, -4, 0]} dx={34} dy={4} label="04" />
        </DrawingSheet>
      </Part>
    </g>
  );
}

/** One exterior wall face with board cladding and reveals around its holes. */
function CladWall({ plane, holes }: { plane: "x" | "y"; holes: readonly Hole[] }) {
  const isX = plane === "x";
  const len = isX ? D - T : W;
  const top = (u: number) => (isX ? wallTop(W) : wallTop(u));
  const at = (u: number, z: number): P3 => (isX ? [W, u, z] : [u, D, z]);
  const inset = (u: number, z: number): P3 => (isX ? [W - T, u, z] : [u, D - T, z]);
  const outline: P3[] = [at(0, FLOOR), at(len, FLOOR), at(len, top(len)), at(0, top(0))];
  const face = [loop(outline), ...holes.map((h) => loop([at(h.u0, h.z0), at(h.u1, h.z0), at(h.u1, h.z1), at(h.u0, h.z1)]))].join(" ");
  const faceClass = isX ? styles.wallShade : styles.wallLit;
  const boardClass = isX ? styles.boardShade : styles.boardLit;
  return (
    <>
      {/* The wall's end and top: the section cut. */}
      {isX ? (
        <polygon className={styles.wallEnd} points={pts([[W - T, len, FLOOR], [W, len, FLOOR], [W, len, top(len)], [W - T, len, top(len)]])} />
      ) : (
        <polygon className={styles.wallEndShade} points={pts([[W, D - T, FLOOR], [W, D, FLOOR], [W, D, wallTop(W)], [W, D - T, wallTop(W)]])} />
      )}
      <path className={faceClass} d={face} fillRule="evenodd" />
      {range(0.6, len - 0.3, 0.6).flatMap((u) =>
        openSpans(u, FLOOR, top(u), holes).map(([z0, z1]) => (
          <Line key={`b${u}-${z0}`} className={boardClass} a={at(u, z0)} b={at(u, z1)} />
        )),
      )}
      <Line className={styles.trim} a={at(0, FLOOR + 0.45)} b={at(len, FLOOR + 0.45)} />
      {/* Reveals: the near jamb and the sill show the wall's thickness. */}
      {holes.map((h, i) => (
        <g key={`r${i}`}>
          <polygon className={styles.reveal} points={pts([inset(h.u0, h.z0), at(h.u0, h.z0), at(h.u0, h.z1), inset(h.u0, h.z1)])} />
          {h.z0 > FLOOR && (
            <polygon className={styles.revealSill} points={pts([inset(h.u0, h.z0), inset(h.u1, h.z0), at(h.u1, h.z0), at(h.u0, h.z0)])} />
          )}
        </g>
      ))}
      <polygon
        className={styles.wallCap}
        points={pts(isX ? [[W - T, 0, top(0)], [W, 0, top(0)], [W, len, top(len)], [W - T, len, top(len)]] : [[0, D - T, top(0)], [W, D - T, top(W)], [W, D, top(W)], [0, D, top(0)]])}
      />
    </>
  );
}

function Shell({ active }: { active: boolean }) {
  return (
    <g className={styles.layer} data-active={active}>
      {/* Slab: thickened edge, control joints and anchor bolts. */}
      <Part ox={OFFSET.slab[0]} oy={OFFSET.slab[1]}>
        <Box b={[-0.5, W + 0.5, -0.5, D + 0.5, -1.2, 0.9]} top={styles.slabTop} side={styles.slabSide} front={styles.slabFront} />
        <Line className={styles.slabLine} a={[W + 0.5, -0.5, 0]} b={[W + 0.5, D + 0.5, 0]} />
        <Line className={styles.slabLine} a={[-0.5, D + 0.5, 0]} b={[W + 0.5, D + 0.5, 0]} />
        {[10, 20].map((y) => (
          <Line key={`cj${y}`} className={styles.joint} a={[-0.5, y, 0.9]} b={[W + 0.5, y, 0.9]} />
        ))}
        <Line className={styles.joint} a={[10, -0.5, 0.9]} b={[10, D + 0.5, 0.9]} />
        {[
          ...range(2, 18, 4).flatMap((x) => [[x, 0.25], [x, D - 0.25]]),
          ...range(4, 26, 4).flatMap((y) => [[0.25, y], [W - 0.25, y]]),
        ].map(([x, y]) => (
          <polygon key={`ab${x}-${y}`} className={styles.bolt} points={pts(disc(x, y, 0.9, 0.18, 8))} />
        ))}
      </Part>

      {/* Finished floor, deck and everything that sits on the floor plane. */}
      <Part ox={OFFSET.floor[0]} oy={OFFSET.floor[1]}>
        <Box b={[0, W, 0, D, 0.9, FLOOR]} top={styles.floor} side={styles.floorEdge} front={styles.floorEdge} />
        {range(0.5, D - 0.5, 0.5).map((y, row) => (
          <g key={`pl${y}`}>
            <Line className={styles.plank} a={[0, y, FLOOR]} b={[W, y, FLOOR]} />
            <Line className={styles.plank} a={[((row * 7.3) % 17) + 1.5, y - 0.5, FLOOR]} b={[((row * 7.3) % 17) + 1.5, y, FLOOR]} />
          </g>
        ))}
        <polygon className={styles.rug} points={pts(quadZ(FLOOR + 0.01, 9.5, 17.5, 20.5, 29))} />
        <polygon className={styles.shower} points={pts(quadZ(FLOOR + 0.02, T, 3.5, T, 3.5))} />
        <polygon className={styles.drain} points={pts(disc(2, 2, FLOOR + 0.03, 0.22, 10))} />

        {/* Deck on the slider side, boards running along the wall, two steps. */}
        <Box b={[W, W + 7, 9, 23, 0.1, FLOOR]} top={styles.deck} side={styles.deckSide} front={styles.deckFront} />
        {range(W + 0.45, W + 6.6, 0.45).map((x) => (
          <Line key={`db${x}`} className={styles.deckBoard} a={[x, 9, FLOOR]} b={[x, 23, FLOOR]} />
        ))}
        <Box b={[W + 7, W + 8.3, 12.5, 19.5, 0.05, 0.62]} top={styles.deck} side={styles.deckSide} front={styles.deckFront} />
        <Box b={[W + 8.3, W + 9.6, 12.5, 19.5, 0, 0.28]} top={styles.deck} side={styles.deckSide} front={styles.deckFront} />
        <Box b={[W + 5.2, W + 6.5, 20.6, 22.6, FLOOR, 2.6]} top={styles.soilTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        {[[W + 5.6, 21.2, 0.7], [W + 6.1, 22, 0.55], [W + 5.7, 21.9, 0.5]].map(([x, y, r]) => (
          <polygon key={`pl${x}-${y}`} className={styles.leaf} points={pts(disc(x, y, 3.2 + r, r, 12))} />
        ))}
      </Part>

      {/* Back walls: their inside faces, behind the furniture. */}
      <Part ox={OFFSET.backWalls[0]} oy={OFFSET.backWalls[1]}>
        <polygon className={styles.innerShade} points={pts([[T, T, FLOOR], [T, D - T, FLOOR], [T, D - T, wallTop(T)], [T, T, wallTop(T)]])} />
        <polygon className={styles.innerLit} points={pts([[T, T, FLOOR], [W - T, T, FLOOR], [W - T, T, wallTop(W - T)], [T, T, wallTop(T)]])} />
        <Line className={styles.baseboard} a={[T, T, FLOOR + 0.35]} b={[T, D - T, FLOOR + 0.35]} />
        <Line className={styles.baseboard} a={[T, T, FLOOR + 0.35]} b={[W - T, T, FLOOR + 0.35]} />
        {/* Picture over the bed and a shelf by the kitchen. */}
        <polygon className={styles.art} points={pts(quadY(T + 0.02, 10.8, 14.2, 6, 8.2))} />
        <polygon className={styles.wallCap} points={pts([[0, 0, wallTop(0)], [W, 0, wallTop(W)], [W, T, wallTop(W)], [0, T, wallTop(0)]])} />
        <polygon className={styles.wallCap} points={pts([[0, 0, wallTop(0)], [T, 0, wallTop(T)], [T, D, wallTop(T)], [0, D, wallTop(0)]])} />
      </Part>

      {/* Bath fixtures, behind the partitions. */}
      <Part ox={OFFSET.floor[0]} oy={OFFSET.floor[1]}>
        <Box b={[5, 7.6, T, 2.2, FLOOR, 3.8]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <polygon className={styles.basin} points={pts(disc(6.3, 1.35, 3.81, 0.55, 14))} />
        <Box b={[T, 1.2, 5.2, 6.4, FLOOR, 3.4]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[T, 2.2, 5.1, 6.5, FLOOR, 2.4]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
      </Part>
      <Part ox={OFFSET.backWalls[0]} oy={OFFSET.backWalls[1]}>
        <Box b={[T, 4.5, 9, 9.35, FLOOR, 9.4]} top={styles.wallCap} side={styles.innerShade} front={styles.innerLit} />
        <Box b={[7, 8.35, 9, 9.35, FLOOR, 9.4]} top={styles.wallCap} side={styles.innerShade} front={styles.innerLit} />
        <Box b={[8, 8.35, T, 9, FLOOR, 9.4]} top={styles.wallCap} side={styles.innerShade} front={styles.innerLit} />
        <Box b={[4.5, 7, 9, 9.35, 8, 9.4]} top={styles.wallCap} side={styles.innerShade} front={styles.innerLit} />
      </Part>

      {/* Furniture, back to front. */}
      <Part ox={OFFSET.floor[0]} oy={OFFSET.floor[1]}>
        {/* Kitchen run on the back wall: uppers, base, counter, sink, cooktop, fridge. */}
        <Box b={[T, 1.8, 12, 21, 7.4, 10]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        {range(14.25, 18.75, 2.25).map((y) => (
          <Line key={`uc${y}`} className={styles.cabinetLine} a={[1.8, y, 7.4]} b={[1.8, y, 10]} />
        ))}
        <Box b={[T, 2.8, 12, 22, FLOOR, 3.9]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        {range(14.5, 19.5, 2.5).map((y) => (
          <Line key={`bc${y}`} className={styles.cabinetLine} a={[2.8, y, FLOOR + 0.3]} b={[2.8, y, 3.9]} />
        ))}
        <Line className={styles.cabinetLine} a={[2.8, 12, 3.3]} b={[2.8, 22, 3.3]} />
        <Box b={[T, 3, 11.9, 22.1, 3.9, 4.15]} top={styles.counter} side={styles.counterEdge} front={styles.counterEdge} />
        <polygon className={styles.basin} points={pts(quadZ(4.16, 1, 2.4, 13.6, 16.2))} />
        <Line className={styles.faucet} a={[0.85, 14.9, 4.16]} b={[0.85, 14.9, 5.1]} />
        {[[1.3, 18.3], [2.2, 18.3], [1.3, 19.8], [2.2, 19.8]].map(([x, y]) => (
          <polygon key={`ck${x}-${y}`} className={styles.burner} points={pts(disc(x, y, 4.17, 0.32, 12))} />
        ))}
        <Box b={[T, 3, 22.3, 25, FLOOR, 7.8]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Line className={styles.cabinetLine} a={[3, 22.3, 5.4]} b={[3, 25, 5.4]} />

        {/* Dining. */}
        <Box b={[4.7, 5.7, 14, 15.1, FLOOR, 2.6]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[4.7, 5.7, 15.9, 17, FLOOR, 2.6]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[4.7, 4.95, 14, 15.1, 2.6, 4.3]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[4.7, 4.95, 15.9, 17, 2.6, 4.3]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        {[[6.1, 13.2], [8.7, 13.2], [6.1, 16.6], [8.7, 16.6]].map(([x, y]) => (
          <Box key={`tl${x}-${y}`} b={[x, x + 0.2, y, y + 0.2, FLOOR, 3.45]} top={styles.wood} side={styles.woodShade} front={styles.woodShade} />
        ))}
        <Box b={[6, 9, 13, 17, 3.45, 3.65]} top={styles.wood} side={styles.woodShade} front={styles.woodShade} />
        <Box b={[9.3, 10.3, 14, 15.1, FLOOR, 2.6]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[9.3, 10.3, 15.9, 17, FLOOR, 2.6]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />

        {/* Bed against the back wall, with a nightstand and lamp. */}
        <Box b={[9.5, 15.5, T, 0.9, FLOOR, 4.6]} top={styles.wood} side={styles.woodShade} front={styles.wood} />
        <Box b={[9.5, 15.5, 0.9, 7.5, FLOOR, 2.1]} top={styles.wood} side={styles.woodShade} front={styles.woodShade} />
        <Box b={[9.6, 15.4, 0.9, 7.4, 2.1, 2.9]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[10, 12.3, 1.1, 2.5, 2.9, 3.35]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[12.7, 15, 1.1, 2.5, 2.9, 3.35]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[9.55, 15.45, 3.2, 7.45, 2.2, 2.97]} top={styles.blanket} side={styles.blanketShade} front={styles.blanketMid} />
        <Line className={styles.fold} a={[9.55, 4, 2.97]} b={[15.45, 4, 2.97]} />
        <Box b={[15.9, 17.4, 0.6, 2.1, FLOOR, 3.2]} top={styles.wood} side={styles.woodShade} front={styles.woodShade} />
        <Line className={styles.cabinetLine} a={[17.4, 0.6, 2.2]} b={[17.4, 2.1, 2.2]} />
        <Box b={[16.4, 16.9, 1.1, 1.6, 3.2, 3.9]} top={styles.furnitureTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        <Box b={[16.1, 17.2, 0.8, 1.9, 3.9, 4.8]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />

        {/* Living: sofa facing the slider, coffee table and a plant. */}
        <Box b={[10, 12.8, 21.5, 28, FLOOR, 2.3]} top={styles.sofaTop} side={styles.sofaShade} front={styles.sofaMid} />
        <Box b={[10, 10.8, 21.5, 28, 2.3, 3.9]} top={styles.sofaTop} side={styles.sofaShade} front={styles.sofaMid} />
        {[23.6, 25.8].map((y) => (
          <Line key={`cu${y}`} className={styles.cushion} a={[10.8, y, 2.3]} b={[12.8, y, 2.3]} />
        ))}
        <Box b={[10, 12.8, 21.5, 22.2, 2.3, 3.1]} top={styles.sofaTop} side={styles.sofaShade} front={styles.sofaMid} />
        <Box b={[10, 12.8, 27.3, 28, 2.3, 3.1]} top={styles.sofaTop} side={styles.sofaShade} front={styles.sofaMid} />
        <Box b={[14, 16.2, 23, 26.5, FLOOR, 2.4]} top={styles.wood} side={styles.woodShade} front={styles.woodShade} />
        <polygon className={styles.burner} points={pts(disc(15.1, 24.2, 2.41, 0.4, 12))} />
        <Box b={[17.8, 18.8, 27.6, 28.6, FLOOR, 2.4]} top={styles.soilTop} side={styles.furnitureShade} front={styles.furnitureMid} />
        {[[18.3, 28.1, 3.4, 0.8], [17.9, 27.8, 4.3, 0.6], [18.6, 28.4, 4.6, 0.55]].map(([x, y, z, r]) => (
          <polygon key={`lf${x}-${y}`} className={styles.leaf} points={pts(disc(x, y, z, r, 12))} />
        ))}
      </Part>

      {/* Front walls swing out to open the room. */}
      <Part ox={OFFSET.wallSlider[0]} oy={OFFSET.wallSlider[1]}>
        <CladWall plane="x" holes={SLIDER_WALL_HOLES} />
        <Callout at={[W, 0, 6]} dx={40} dy={-4} label="03" />
      </Part>
      <Part ox={OFFSET.wallEntry[0]} oy={OFFSET.wallEntry[1]}>
        <CladWall plane="y" holes={ENTRY_WALL_HOLES} />
      </Part>
    </g>
  );
}

/** A framed glazed unit in a wall plane, split into panes along u. */
function Glazing({ plane, hole, panes, at }: { plane: "x" | "y"; hole: Hole; panes: number; at: number }) {
  const p = (u: number, z: number): P3 => (plane === "x" ? [at, u, z] : [u, at, z]);
  const quad = (u0: number, u1: number, z0: number, z1: number) => [p(u0, z0), p(u1, z0), p(u1, z1), p(u0, z1)];
  const f = 0.22;
  const width = (hole.u1 - hole.u0 - f * (panes + 1)) / panes;
  const glass = Array.from({ length: panes }, (_, i) => {
    const u0 = hole.u0 + f + i * (width + f);
    return [u0, u0 + width] as const;
  });
  const frame = [loop(quad(hole.u0, hole.u1, hole.z0, hole.z1)), ...glass.map(([u0, u1]) => loop(quad(u0, u1, hole.z0 + f, hole.z1 - f)))].join(" ");
  return (
    <>
      {glass.map(([u0, u1], i) => (
        <g key={i}>
          <polygon className={styles.glass} points={pts(quad(u0, u1, hole.z0 + f, hole.z1 - f))} />
          <polygon
            className={styles.glint}
            points={pts([p(u0 + 0.25, hole.z1 - f), p(u0 + 0.25 + width * 0.22, hole.z1 - f), p(u0 + 0.25, hole.z0 + f + (hole.z1 - hole.z0) * 0.35)])}
          />
        </g>
      ))}
      <path className={styles.frame} d={frame} fillRule="evenodd" />
    </>
  );
}

function Openings({ active }: { active: boolean }) {
  return (
    <g className={styles.layer} data-active={active}>
      <Part ox={OFFSET.openEntry[0]} oy={OFFSET.openEntry[1]}>
        {/* Casement window with a sill, and the entry door. */}
        <Glazing plane="y" hole={WINDOW} panes={2} at={D - 0.15} />
        <Box b={[WINDOW.u0 - 0.25, WINDOW.u1 + 0.25, D - 0.15, D + 0.35, WINDOW.z0 - 0.2, WINDOW.z0]} top={styles.sillTop} side={styles.frame} front={styles.frame} />
        <polygon className={styles.door} points={pts(quadY(D - 0.15, DOOR.u0, DOOR.u1, DOOR.z0, DOOR.z1))} />
        <polygon className={styles.glass} points={pts(quadY(D - 0.14, DOOR.u0 + 0.55, DOOR.u0 + 1.05, 3, 7.2))} />
        <Line className={styles.handle} a={[DOOR.u1 - 0.5, D - 0.12, 4.2]} b={[DOOR.u1 - 0.5, D - 0.12, 5]} />
        <polygon className={styles.doorFrame} points={pts(quadY(D - 0.16, DOOR.u0 - 0.2, DOOR.u1 + 0.2, DOOR.z1, DOOR.z1 + 0.2))} />
        <Callout at={[WINDOW.u0, D, WINDOW.z1]} dx={-34} dy={-30} label="02" />
      </Part>
      <Part ox={OFFSET.openSlider[0]} oy={OFFSET.openSlider[1]}>
        {/* Three-panel slider and the clerestory above the deck. */}
        <Glazing plane="x" hole={SLIDER} panes={3} at={W - 0.15} />
        {[14, 18].map((u) => (
          <Line key={`h${u}`} className={styles.handle} a={[W - 0.12, u - 0.45, 4]} b={[W - 0.12, u - 0.45, 5]} />
        ))}
        <Glazing plane="x" hole={CLERESTORY} panes={2} at={W - 0.15} />
      </Part>
    </g>
  );
}

function Roof({ active }: { active: boolean }) {
  const rafterBox = (y0: number) => {
    const y1 = y0 + 0.28;
    const zt = (x: number) => zTop(x) - RT;
    const zb = (x: number) => zt(x) - 0.95;
    const [x0, x1] = [-1.5, W + 1.5];
    return (
      <g key={`rf${y0}`}>
        <polygon className={styles.rafterSide} points={pts([[x1, y0, zb(x1)], [x1, y1, zb(x1)], [x1, y1, zt(x1)], [x1, y0, zt(x1)]])} />
        <polygon className={styles.rafterFront} points={pts([[x0, y1, zb(x0)], [x1, y1, zb(x1)], [x1, y1, zt(x1)], [x0, y1, zt(x0)]])} />
        <polygon className={styles.rafterTop} points={pts([[x0, y0, zt(x0)], [x1, y0, zt(x1)], [x1, y1, zt(x1)], [x0, y1, zt(x0)]])} />
      </g>
    );
  };
  const [x0, x1, y0, y1] = [-1.5, W + 1.5, -1.5, D + 1.5];
  const top = (x: number, y: number, lift = 0): P3 => [x, y, zTop(x) + lift];
  const curb = { x0: 4, x1: 9, y0: 8, y1: 13, h: 0.35 };
  return (
    <g className={styles.layer} data-active={active}>
      <Part ox={OFFSET.rafters[0]} oy={OFFSET.rafters[1]}>
        {/* Rafters at 2 ft centres and the ledger they hang from. */}
        {range(-1.2, D + 0.8, 2).map(rafterBox)}
      </Part>
      <Part ox={OFFSET.roof[0]} oy={OFFSET.roof[1]}>
        <polygon className={styles.fascia} points={pts([[x1, y0, zTop(x1) - RT], [x1, y1, zTop(x1) - RT], top(x1, y1), top(x1, y0)])} />
        <polygon className={styles.fasciaLit} points={pts([[x0, y1, zTop(x0) - RT], [x1, y1, zTop(x1) - RT], top(x1, y1), top(x0, y1)])} />
        <polygon className={styles.roofPanel} points={pts([top(x0, y0), top(x1, y0), top(x1, y1), top(x0, y1)])} />
        {/* Standing seams, each a raised rib with a lit edge. */}
        {range(y0 + 1.25, y1 - 1, 1.25).map((y) => (
          <g key={`sm${y}`}>
            <Line className={styles.seamShadow} a={top(x0, y + 0.08)} b={top(x1, y + 0.08)} />
            <Line className={styles.seamRib} a={top(x0, y, 0.1)} b={top(x1, y, 0.1)} />
          </g>
        ))}
        <Line className={styles.dripEdge} a={top(x0, y1)} b={top(x1, y1)} />
        <Line className={styles.dripEdge} a={top(x1, y0)} b={top(x1, y1)} />
        {/* Skylight: curb, frame and glass. */}
        <polygon className={styles.curbSide} points={pts([top(curb.x1, curb.y0), top(curb.x1, curb.y1), top(curb.x1, curb.y1, curb.h), top(curb.x1, curb.y0, curb.h)])} />
        <polygon className={styles.curbFront} points={pts([top(curb.x0, curb.y1), top(curb.x1, curb.y1), top(curb.x1, curb.y1, curb.h), top(curb.x0, curb.y1, curb.h)])} />
        <polygon className={styles.skyFrame} points={pts([top(curb.x0, curb.y0, curb.h), top(curb.x1, curb.y0, curb.h), top(curb.x1, curb.y1, curb.h), top(curb.x0, curb.y1, curb.h)])} />
        <polygon className={styles.skyGlass} points={pts([top(curb.x0 + 0.3, curb.y0 + 0.3, curb.h), top(curb.x1 - 0.3, curb.y0 + 0.3, curb.h), top(curb.x1 - 0.3, curb.y1 - 0.3, curb.h), top(curb.x0 + 0.3, curb.y1 - 0.3, curb.h)])} />
        <polygon className={styles.glint} points={pts([top(curb.x0 + 0.5, curb.y0 + 0.5, curb.h), top(curb.x0 + 2, curb.y0 + 0.5, curb.h), top(curb.x0 + 0.5, curb.y0 + 2.5, curb.h)])} />
        {/* Gutter along the low edge. */}
        <Box b={[x1, x1 + 0.55, y0, y1, zTop(x1) - 0.55, zTop(x1) - 0.12]} top={styles.gutterTop} side={styles.gutter} front={styles.gutter} />
        <Callout at={top(x1, y0)} dx={36} dy={-8} label="01" />
      </Part>
    </g>
  );
}

/**
 * The drawing, painted back to front. `layer` brings one cost layer forward
 * when the stack is exploded.
 */
export function CostStackDrawing({ layer, label }: { layer: CostLayer; label: string }) {
  return (
    <svg className={styles.drawing} viewBox="-398 -410 772 950" role="img" aria-label={label}>
      <defs>
        {/* Receding layers darken toward carbon but stay opaque, so they still
            hide what is behind them. */}
        <filter id="cost-stack-recede" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.38 0 0 0 0.053 0 0.38 0 0 0.053 0 0 0.38 0 0.053 0 0 0 1 0" />
        </filter>
      </defs>
      {/* Alignment rails: every layer shares the home's vertical axes. */}
      <g className={styles.rails}>
        {[[0, 0], [W, 0], [0, D], [W, D]].map(([x, y]) => {
          const [sx, sy] = xy([x, y, 0]);
          return <line key={`ra${x}-${y}`} className={x === W && y === D ? styles.railCenter : undefined} x1={n1(sx)} y1={n1(sy - 350)} x2={n1(sx)} y2={n1(sy + 180)} />;
        })}
      </g>
      <SoftCosts active={layer === "soft"} />
      <Shell active={layer === "shell"} />
      <Openings active={layer === "openings"} />
      <Roof active={layer === "roof"} />
    </svg>
  );
}
