import type { CSSProperties, ReactNode } from "react";
import styles from "./CostStack.module.css";

export type CostLayer = "roof" | "openings" | "shell" | "soft";

/*
 * The exploded backyard home, modelled in feet and projected to an isometric
 * view, so every board, plank and seam lines up with the next. Axes: x runs
 * down-right (the 20 ft width), y down-left (the 30 ft depth), z up. The light
 * comes from the upper left, so +y faces are lit and +x faces are in shade.
 * The building is drawn in its real finishes (cedar, bronze, metal, fir,
 * oak, concrete), not the page palette; see CostStack.module.css.
 *
 * Each part moves by its own screen offset times --stack-sep (0 assembled,
 * 1 exploded): the roof lifts off its rafters, the front walls swing out to
 * show the furnished room, the windows and doors pop out of their walls, and
 * the drawing set drops below the slab.
 */

type P3 = readonly [number, number, number];
type B6 = readonly [number, number, number, number, number, number];

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
const rafterTop = (x: number) => zTop(x) - RT;
const rafterBottom = (x: number) => rafterTop(x) - 0.95;

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
const loops = (items: readonly (readonly P3[])[]) => items.map(loop).join(" ");
const seg = (a: P3, b: P3) => `M${pts([a])} L${pts([b])}`;
const segs = (items: readonly (readonly [P3, P3])[]) => items.map(([a, b]) => seg(a, b)).join(" ");

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
const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};
const pick = <T,>(list: readonly T[], i: number) => list[((i % list.length) + list.length) % list.length];

/** A solid's three visible faces: top, the +x face and the +y face. */
function Box({ b: [x0, x1, y0, y1, z0, z1], top, side, front }: { b: B6; top: string; side: string; front: string }) {
  return (
    <>
      <polygon className={side} points={pts(quadX(x1, y0, y1, z0, z1))} />
      <polygon className={front} points={pts(quadY(y1, x0, x1, z0, z1))} />
      <polygon className={top} points={pts(quadZ(z1, x0, x1, y0, y1))} />
    </>
  );
}

/** A vertical cylinder: base, silhouette and cap. */
function Cylinder({ cx, cy, r, z0, z1, side, top }: { cx: number; cy: number; r: number; z0: number; z1: number; side: string; top: string }) {
  const k = r / Math.SQRT2;
  return (
    <>
      <polygon className={side} points={pts(disc(cx, cy, z0, r, 14))} />
      <polygon className={side} points={pts([[cx + k, cy - k, z0], [cx - k, cy + k, z0], [cx - k, cy + k, z1], [cx + k, cy - k, z1]])} />
      <polygon className={top} points={pts(disc(cx, cy, z1, r, 14))} />
    </>
  );
}

/** The soft shadow a piece of furniture leaves on the floor, cast to +x. */
function Contact({ x0, x1, y0, y1, z = FLOOR }: { x0: number; x1: number; y0: number; y1: number; z?: number }) {
  return <polygon className={styles.contact} points={pts(quadZ(z + 0.004, x0 + 0.1, x1 + 0.45, y0 - 0.05, y1 + 0.2))} />;
}

function Line({ a, b, className }: { a: P3; b: P3; className: string }) {
  return <polyline className={className} points={pts([a, b])} />;
}

interface Hole {
  u0: number;
  u1: number;
  z0: number;
  z1: number;
}

/** Text lying flat on the drawing sheet, reading along +x (or +y). */
function PlanText({ at, size, along = "x", children }: { at: P3; size: number; along?: "x" | "y"; children: ReactNode }) {
  const [ox, oy] = xy(at);
  const m = along === "x" ? [C * S, H * S, -C * S, H * S] : [-C * S, H * S, -C * S, -H * S];
  return (
    <text className={styles.sheetText} transform={`matrix(${m.map(n1).join(" ")} ${n1(ox)} ${n1(oy)})`} fontSize={size}>
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
function Part({ at: [ox, oy], children }: { at: readonly [number, number]; children: ReactNode }) {
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
  backWalls: [0, 0],
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

// Precomputed floor boards: 0.6 ft wide rows of white oak with staggered butt joints,
// batched into one <path> per tone to keep homepage DOM size well under 1,500 elements.
const PLANK_PATHS = (() => {
  const byTone: [string[], string[], string[]] = [[], [], []];
  for (let row = 0; row * 0.6 < D - 1e-6; row++) {
    const y0 = row * 0.6;
    const y1 = Math.min(D, y0 + 0.6);
    let x = 0;
    let next = ((row * 3.7) % 5.5) + 1.2;
    for (let i = 0; x < W; i++) {
      const x1 = Math.min(W, next);
      byTone[(row * 5 + i * 2) % 3].push(loop(quadZ(FLOOR, x, x1, y0, y1)));
      x = x1;
      next = x1 + 6.4 + ((row + i) % 3) * 0.9;
    }
  }
  return [byTone[0].join(" "), byTone[1].join(" "), byTone[2].join(" ")] as const;
})();

function DrawingSheet({ x0, x1, y0, y1, paper, children }: { x0: number; x1: number; y0: number; y1: number; paper: string; children?: ReactNode }) {
  return (
    <>
      <polygon className={styles.sheetEdge} points={pts([[x1, y0, 0], [x1, y1, 0], [x1, y1, -0.12], [x1, y0, -0.12]])} />
      <polygon className={styles.sheetEdge} points={pts([[x0, y1, 0], [x1, y1, 0], [x1, y1, -0.12], [x0, y1, -0.12]])} />
      <polygon className={paper} points={pts(quadZ(0, x0, x1, y0, y1))} />
      <polygon className={styles.sheetBorder} points={pts(quadZ(0, x0 + 0.6, x1 - 0.6, y0 + 0.6, y1 - 0.6))} />
      {children}
    </>
  );
}

function SoftCosts({ active }: { active: boolean }) {
  const wallRing = `${loop(quadZ(0, 0, W, 0, D))} ${loop(quadZ(0, T, W - T, T, D - T))}`;
  const gapsPath = loops([
    quadZ(0, W - T, W, SLIDER.u0, SLIDER.u1),
    quadZ(0, WINDOW.u0, WINDOW.u1, D - T, D),
    quadZ(0, DOOR.u0, DOOR.u1, D - T, D),
  ]);
  const gridLinesPath = segs([
    ...[0, 10, 20].map((x): [P3, P3] => [[x, -0.5, 0], [x, 32, 0]]),
    ...[0, 10, 20, 30].map((y): [P3, P3] => [[-0.5, y, 0], [24, y, 0]]),
  ]);
  const gridBubblesPath = loops([
    ...[0, 10, 20].map((x) => disc(x, 33, 0, 0.9)),
    ...[0, 10, 20, 30].map((y) => disc(25.3, y, 0, 0.9)),
  ]);
  const joistsPath = segs(range(2, 18, 2).map((x): [P3, P3] => [[x, 0.5, 0], [x, 29.5, 0]]));
  const planLinesPath = segs([
    [[W - T / 2, SLIDER.u0, 0], [W - T / 2, SLIDER.u1, 0]],
    [[W - T * 0.2, SLIDER.u0, 0], [W - T * 0.2, SLIDER.u1, 0]],
    [[WINDOW.u0, D - T / 2, 0], [WINDOW.u1, D - T / 2, 0]],
  ]);
  const interiorWallsPath = loops([
    quadZ(0, 8, 8.35, T, 9.35),
    quadZ(0, T, 4.5, 9, 9.35),
    quadZ(0, 7, 8.35, 9, 9.35),
  ]);
  const fixturesPath = [
    loop(quadZ(0, 9.5, 15.5, 0.6, 7.5)),
    seg([9.5, 3.2, 0], [15.5, 3.2, 0]),
    loop(quadZ(0, T, 2.8, 12, 22)),
    loop(quadZ(0, T, 3, 22.3, 25)),
    loop(quadZ(0, 6, 9, 13, 17)),
    loop(quadZ(0, 10, 12.8, 21.5, 28)),
    loop(quadZ(0, 14, 16.2, 23, 26.5)),
    loop(quadZ(0, T, 3.5, T, 3.5)),
    loop(disc(1.4, 5.8, 0, 0.7, 14)),
    loop(quadZ(0, 5, 7.6, T, 2.2)),
  ].join(" ");
  const dimsPath = segs([
    [[0, -2, 0], [W, -2, 0]],
    ...[0, 10, W].map((x): [P3, P3] => [[x - 0.35, -2.35, 0], [x + 0.35, -1.65, 0]]),
    [[-2, 0, 0], [-2, D, 0]],
    ...[0, 9.35, 22, D].map((y): [P3, P3] => [[-2.35, y - 0.35, 0], [-1.65, y + 0.35, 0]]),
    [[W + 1.5, 12, 0], [W + 1.5, 20, 0]],
  ]);
  const scaleDarkPath = loops([0, 2].map((i) => quadZ(0, -1 + i * 1.5, 0.5 + i * 1.5, 31.6, 32.2)));
  const scaleLightPath = loops([1, 3].map((i) => quadZ(0, -1 + i * 1.5, 0.5 + i * 1.5, 31.6, 32.2)));
  const titleLinesPath = segs([
    [[21.5, 30, 0], [27, 30, 0]],
    [[21.5, 31.6, 0], [27, 31.6, 0]],
  ]);
  return (
    <g className={styles.layer} data-active={active}>
      {/* S-101: foundation plan with the structural grid. */}
      <Part at={OFFSET.sheetEngineering}>
        <DrawingSheet x0={-3} x1={28} y0={-2} y1={35} paper={styles.sheetPaperB}>
          <polygon className={styles.planFixture} points={pts(quadZ(0, -0.5, W + 0.5, -0.5, D + 0.5))} />
          <polygon className={styles.footing} points={pts(quadZ(0, 0.4, W - 0.4, 0.4, D - 0.4))} />
          <path className={styles.gridLine} d={gridLinesPath} />
          <path className={styles.gridBubble} d={gridBubblesPath} />
          <path className={styles.sheetFine} d={joistsPath} />
        </DrawingSheet>
      </Part>

      {/* A-101: the floor plan. */}
      <Part at={OFFSET.sheetPlan}>
        <DrawingSheet x0={-4} x1={28} y0={-4} y1={34} paper={styles.sheetPaper}>
          <path className={styles.planWall} d={wallRing} fillRule="evenodd" />
          <path className={styles.planGap} d={gapsPath} />
          <path className={styles.planLine} d={planLinesPath} />
          <path className={styles.planWall} d={interiorWallsPath} />
          <polyline className={styles.planSwing} points={pts(arc(DOOR.u0, D - T, 3, 0, -Math.PI / 2))} />
          <Line className={styles.planLine} a={[DOOR.u0, D - T, 0]} b={[DOOR.u0, D - T - 3, 0]} />
          <polyline className={styles.planSwing} points={pts(arc(7, 9, 2.5, Math.PI, Math.PI * 1.5))} />
          <Line className={styles.planLine} a={[7, 9, 0]} b={[7, 6.5, 0]} />
          {/* Fixtures and furniture in outline. */}
          <path className={styles.planFixture} d={fixturesPath} />
          {/* Dimension strings and section marker. */}
          <path className={styles.planDim} d={dimsPath} />
          <PlanText at={[7.6, -2.5, 0]} size={1.1}>20&apos;-0&quot;</PlanText>
          <PlanText at={[-2.5, 18.2, 0]} size={1.1} along="y">30&apos;-0&quot;</PlanText>
          <PlanText at={[10.6, 4.6, 0]} size={0.85}>BEDROOM</PlanText>
          <PlanText at={[1.6, 7.6, 0]} size={0.85}>BATH</PlanText>
          <PlanText at={[4.5, 20, 0]} size={0.85}>KITCHEN</PlanText>
          <PlanText at={[13.4, 19.6, 0]} size={0.85}>LIVING</PlanText>
          {/* Section marker bubble and scale bar. */}
          <polygon className={styles.gridBubble} points={pts(disc(W + 1.5, 11, 0, 0.9))} />
          <polygon className={styles.northArrow} points={pts([[W + 0.9, 20, 0], [W + 2.1, 20, 0], [W + 1.5, 21.2, 0]])} />
          <path className={styles.scaleDark} d={scaleDarkPath} />
          <path className={styles.scaleLight} d={scaleLightPath} />
          {/* Title block, north arrow and the engineer's seal. */}
          <polygon className={styles.titleBlock} points={pts(quadZ(0, 21.5, 27, 24, 33))} />
          <path className={styles.sheetFine} d={titleLinesPath} />
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

const CEDAR_LIT = [styles.cedarLitA, styles.cedarLitB, styles.cedarLitC];
const CEDAR_SHADE = [styles.cedarShadeA, styles.cedarShadeB, styles.cedarShadeC];
const BOARD_ORDER = [0, 2, 1, 0, 1, 2, 2, 0, 1, 1, 0, 2];

/**
 * One exterior wall: cedar board-and-batten clipped around its openings,
 * corner boards, base and frieze trim, reveals that show the wall's depth,
 * sconces and the top plate.
 */
function CladWall({ plane, holes, sconces }: { plane: "x" | "y"; holes: readonly Hole[]; sconces: readonly number[] }) {
  const isX = plane === "x";
  const len = isX ? D - T : W;
  const top = (u: number) => (isX ? wallTop(W) : wallTop(u));
  const at = (u: number, z: number, out = 0): P3 => (isX ? [W + out, u, z] : [u, D + out, z]);
  const inset = (u: number, z: number): P3 => (isX ? [W - T, u, z] : [u, D - T, z]);
  const band = (u0: number, u1: number, z0: (u: number) => number, z1: (u: number) => number, out = 0) => [
    at(u0, z0(u0), out),
    at(u1, z0(u1), out),
    at(u1, z1(u1), out),
    at(u0, z1(u0), out),
  ];
  const outline = band(0, len, () => FLOOR, top);
  const face = [loop(outline), ...holes.map((h) => loop(band(h.u0, h.u1, () => h.z0, () => h.z1)))].join(" ");
  const clipId = `cost-stack-clad-${plane}`;
  const tones = isX ? CEDAR_SHADE : CEDAR_LIT;
  const boards = range(0, len - 0.5, 1);
  const boardGroups: [string[], string[], string[]] = [[], [], []];
  boards.forEach((u, i) => {
    boardGroups[pick(BOARD_ORDER, i)].push(loop(band(u, Math.min(len, u + 1), () => FLOOR, top)));
  });
  const battensPath = loops(boards.slice(1).map((u) => band(u - 0.08, u + 0.08, () => FLOOR, top, 0.06)));
  const battenGapsPath = segs(boards.slice(1).map((u): [P3, P3] => [at(u + 0.09, FLOOR, 0.02), at(u + 0.09, top(u + 0.09), 0.02)]));
  const clipTrimPath = loops([
    band(0, len, () => FLOOR, () => FLOOR + 0.55, 0.08),
    band(0, len, (u) => top(u) - 0.55, top, 0.08),
  ]);
  const cornerTrimPath = loops([
    band(0, 0.4, () => FLOOR, top, 0.09),
    band(len - 0.4, len, () => FLOOR, top, 0.09),
  ]);
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={face} clipRule="evenodd" />
        </clipPath>
      </defs>
      {/* The wall's cut end. */}
      {isX ? (
        <polygon className={styles.cedarEnd} points={pts([[W - T, len, FLOOR], [W, len, FLOOR], [W, len, top(len)], [W - T, len, top(len)]])} />
      ) : (
        <polygon className={styles.cedarEndShade} points={pts([[W, D - T, FLOOR], [W, D, FLOOR], [W, D, wallTop(W)], [W, D - T, wallTop(W)]])} />
      )}
      <g clipPath={`url(#${clipId})`}>
        {boardGroups.map((group, toneIdx) =>
          group.length > 0 ? <path key={`bg${toneIdx}`} className={tones[toneIdx]} d={group.join(" ")} /> : null,
        )}
        <path className={isX ? styles.battenShade : styles.battenLit} d={battensPath} />
        <path className={styles.battenGap} d={battenGapsPath} />
        <path className={isX ? styles.trimShade : styles.trim} d={clipTrimPath} />
      </g>
      {/* Corner boards. */}
      <path className={isX ? styles.trimShade : styles.trim} d={cornerTrimPath} />
      {/* Reveals: the near jamb and the sill show the wall's thickness. */}
      {holes.map((h, i) => (
        <g key={`r${i}`}>
          <polygon className={styles.reveal} points={pts([inset(h.u0, h.z0), at(h.u0, h.z0), at(h.u0, h.z1), inset(h.u0, h.z1)])} />
          {h.z0 > FLOOR && <polygon className={styles.revealSill} points={pts([inset(h.u0, h.z0), inset(h.u1, h.z0), at(h.u1, h.z0), at(h.u0, h.z0)])} />}
        </g>
      ))}
      {/* Wall sconces with a warm lens facing out. */}
      {sconces.map((u) =>
        isX ? (
          <Box key={`sc${u}`} b={[W, W + 0.35, u - 0.22, u + 0.22, 7.5, 8.4]} top={styles.bronzeLit} side={styles.sconce} front={styles.bronze} />
        ) : (
          <Box key={`sc${u}`} b={[u - 0.22, u + 0.22, D, D + 0.35, 7.1, 8]} top={styles.bronzeLit} side={styles.bronze} front={styles.sconce} />
        ),
      )}
      {/* Top plate: the section cut through the stud wall. */}
      <polygon
        className={styles.plate}
        points={pts(isX ? [[W - T, 0, top(0)], [W, 0, top(0)], [W, len, top(len)], [W - T, len, top(len)]] : [[0, D - T, top(0)], [W, D - T, top(W)], [W, D, top(W)], [0, D, top(0)]])}
      />
      <Line className={styles.plateLine} a={isX ? [W - T + 0.06, 0, top(0)] : [0, D - T + 0.06, top(0)]} b={isX ? [W - T + 0.06, len, top(len)] : [W, D - T + 0.06, top(W)]} />
    </>
  );
}

function Shell({ active }: { active: boolean }) {
  const slabJointsPath = segs([
    ...[10, 20].map((y): [P3, P3] => [[-0.5, y, 0.9], [W + 0.5, y, 0.9]]),
    [[10, -0.5, 0.9], [10, D + 0.5, 0.9]],
  ]);
  const anchorPoints: readonly [number, number][] = [
    ...range(2, 18, 4).flatMap((x): [number, number][] => [[x, 0.25], [x, D - 0.25]]),
    ...range(4, 26, 4).flatMap((y): [number, number][] => [[0.25, y], [W - 0.25, y]]),
  ];
  const washersPath = loops(anchorPoints.map(([x, y]) => disc(x, y, 0.91, 0.26, 10)));
  const boltK = 0.09 / Math.SQRT2;
  const boltsPath = loops(
    anchorPoints.flatMap(([x, y]) => [
      disc(x, y, 0.91, 0.09, 14),
      [[x + boltK, y - boltK, 0.91], [x - boltK, y + boltK, 0.91], [x - boltK, y + boltK, 1.3], [x + boltK, y - boltK, 1.3]] as P3[],
      disc(x, y, 1.3, 0.09, 14),
    ]),
  );
  const bathGroutPath = segs([
    ...range(T + 1, 7.5, 1).map((x): [P3, P3] => [[x, T, FLOOR + 0.012], [x, 9, FLOOR + 0.012]]),
    ...range(T + 1, 8.5, 1).map((y): [P3, P3] => [[T, y, FLOOR + 0.012], [8, y, FLOOR + 0.012]]),
  ]);
  const rugStripesPath = segs(range(22, 27.5, 1.1).map((y): [P3, P3] => [[9.9, y, FLOOR + 0.02], [17.1, y, FLOOR + 0.02]]));
  const deckGroups: [string[], string[], string[]] = [[], [], []];
  range(W, W + 6.55, 0.45).forEach((x, i) => {
    deckGroups[pick(BOARD_ORDER, i)].push(loop(quadZ(FLOOR, x + 0.04, x + 0.41, 9, 23)));
  });
  const deckEndsPath = segs(range(W + 0.45, W + 6.6, 0.45).map((x): [P3, P3] => [[x, 23, 0.1], [x, 23, FLOOR]]));
  const backsplashGroutPath = segs([
    ...range(4.48, 7.1, 0.33).map((z): [P3, P3] => [[T + 0.03, 12, z], [T + 0.03, 22, z]]),
    ...range(12.67, 21.4, 0.67).flatMap((y, i) =>
      range(4.15, 7.07, 0.33).flatMap((z, j): [P3, P3][] =>
        (i + j) % 2 === 0 ? [[[T + 0.03, y, z], [T + 0.03, y, Math.min(7.4, z + 0.33)]]] : [],
      ),
    ),
  ]);
  const upperHandlesPath = segs([13.6, 14.2, 15.45, 16.05].map((y): [P3, P3] => [[1.82, y, 7.6], [1.82, y, 8.2]]));
  const baseCabinetLinesPath = segs([
    [[2.81, 12, 3.3], [2.81, 22, 3.3]],
    ...range(14.5, 19.5, 2.5).map((y): [P3, P3] => [[2.81, y, FLOOR + 0.35], [2.81, y, 3.9]]),
  ]);
  const lowerHandlesPath = segs([13.25, 15.75, 18.25, 20.75].map((y): [P3, P3] => [[2.83, y - 0.4, 3.6], [2.83, y + 0.4, 3.6]]));
  const burnersPath = loops([[1.25, 18.6], [2.15, 18.6], [1.25, 19.7], [2.15, 19.7]].map(([x, y]) => disc(x, y, 4.17, 0.32, 12)));
  const fridgeHandlesPath = segs([[23.45, 5.6, 7.3], [23.85, 5.6, 7.3], [23.65, 3.2, 4.9]].map(([y, z0, z1]): [P3, P3] => [[3.03, y, z0], [3.03, y, z1]]));
  return (
    <g className={styles.layer} data-active={active}>
      {/* Slab: thickened edge, control joints, anchor bolts and the plumbing and power stub-outs. */}
      <Part at={OFFSET.slab}>
        <Box b={[-0.5, W + 0.5, -0.5, D + 0.5, -1.2, 0.9]} top={styles.concreteTop} side={styles.concreteSide} front={styles.concreteFront} />
        <Line className={styles.slabLine} a={[W + 0.5, -0.5, 0]} b={[W + 0.5, D + 0.5, 0]} />
        <Line className={styles.slabLine} a={[-0.5, D + 0.5, 0]} b={[W + 0.5, D + 0.5, 0]} />
        <path className={styles.joint} d={slabJointsPath} />
        <path className={styles.washer} d={washersPath} />
        <path className={styles.bolt} d={boltsPath} />
        <Cylinder cx={1.4} cy={5.8} r={0.3} z0={0.9} z1={1.2} side={styles.abs} top={styles.absTop} />
        <Cylinder cx={2} cy={2} r={0.22} z0={0.9} z1={1.15} side={styles.abs} top={styles.absTop} />
        <Cylinder cx={6.3} cy={1.2} r={0.2} z0={0.9} z1={1.3} side={styles.abs} top={styles.absTop} />
        <Cylinder cx={1.4} cy={14.9} r={0.22} z0={0.9} z1={1.3} side={styles.abs} top={styles.absTop} />
        {[[5.9, 0.8], [1, 14.3]].map(([x, y]) => (
          <Cylinder key={`pr${x}`} cx={x} cy={y} r={0.07} z0={0.9} z1={2.1} side={styles.pexRed} top={styles.pexRed} />
        ))}
        {[[6.7, 0.8], [1, 15.5], [1, 23]].map(([x, y]) => (
          <Cylinder key={`pb${x}-${y}`} cx={x} cy={y} r={0.07} z0={0.9} z1={2.1} side={styles.pexBlue} top={styles.pexBlue} />
        ))}
        {[[9.2, 0.9], [1, 19], [16.6, 0.9]].map(([x, y]) => (
          <Cylinder key={`cd${x}-${y}`} cx={x} cy={y} r={0.1} z0={0.9} z1={1.8} side={styles.conduit} top={styles.conduitTop} />
        ))}
      </Part>

      {/* Finished floor, deck, landing and everything on the floor plane. */}
      <Part at={OFFSET.floor}>
        <Box b={[0, W, 0, D, 0.9, FLOOR]} top={styles.oakA} side={styles.oakEdge} front={styles.oakEdge} />
        <path className={styles.oakA} d={PLANK_PATHS[0]} />
        <path className={styles.oakB} d={PLANK_PATHS[1]} />
        <path className={styles.oakC} d={PLANK_PATHS[2]} />
        {/* Bath: porcelain tile floor and the shower tray. */}
        <polygon className={styles.tile} points={pts(quadZ(FLOOR + 0.01, T, 8, T, 9))} />
        <path className={styles.grout} d={bathGroutPath} />
        <polygon className={styles.porcelainTop} points={pts(quadZ(FLOOR + 0.05, T, 3.5, T, 3.5))} />
        <polygon className={styles.drain} points={pts(disc(2, 2, FLOOR + 0.06, 0.22, 10))} />
        {/* Living rug. */}
        <polygon className={styles.rugBorder} points={pts(quadZ(FLOOR + 0.01, 9.5, 17.5, 20.5, 29))} />
        <polygon className={styles.rug} points={pts(quadZ(FLOOR + 0.015, 9.9, 17.1, 20.9, 28.6))} />
        <path className={styles.rugStripe} d={rugStripesPath} />

        {/* Redwood deck on the slider side: boards with gaps, a rim and two steps. */}
        <Box b={[W, W + 7, 9, 23, 0.1, FLOOR]} top={styles.deckA} side={styles.deckSide} front={styles.deckFront} />
        <path className={styles.deckA} d={deckGroups[0].join(" ")} />
        <path className={styles.deckB} d={deckGroups[1].join(" ")} />
        <path className={styles.deckC} d={deckGroups[2].join(" ")} />
        <path className={styles.deckEnd} d={deckEndsPath} />
        <Box b={[W + 7, W + 8.3, 12.5, 19.5, 0.05, 0.62]} top={styles.deckB} side={styles.deckSide} front={styles.deckFront} />
        <Box b={[W + 8.3, W + 9.6, 12.5, 19.5, 0, 0.28]} top={styles.deckA} side={styles.deckSide} front={styles.deckFront} />
        {/* Two teak lounge chairs, a side table and a planter. */}
        {[10.3, 13.6].map((y) => (
          <g key={`ch${y}`}>
            <Contact x0={W + 2.4} x1={W + 4.6} y0={y} y1={y + 2} />
            <Box b={[W + 2.4, W + 4.6, y, y + 2, FLOOR, 2.3]} top={styles.teak} side={styles.teakShade} front={styles.teakDark} />
            <Box b={[W + 2.4, W + 2.8, y, y + 2, 2.3, 4]} top={styles.teak} side={styles.teakShade} front={styles.teakDark} />
            <Box b={[W + 2.9, W + 4.5, y + 0.15, y + 1.85, 2.3, 2.6]} top={styles.upholsteryTop} side={styles.upholsteryShade} front={styles.upholstery} />
          </g>
        ))}
        <Cylinder cx={W + 3.5} cy={12.9} r={0.45} z0={FLOOR} z1={2.6} side={styles.teakDark} top={styles.teak} />
        <Contact x0={W + 5.2} x1={W + 6.5} y0={20.6} y1={22.6} />
        <Box b={[W + 5.2, W + 6.5, 20.6, 22.6, FLOOR, 2.6]} top={styles.soil} side={styles.terracottaShade} front={styles.terracotta} />
        {[[W + 5.6, 21.2, 3.3, 0.75, 0], [W + 6.1, 22, 3.1, 0.6, 1], [W + 5.7, 21.9, 3.9, 0.55, 2], [W + 6, 21.3, 4.3, 0.45, 1]].map(([x, y, z, r, t]) => (
          <polygon key={`pl${x}-${y}-${z}`} className={pick([styles.leafA, styles.leafB, styles.leafC], t)} points={pts(disc(x, y, z, r, 12))} />
        ))}
        {/* Concrete landing and doormat at the entry. */}
        <Box b={[DOOR.u0 - 0.8, DOOR.u1 + 0.8, D, D + 2.6, 0, 0.55]} top={styles.concreteTop} side={styles.concreteSide} front={styles.concreteFront} />
        <polygon className={styles.doormat} points={pts(quadZ(0.56, DOOR.u0 + 0.2, DOOR.u1 - 0.2, D + 0.3, D + 1.8))} />
      </Part>

      {/* Back walls: drywall inside faces, baseboards, art and the bath mirror. */}
      <Part at={OFFSET.backWalls}>
        <polygon className={styles.drywallShade} points={pts([[T, T, FLOOR], [T, D - T, FLOOR], [T, D - T, wallTop(T)], [T, T, wallTop(T)]])} />
        <polygon className={styles.drywall} points={pts([[T, T, FLOOR], [W - T, T, FLOOR], [W - T, T, wallTop(W - T)], [T, T, wallTop(T)]])} />
        <polygon className={styles.baseboard} points={pts(quadX(T + 0.02, T, D - T, FLOOR, FLOOR + 0.35))} />
        <polygon className={styles.baseboard} points={pts(quadY(T + 0.02, T, W - T, FLOOR, FLOOR + 0.35))} />
        <polygon className={styles.walnut} points={pts(quadY(T + 0.03, 10.6, 14.4, 5.8, 8.4))} />
        <polygon className={styles.linen} points={pts(quadY(T + 0.04, 10.8, 14.2, 6, 8.2))} />
        <polygon className={styles.artOchre} points={pts(quadY(T + 0.05, 11.2, 12.9, 6.4, 7.8))} />
        <polygon className={styles.artTeal} points={pts(quadY(T + 0.05, 12.5, 13.8, 6.4, 7.3))} />
        <polygon className={styles.walnut} points={pts(quadY(T + 0.03, 5.1, 7.5, 4.6, 7.6))} />
        <polygon className={styles.mirror} points={pts(quadY(T + 0.04, 5.25, 7.35, 4.75, 7.45))} />
        <polygon className={styles.glint} points={pts([[5.5, T + 0.05, 7.3], [6.2, T + 0.05, 7.3], [5.5, T + 0.05, 5.6]])} />
        <polygon className={styles.plate} points={pts([[0, 0, wallTop(0)], [W, 0, wallTop(W)], [W, T, wallTop(W)], [0, T, wallTop(0)]])} />
        <polygon className={styles.plate} points={pts([[0, 0, wallTop(0)], [T, 0, wallTop(T)], [T, D, wallTop(T)], [0, D, wallTop(0)]])} />
      </Part>

      {/* Bath fixtures, behind the partitions. */}
      <Part at={OFFSET.floor}>
        <Contact x0={5} x1={7.6} y0={T} y1={2.2} />
        <Box b={[5, 7.6, T, 2.2, FLOOR + 0.6, 3.6]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
        <Box b={[5, 7.6, T, 2.25, 3.6, 3.8]} top={styles.porcelainTop} side={styles.porcelainShade} front={styles.porcelain} />
        <polygon className={styles.basin} points={pts(disc(6.3, 1.35, 3.81, 0.55, 14))} />
        <Line className={styles.faucet} a={[6.3, 0.7, 3.8]} b={[6.3, 0.7, 4.4]} />
        <Contact x0={T} x1={2.2} y0={5.1} y1={6.5} />
        <Box b={[T, 1.2, 5.2, 6.4, FLOOR, 3.4]} top={styles.porcelainTop} side={styles.porcelainShade} front={styles.porcelain} />
        <Box b={[T, 2.2, 5.1, 6.5, FLOOR, 2.4]} top={styles.porcelainTop} side={styles.porcelainShade} front={styles.porcelain} />
        <polygon className={styles.showerGlass} points={pts(quadX(3.5, T, 3.5, FLOOR, 8))} />
        <Line className={styles.handle} a={[3.5, T, 8]} b={[3.5, 3.5, 8]} />
        <Line className={styles.faucet} a={[1.6, T + 0.05, 7.2]} b={[1.6, 1.1, 7]} />
      </Part>
      {/* Bath partitions. */}
      <Part at={OFFSET.backWalls}>
        <Box b={[T, 4.5, 9, 9.35, FLOOR, 9.4]} top={styles.plate} side={styles.drywallShade} front={styles.drywall} />
        <Box b={[7, 8.35, 9, 9.35, FLOOR, 9.4]} top={styles.plate} side={styles.drywallShade} front={styles.drywall} />
        <Box b={[8, 8.35, T, 9, FLOOR, 9.4]} top={styles.plate} side={styles.drywallShade} front={styles.drywall} />
        <Box b={[4.5, 7, 9, 9.35, 8, 9.4]} top={styles.plate} side={styles.drywallShade} front={styles.drywall} />
        <polygon className={styles.baseboard} points={pts(quadX(8.37, T, 9.35, FLOOR, FLOOR + 0.35))} />
      </Part>

      {/* Furniture, back to front. */}
      <Part at={OFFSET.floor}>
        {/* Kitchen: tile backsplash, uppers, range hood, base run, quartz top, sink, cooktop and fridge. */}
        <polygon className={styles.backsplash} points={pts(quadX(T + 0.02, 12, 22, 4.15, 7.4))} />
        <path className={styles.grout} d={backsplashGroutPath} />
        <Box b={[T, 1.8, 12, 17.6, 7.4, 10]} top={styles.cabinetTop} side={styles.cabinetShade} front={styles.cabinet} />
        {[13.9, 15.75].map((y) => (
          <Line key={`uc${y}`} className={styles.cabinetLine} a={[1.8, y, 7.4]} b={[1.8, y, 10]} />
        ))}
        <path className={styles.handle} d={upperHandlesPath} />
        <Box b={[T, 1.1, 18.6, 19.6, 7.6, wallTop(1)]} top={styles.steelTop} side={styles.steelShade} front={styles.steel} />
        <Box b={[T, 1.8, 17.9, 20.3, 6.7, 7.6]} top={styles.steelTop} side={styles.steelShade} front={styles.steel} />
        <Box b={[T, 1.8, 20.6, 22, 7.4, 10]} top={styles.cabinetTop} side={styles.cabinetShade} front={styles.cabinet} />
        <Contact x0={T} x1={3} y0={12} y1={25} />
        <Box b={[T, 2.8, 12, 22, FLOOR, 3.9]} top={styles.cabinetTop} side={styles.cabinetShade} front={styles.cabinet} />
        <polygon className={styles.toeKick} points={pts(quadX(2.81, 12, 22, FLOOR, FLOOR + 0.35))} />
        <path className={styles.cabinetLine} d={baseCabinetLinesPath} />
        <path className={styles.handle} d={lowerHandlesPath} />
        <Box b={[T, 3, 11.9, 22.1, 3.9, 4.15]} top={styles.quartz} side={styles.quartzEdge} front={styles.quartzEdge} />
        <polygon className={styles.basin} points={pts(quadZ(4.16, 1, 2.4, 13.9, 16))} />
        <polyline className={styles.faucet} points={pts([[0.8, 14.95, 4.16], [0.8, 14.95, 5.25], [1.15, 14.95, 5.35], [1.4, 14.95, 4.95]])} />
        <polygon className={styles.cooktop} points={pts(quadZ(4.16, 0.75, 2.65, 18.1, 20.2))} />
        <path className={styles.burner} d={burnersPath} />
        <Box b={[T, 3, 22.3, 25, FLOOR, 7.8]} top={styles.steelTop} side={styles.steelShade} front={styles.steel} />
        <Line className={styles.steelLine} a={[3.01, 22.3, 5.2]} b={[3.01, 25, 5.2]} />
        <Line className={styles.steelLine} a={[3.01, 23.65, 5.2]} b={[3.01, 23.65, 7.8]} />
        <path className={styles.handle} d={fridgeHandlesPath} />
        <Box b={[T, 2.6, 22.3, 25, 8, 10]} top={styles.cabinetTop} side={styles.cabinetShade} front={styles.cabinet} />

        {/* Dining: walnut table, four chairs, a vase. */}
        {[14, 15.9].map((y) => (
          <g key={`cl${y}`}>
            <Contact x0={4.7} x1={5.7} y0={y} y1={y + 1.1} />
            <Box b={[4.7, 5.7, y, y + 1.1, 2.4, 2.65]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
            <Box b={[5.5, 5.62, y + 0.9, y + 1.02, FLOOR, 2.4]} top={styles.walnut} side={styles.walnutShade} front={styles.walnutShade} />
            <Box b={[4.7, 4.95, y, y + 1.1, 2.65, 4.3]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
          </g>
        ))}
        <Contact x0={6} x1={9} y0={13} y1={17} />
        {[[6.1, 13.2], [8.7, 13.2], [6.1, 16.6], [8.7, 16.6]].map(([x, y]) => (
          <Box key={`tl${x}-${y}`} b={[x, x + 0.2, y, y + 0.2, FLOOR, 3.45]} top={styles.walnut} side={styles.walnutShade} front={styles.walnutShade} />
        ))}
        <Box b={[6, 9, 13, 17, 3.45, 3.65]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
        <Cylinder cx={7.5} cy={15} r={0.3} z0={3.65} z1={4.6} side={styles.porcelainShade} top={styles.porcelainTop} />
        {[[7.3, 14.8, 5, 0.38, 0], [7.8, 15.2, 5.2, 0.32, 1], [7.5, 15.1, 5.6, 0.28, 2]].map(([x, y, z, r, t]) => (
          <polygon key={`vl${x}-${z}`} className={pick([styles.leafA, styles.leafB, styles.leafC], t)} points={pts(disc(x, y, z, r, 10))} />
        ))}
        {[14, 15.9].map((y) => (
          <g key={`cr${y}`}>
            <Contact x0={9.3} x1={10.3} y0={y} y1={y + 1.1} />
            <Box b={[9.3, 10.3, y, y + 1.1, 2.4, 2.65]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
            <Box b={[10.15, 10.3, y + 0.9, y + 1.05, FLOOR, 2.4]} top={styles.walnut} side={styles.walnutShade} front={styles.walnutShade} />
            <Box b={[10.05, 10.3, y, y + 1.1, 2.65, 4.3]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
          </g>
        ))}

        {/* Bed: walnut frame, upholstered headboard, linen, duvet and a throw. */}
        <Contact x0={9.5} x1={15.5} y0={T} y1={7.5} />
        <Box b={[9.5, 15.5, T, 0.95, FLOOR, 4.7]} top={styles.upholsteryTop} side={styles.upholsteryShade} front={styles.upholstery} />
        <Box b={[9.5, 15.5, 0.95, 7.5, FLOOR + 0.3, 2.1]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
        <Box b={[9.6, 15.4, 0.95, 7.4, 2.1, 2.9]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[10, 12.3, 1.1, 2.5, 2.9, 3.4]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[12.7, 15, 1.1, 2.5, 2.9, 3.4]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Box b={[9.55, 15.45, 3, 7.45, 2.2, 2.98]} top={styles.duvet} side={styles.duvetShade} front={styles.duvetMid} />
        <polygon className={styles.linen} points={pts(quadZ(2.99, 9.55, 15.45, 3, 3.6))} />
        <Box b={[9.55, 15.45, 5.6, 6.6, 2.2, 3.02]} top={styles.throwTop} side={styles.throwShade} front={styles.throwShade} />
        {/* Nightstands and lamps. */}
        {[[8.45, 9.4], [15.9, 17.4]].map(([x0, x1]) => (
          <g key={`ns${x0}`}>
            <Contact x0={x0} x1={x1} y0={0.6} y1={2.1} />
            <Box b={[x0, x1, 0.6, 2.1, FLOOR, 3.2]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
            <Line className={styles.cabinetLine} a={[x1 + 0.01, 0.6, 2.3]} b={[x1 + 0.01, 2.1, 2.3]} />
            <Cylinder cx={(x0 + x1) / 2} cy={1.35} r={0.18} z0={3.2} z1={4} side={styles.brass} top={styles.brass} />
            <Cylinder cx={(x0 + x1) / 2} cy={1.35} r={0.45} z0={4} z1={4.9} side={styles.lampShade} top={styles.lampTop} />
          </g>
        ))}

        {/* Living: sofa facing the slider, pillows, coffee table with books, floor lamp and a plant. */}
        <Contact x0={10} x1={12.8} y0={21.5} y1={28} />
        <Box b={[10, 12.8, 21.5, 28, FLOOR + 0.25, 2.2]} top={styles.fabricTop} side={styles.fabricShade} front={styles.fabric} />
        <Box b={[10, 10.9, 21.5, 28, 2.2, 4]} top={styles.fabricTop} side={styles.fabricShade} front={styles.fabric} />
        {[[22.3, 24.75], [24.75, 27.2]].map(([y0, y1]) => (
          <Box key={`cu${y0}`} b={[10.9, 12.8, y0 + 0.04, y1 - 0.04, 2.2, 2.75]} top={styles.fabricTop} side={styles.fabricShade} front={styles.fabric} />
        ))}
        <Box b={[10, 12.8, 21.5, 22.3, 2.2, 3.2]} top={styles.fabricTop} side={styles.fabricShade} front={styles.fabric} />
        <Box b={[10, 12.8, 27.2, 28, 2.2, 3.2]} top={styles.fabricTop} side={styles.fabricShade} front={styles.fabric} />
        <Box b={[10.9, 11.5, 22.6, 23.9, 2.75, 3.9]} top={styles.accentTop} side={styles.accentShade} front={styles.accent} />
        <Box b={[10.9, 11.5, 25.9, 27.1, 2.75, 3.8]} top={styles.linen} side={styles.linenShade} front={styles.linenMid} />
        <Contact x0={14} x1={16.2} y0={23} y1={26.5} />
        <Box b={[14, 16.2, 23, 26.5, FLOOR, 2.4]} top={styles.walnutTop} side={styles.walnutShade} front={styles.walnut} />
        <Box b={[14.4, 15.6, 23.4, 24.9, 2.4, 2.6]} top={styles.linen} side={styles.bookA} front={styles.bookA} />
        <Box b={[14.5, 15.5, 23.5, 24.7, 2.6, 2.75]} top={styles.linenMid} side={styles.bookB} front={styles.bookB} />
        <Cylinder cx={15.3} cy={25.6} r={0.3} z0={2.4} z1={2.75} side={styles.porcelainShade} top={styles.porcelainTop} />
        <Cylinder cx={11.4} cy={20.6} r={0.35} z0={FLOOR} z1={FLOOR + 0.12} side={styles.bronze} top={styles.bronzeLit} />
        <Line className={styles.faucet} a={[11.4, 20.6, FLOOR]} b={[11.4, 20.6, 6.2]} />
        <Cylinder cx={11.4} cy={20.6} r={0.55} z0={6.2} z1={7.2} side={styles.lampShade} top={styles.lampTop} />
        <Contact x0={17.8} x1={18.8} y0={27.6} y1={28.6} />
        <Cylinder cx={18.3} cy={28.1} r={0.55} z0={FLOOR} z1={2.4} side={styles.terracotta} top={styles.soil} />
        {[[18.3, 28.1, 3.3, 0.85, 0], [17.9, 27.8, 4.2, 0.65, 1], [18.6, 28.4, 4.6, 0.55, 2], [18.2, 28.3, 5.3, 0.45, 1]].map(([x, y, z, r, t]) => (
          <polygon key={`lf${x}-${y}-${z}`} className={pick([styles.leafA, styles.leafB, styles.leafC], t)} points={pts(disc(x, y, z, r, 12))} />
        ))}
      </Part>

      {/* Front walls swing out to open the room. */}
      <Part at={OFFSET.wallSlider}>
        <CladWall plane="x" holes={[SLIDER, CLERESTORY]} sconces={[SLIDER.u0 - 0.9, SLIDER.u1 + 0.9]} />
        <Callout at={[W, 0, 6]} dx={40} dy={-4} label="03" />
      </Part>
      <Part at={OFFSET.wallEntry}>
        <CladWall plane="y" holes={[WINDOW, DOOR]} sconces={[DOOR.u1 + 0.9]} />
      </Part>
    </g>
  );
}

/** A framed, glazed unit in a wall plane: casing, frame, sashes, glass and reflections. */
function Glazing({ plane, hole, panes, at, handles = [] }: { plane: "x" | "y"; hole: Hole; panes: number; at: number; handles?: readonly number[] }) {
  const p = (u: number, z: number, out = 0): P3 => (plane === "x" ? [at + out, u, z] : [u, at + out, z]);
  const quad = (u0: number, u1: number, z0: number, z1: number, out = 0) => [p(u0, z0, out), p(u1, z0, out), p(u1, z1, out), p(u0, z1, out)];
  const f = 0.22;
  const s = 0.12;
  const width = (hole.u1 - hole.u0 - f * (panes + 1)) / panes;
  const glass = Array.from({ length: panes }, (_, i) => {
    const u0 = hole.u0 + f + i * (width + f);
    return [u0, u0 + width] as const;
  });
  const casing = `${loop(quad(hole.u0 - 0.32, hole.u1 + 0.32, hole.z0 === FLOOR ? hole.z0 : hole.z0 - 0.32, hole.z1 + 0.32, 0.2))} ${loop(quad(hole.u0, hole.u1, hole.z0, hole.z1, 0.2))}`;
  const frame = [loop(quad(hole.u0, hole.u1, hole.z0, hole.z1)), ...glass.map(([u0, u1]) => loop(quad(u0, u1, hole.z0 + f, hole.z1 - f)))].join(" ");
  const sash = glass.map(([u0, u1]) => `${loop(quad(u0, u1, hole.z0 + f, hole.z1 - f, 0.03))} ${loop(quad(u0 + s, u1 - s, hole.z0 + f + s, hole.z1 - f - s, 0.03))}`).join(" ");
  return (
    <>
      {glass.map(([u0, u1], i) => {
        const z0 = hole.z0 + f + s;
        const z1 = hole.z1 - f - s;
        const h = z1 - z0;
        return (
          <g key={i}>
            <polygon className={styles.glass} points={pts(quad(u0 + s, u1 - s, z0, z1))} />
            <polygon className={styles.glassShade} points={pts([p(u0 + s, z0), p(u1 - s, z0), p(u1 - s, z0 + h * 0.3), p(u0 + s, z0 + h * 0.12)])} />
            <polygon className={styles.glint} points={pts([p(u0 + s + 0.15, z1), p(u0 + s + 0.15 + width * 0.25, z1), p(u0 + s + 0.15, z1 - h * 0.45)])} />
            <polygon className={styles.glintSoft} points={pts([p(u0 + s + width * 0.38, z1), p(u0 + s + width * 0.5, z1), p(u0 + s + width * 0.12, z0 + h * 0.2), p(u0 + s + width * 0.02, z0 + h * 0.32)])} />
          </g>
        );
      })}
      <path className={styles.frame} d={frame} fillRule="evenodd" />
      <path className={styles.sash} d={sash} fillRule="evenodd" />
      <path className={styles.casing} d={casing} fillRule="evenodd" />
      {handles.map((u) => (
        <Line key={`h${u}`} className={styles.handleLight} a={p(u, 4.1, 0.06)} b={p(u, 5, 0.06)} />
      ))}
    </>
  );
}

function Openings({ active }: { active: boolean }) {
  const door = (u0: number, u1: number, z0: number, z1: number, out = 0) => quadY(D - 0.15 + out, u0, u1, z0, z1);
  return (
    <g className={styles.layer} data-active={active}>
      <Part at={OFFSET.openEntry}>
        {/* Casement window with a sill, and the painted entry door with lever and threshold. */}
        <Glazing plane="y" hole={WINDOW} panes={2} at={D - 0.15} handles={[WINDOW.u0 + 2.8]} />
        <Box b={[WINDOW.u0 - 0.45, WINDOW.u1 + 0.45, D - 0.15, D + 0.45, WINDOW.z0 - 0.5, WINDOW.z0 - 0.32]} top={styles.trimTop} side={styles.trimShade} front={styles.trim} />
        <polygon className={styles.door} points={pts(door(DOOR.u0, DOOR.u1, DOOR.z0, DOOR.z1))} />
        {[2.6, 4.2, 5.8].map((z) => (
          <Line key={`dg${z}`} className={styles.doorGroove} a={[DOOR.u0 + 1.2, D - 0.13, z]} b={[DOOR.u1 - 0.25, D - 0.13, z]} />
        ))}
        <polygon className={styles.glass} points={pts(door(DOOR.u0 + 0.3, DOOR.u0 + 0.85, 2, 7.6, 0.01))} />
        <polygon className={styles.glint} points={pts([[DOOR.u0 + 0.35, D - 0.13, 7.5], [DOOR.u0 + 0.6, D - 0.13, 7.5], [DOOR.u0 + 0.35, D - 0.13, 6]])} />
        <Line className={styles.lever} a={[DOOR.u1 - 0.45, D - 0.08, 4.5]} b={[DOOR.u1 - 0.95, D - 0.08, 4.5]} />
        <polygon className={styles.lever} points={pts(quadY(D - 0.1, DOOR.u1 - 0.55, DOOR.u1 - 0.35, 4.2, 4.85))} />
        <Box b={[DOOR.u0 - 0.1, DOOR.u1 + 0.1, D - 0.3, D + 0.15, FLOOR - 0.05, FLOOR + 0.05]} top={styles.steelTop} side={styles.steelShade} front={styles.steel} />
        <path
          className={styles.casing}
          d={`${loop(quadY(D + 0.05, DOOR.u0 - 0.32, DOOR.u1 + 0.32, DOOR.z0, DOOR.z1 + 0.32))} ${loop(quadY(D + 0.05, DOOR.u0, DOOR.u1, DOOR.z0, DOOR.z1))}`}
          fillRule="evenodd"
        />
        <Callout at={[WINDOW.u0, D, WINDOW.z0]} dx={-30} dy={36} label="02" />
      </Part>
      <Part at={OFFSET.openSlider}>
        {/* Three-panel slider and the clerestory above the deck. */}
        <Glazing plane="x" hole={SLIDER} panes={3} at={W - 0.15} handles={[13.6, 18.4]} />
        <Glazing plane="x" hole={CLERESTORY} panes={2} at={W - 0.15} />
      </Part>
    </g>
  );
}

function Roof({ active }: { active: boolean }) {
  const [x0, x1, y0, y1] = [-1.5, W + 1.5, -1.5, D + 1.5];
  const top = (x: number, y: number, lift = 0): P3 => [x, y, zTop(x) + lift];
  const curb = { x0: 4, x1: 9, y0: 8, y1: 13, h: 0.35 };
  const seams = range(y0 + 1.25, y1 - 1, 1.25);
  const metalPanels: [string[], string[]] = [[], []];
  [y0, ...seams].forEach((y, i) => {
    metalPanels[i % 2].push(loop([top(x0, y), top(x1, y), top(x1, Math.min(y1, y + 1.25)), top(x0, Math.min(y1, y + 1.25))]));
  });
  const ribShadowsPath = segs(seams.map((y): [P3, P3] => [top(x0, y + 0.09), top(x1, y + 0.09)]));
  const ribsPath = segs(seams.map((y): [P3, P3] => [top(x0, y, 0.12), top(x1, y, 0.12)]));
  const hangersPath = segs(range(y0 + 1, y1 - 1, 2.5).map((y): [P3, P3] => [[x1, y, zTop(x1) - 0.12], [x1 + 0.55, y, zTop(x1) - 0.12]]));
  const rafter = (ry: number) => {
    const ry1 = ry + 0.28;
    return (
      <g key={`rf${ry}`}>
        <polygon className={styles.firFront} points={pts([[x1, ry, rafterBottom(x1)], [x1, ry1, rafterBottom(x1)], [x1, ry1, rafterTop(x1)], [x1, ry, rafterTop(x1)]])} />
        <polygon className={styles.firSide} points={pts([[x0, ry1, rafterBottom(x0)], [x1, ry1, rafterBottom(x1)], [x1, ry1, rafterTop(x1)], [x0, ry1, rafterTop(x0)]])} />
        <polygon className={styles.firTop} points={pts([[x0, ry, rafterTop(x0)], [x1, ry, rafterTop(x1)], [x1, ry1, rafterTop(x1)], [x0, ry1, rafterTop(x0)]])} />
      </g>
    );
  };
  return (
    <g className={styles.layer} data-active={active}>
      <Part at={OFFSET.rafters}>
        {/* Glulam beams on the wall lines, rafters at 2 ft centres above them. */}
        <Box b={[0, 0.6, y0, y1, rafterBottom(0.3) - 1.1, rafterBottom(0.3)]} top={styles.firTop} side={styles.firFront} front={styles.firSide} />
        <Box b={[W - 0.6, W, y0, y1, rafterBottom(W - 0.3) - 1.1, rafterBottom(W - 0.3)]} top={styles.firTop} side={styles.firFront} front={styles.firSide} />
        {range(-1.2, D + 0.8, 2).map(rafter)}
      </Part>
      <Part at={OFFSET.roof}>
        <polygon className={styles.fascia} points={pts([[x1, y0, zTop(x1) - RT], [x1, y1, zTop(x1) - RT], top(x1, y1), top(x1, y0)])} />
        <polygon className={styles.fasciaLit} points={pts([[x0, y1, zTop(x0) - RT], [x1, y1, zTop(x1) - RT], top(x1, y1), top(x0, y1)])} />
        {/* Standing-seam panels with raised ribs. */}
        <path className={styles.metalA} d={metalPanels[0].join(" ")} />
        <path className={styles.metalB} d={metalPanels[1].join(" ")} />
        <path className={styles.ribShadow} d={ribShadowsPath} />
        <path className={styles.rib} d={ribsPath} />
        <Line className={styles.metalEdge} a={top(x0, y1)} b={top(x1, y1)} />
        <Line className={styles.metalEdge} a={top(x1, y0)} b={top(x1, y1)} />
        {/* Ridge cap flashing on the high edge. */}
        <Box b={[x0 - 0.1, x0 + 0.5, y0, y1, zTop(x0) - 0.3, zTop(x0) + 0.15]} top={styles.metalEdgeFill} side={styles.fasciaLit} front={styles.fasciaLit} />
        {/* Skylight: flashing, curb, frame, glass. */}
        <polygon className={styles.flashing} points={pts([top(curb.x0 - 0.4, curb.y0 - 0.4, 0.02), top(curb.x1 + 0.4, curb.y0 - 0.4, 0.02), top(curb.x1 + 0.4, curb.y1 + 0.4, 0.02), top(curb.x0 - 0.4, curb.y1 + 0.4, 0.02)])} />
        <polygon className={styles.bronze} points={pts([top(curb.x1, curb.y0), top(curb.x1, curb.y1), top(curb.x1, curb.y1, curb.h), top(curb.x1, curb.y0, curb.h)])} />
        <polygon className={styles.bronzeLit} points={pts([top(curb.x0, curb.y1), top(curb.x1, curb.y1), top(curb.x1, curb.y1, curb.h), top(curb.x0, curb.y1, curb.h)])} />
        <polygon className={styles.frame} points={pts([top(curb.x0, curb.y0, curb.h), top(curb.x1, curb.y0, curb.h), top(curb.x1, curb.y1, curb.h), top(curb.x0, curb.y1, curb.h)])} />
        <polygon className={styles.skyGlass} points={pts([top(curb.x0 + 0.3, curb.y0 + 0.3, curb.h), top(curb.x1 - 0.3, curb.y0 + 0.3, curb.h), top(curb.x1 - 0.3, curb.y1 - 0.3, curb.h), top(curb.x0 + 0.3, curb.y1 - 0.3, curb.h)])} />
        <polygon className={styles.glint} points={pts([top(curb.x0 + 0.5, curb.y0 + 0.5, curb.h), top(curb.x0 + 2, curb.y0 + 0.5, curb.h), top(curb.x0 + 0.5, curb.y0 + 2.5, curb.h)])} />
        {/* Plumbing vent stack with its boot. */}
        <polygon className={styles.flashing} points={pts(disc(3, 24, zTop(3) + 0.03, 0.5, 14))} />
        <Cylinder cx={3} cy={24} r={0.22} z0={zTop(3)} z1={zTop(3) + 1.4} side={styles.abs} top={styles.absTop} />
        {/* Gutter along the low edge, with hangers. */}
        <Box b={[x1, x1 + 0.55, y0, y1, zTop(x1) - 0.55, zTop(x1) - 0.12]} top={styles.gutterTop} side={styles.bronze} front={styles.bronzeLit} />
        <path className={styles.hanger} d={hangersPath} />
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
