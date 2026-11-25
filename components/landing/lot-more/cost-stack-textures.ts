import * as THREE from "three";
import { FINISH } from "./cost-stack-finishes";

/**
 * Procedural surfaces for the 3D cost stack, painted once on 2D canvases so
 * the landing downloads no image textures. Each painter is seeded, so every
 * visit gets the same boards, planks and drawing sheet.
 */

/** The permit set under the slab, in feet; the plan is drawn to this sheet. */
export const SHEET = { width: 42, depth: 31.5, x: 1.5, z: 1.25 } as const;

export interface StackTextures {
  cedar: THREE.CanvasTexture;
  oak: THREE.CanvasTexture;
  fir: THREE.CanvasTexture;
  concrete: THREE.CanvasTexture;
  tile: THREE.CanvasTexture;
  rug: THREE.CanvasTexture;
  cabinet: THREE.CanvasTexture;
  art: THREE.CanvasTexture;
  blob: THREE.CanvasTexture;
  sheet: THREE.CanvasTexture;
  sheetUnder: THREE.CanvasTexture;
}

type Rand = () => number;
type Ctx = CanvasRenderingContext2D;

function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickFrom = <T,>(list: readonly T[], rand: Rand) => list[Math.floor(rand() * list.length) % list.length];

function paint(width: number, height: number, seed: number, draw: (ctx: Ctx, rand: Rand) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    draw(ctx, seeded(seed));
    ctx.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Faint wavy strokes that tile along their length. */
function grain(
  ctx: Ctx,
  rand: Rand,
  { across, length, count, vertical, colors }: { across: [number, number]; length: number; count: number; vertical: boolean; colors: readonly string[] },
) {
  for (let g = 0; g < count; g += 1) {
    const at = across[0] + rand() * (across[1] - across[0]);
    const amp = 0.5 + rand() * 2.2;
    const waves = 1 + Math.floor(rand() * 3);
    const phase = rand() * Math.PI * 2;
    ctx.globalAlpha = 0.05 + rand() * 0.15;
    ctx.strokeStyle = pickFrom(colors, rand);
    ctx.lineWidth = 0.5 + rand() * 1.7;
    ctx.beginPath();
    for (let s = 0; s <= length; s += 8) {
      const off = at + Math.sin((s / length) * Math.PI * 2 * waves + phase) * amp;
      if (vertical) {
        if (s === 0) ctx.moveTo(off, s);
        else ctx.lineTo(off, s);
      } else if (s === 0) ctx.moveTo(s, off);
      else ctx.lineTo(s, off);
    }
    ctx.stroke();
  }
}

/** Vertical cedar boards, 1 ft wide; the tile is 4 × 4 ft. Battens are geometry. */
function cedar(ctx: Ctx, rand: Rand) {
  for (let b = 0; b < 4; b += 1) {
    const x = b * 128;
    ctx.globalAlpha = 1;
    ctx.fillStyle = pickFrom(FINISH.cedar, rand);
    ctx.fillRect(x, 0, 128, 512);
    grain(ctx, rand, { across: [x + 3, x + 125], length: 512, count: 34, vertical: true, colors: [FINISH.cedarGrain, FINISH.cedarGrain, FINISH.cedarBatten] });
    if (rand() < 0.7) {
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = FINISH.cedarGap;
      ctx.beginPath();
      ctx.ellipse(x + 24 + rand() * 80, 40 + rand() * 430, 3 + rand() * 3, 6 + rand() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = FINISH.cedarGap;
    ctx.fillRect(x, 0, 2, 512);
  }
}

/** White-oak planks 6 in wide, running along x; the tile is 4 × 4 ft. */
function oak(ctx: Ctx, rand: Rand) {
  for (let r = 0; r < 8; r += 1) {
    const y = r * 64;
    const b1 = 40 + rand() * 200;
    const b2 = b1 + 160 + rand() * 120;
    const wrap = pickFrom(FINISH.oak, rand);
    const spans: [number, number, string][] = [
      [0, b1, wrap],
      [b1, b2, pickFrom(FINISH.oak, rand)],
      [b2, 512, wrap],
    ];
    for (const [x0, x1, color] of spans) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(x0, y, x1 - x0, 64);
    }
    grain(ctx, rand, { across: [y + 3, y + 61], length: 512, count: 16, vertical: false, colors: [FINISH.oakSeam, FINISH.oak[2]] });
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = FINISH.oakSeam;
    ctx.fillRect(0, y, 512, 2);
    ctx.fillRect(b1, y, 2, 64);
    ctx.fillRect(b2, y, 2, 64);
  }
}

function fir(ctx: Ctx, rand: Rand) {
  ctx.fillStyle = FINISH.fir;
  ctx.fillRect(0, 0, 256, 256);
  grain(ctx, rand, { across: [0, 256], length: 256, count: 40, vertical: false, colors: [FINISH.firGrain, FINISH.firGrain, FINISH.cedarBatten] });
}

function speckle(ctx: Ctx, rand: Rand, size: number, count: number, colors: readonly string[], alpha: number) {
  for (let i = 0; i < count; i += 1) {
    ctx.globalAlpha = alpha * (0.4 + rand() * 0.6);
    ctx.fillStyle = pickFrom(colors, rand);
    const r = 0.5 + rand() * 1.6;
    ctx.fillRect(rand() * size, rand() * size, r, r);
  }
}

function concrete(ctx: Ctx, rand: Rand) {
  ctx.fillStyle = FINISH.concrete;
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, rand, 256, 1400, [FINISH.concreteJoint, FINISH.paper, FINISH.inkFine], 0.35);
}

/** 12 in porcelain tile; the texture is one 4 × 4 ft tile of the pattern. */
function tile(ctx: Ctx, rand: Rand) {
  ctx.fillStyle = FINISH.tile;
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, rand, 512, 600, [FINISH.grout, FINISH.paper], 0.25);
  ctx.globalAlpha = 1;
  ctx.fillStyle = FINISH.grout;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(i * 128, 0, 3, 512);
    ctx.fillRect(0, i * 128, 512, 3);
  }
}

/** A flat-woven wool rug with a border and stripes; one rug per texture. */
function rug(ctx: Ctx, rand: Rand) {
  ctx.fillStyle = FINISH.rug;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = FINISH.rugBorder;
  ctx.fillRect(0, 0, 512, 26);
  ctx.fillRect(0, 486, 512, 26);
  ctx.fillRect(0, 0, 26, 512);
  ctx.fillRect(486, 0, 26, 512);
  ctx.fillStyle = FINISH.rugStripe;
  for (let i = 0; i < 6; i += 1) ctx.fillRect(60 + i * 72, 40, 10, 432);
  speckle(ctx, rand, 512, 2400, [FINISH.rugBorder, FINISH.rugStripe, FINISH.linen], 0.3);
}

/** Shaker cabinet fronts for an 11.5 ft run, 2.6 ft tall: a drawer row over doors. */
function cabinet(ctx: Ctx) {
  const w = 1024;
  const h = 232;
  ctx.fillStyle = FINISH.cabinet;
  ctx.fillRect(0, 0, w, h);
  const doors = 8;
  const dw = w / doors;
  ctx.strokeStyle = FINISH.cabinetLine;
  ctx.lineWidth = 3;
  for (let i = 0; i < doors; i += 1) {
    const x = i * dw;
    ctx.globalAlpha = 1;
    ctx.strokeRect(x + 3, 4, dw - 6, 52);
    ctx.strokeRect(x + 3, 62, dw - 6, h - 66);
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(x + 14, 74, dw - 28, h - 90);
    ctx.globalAlpha = 1;
    ctx.fillStyle = FINISH.brass;
    ctx.fillRect(x + dw / 2 - 16, 27, 32, 5);
    ctx.fillRect(i % 2 === 0 ? x + dw - 20 : x + 14, 80, 5, 40);
  }
}

function art(ctx: Ctx) {
  ctx.fillStyle = FINISH.paper;
  ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = FINISH.art[1];
  ctx.fillRect(28, 120, 170, 92);
  ctx.fillStyle = FINISH.art[0];
  ctx.beginPath();
  ctx.arc(200, 104, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FINISH.ink;
  ctx.fillRect(28, 112, 264, 3);
}

/** A soft contact shadow, built from stacked translucent discs. */
function blob(ctx: Ctx) {
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = FINISH.shadow;
  for (let i = 0; i < 36; i += 1) {
    ctx.globalAlpha = 0.04;
    ctx.beginPath();
    ctx.arc(64, 64, 62 * (1 - i / 36) + 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface SheetStyle {
  signal: string;
  font: string;
}

/** A1 floor plan of the home, drawn to the sheet so the house sits on its own plan. */
function sheet(ctx: Ctx, rand: Rand, { signal, font }: SheetStyle) {
  const W = 2048;
  const H = 1536;
  const k = W / SHEET.width;
  const px = (x: number) => (x - (SHEET.x - SHEET.width / 2)) * k;
  const pz = (z: number) => (z - (SHEET.z - SHEET.depth / 2)) * k;
  const type = (weight: number, size: number) => `${weight} ${size}px ${font}`;

  ctx.fillStyle = FINISH.paper;
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, rand, W, 2600, [FINISH.paperUnder, FINISH.inkFine], 0.18);
  ctx.globalAlpha = 1;

  // Border and title block.
  ctx.strokeStyle = FINISH.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  const tb = 1730;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tb, 38);
  ctx.lineTo(tb, H - 38);
  for (const y of [300, 620, 1040, 1200, 1330]) {
    ctx.moveTo(tb, y);
    ctx.lineTo(W - 38, y);
  }
  ctx.stroke();
  ctx.fillStyle = FINISH.ink;
  ctx.textBaseline = "alphabetic";
  ctx.font = type(700, 30);
  ctx.fillText("BACKYARD HOME", tb + 26, 690);
  ctx.font = type(500, 24);
  ctx.fillStyle = FINISH.inkFine;
  ctx.fillText("600 SQ FT · 1 BED · 1 BATH", tb + 26, 730);
  ctx.fillText("SHED ROOF · CEDAR SIDING", tb + 26, 766);
  ctx.fillText("SLAB ON GRADE", tb + 26, 802);
  ctx.fillText("SCALE  1/4\" = 1'-0\"", tb + 26, 1100);
  ctx.fillText("DATE  2026", tb + 26, 1140);
  ctx.fillText("SHEET 1 OF 12", tb + 26, 1260);
  ctx.fillStyle = FINISH.ink;
  ctx.font = type(700, 26);
  ctx.fillText("FLOOR PLAN", tb + 26, 1290);
  ctx.font = type(700, 96);
  ctx.fillText("A-101", tb + 22, 1446);
  ctx.font = type(700, 24);
  ctx.fillText("PERMIT SET", tb + 26, 1478);

  // The architect's seal.
  ctx.strokeStyle = signal;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(tb + 152, 170, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(tb + 152, 170, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = signal;
  ctx.beginPath();
  ctx.arc(tb + 152, 170, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = FINISH.ink;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(tb + 26, 380 + i * 38);
    ctx.lineTo(W - 64 - (i % 2) * 90, 380 + i * 38);
    ctx.stroke();
  }

  // Grid lines and bubbles.
  ctx.save();
  ctx.setLineDash([22, 8, 4, 8]);
  ctx.strokeStyle = FINISH.inkFine;
  ctx.lineWidth = 1.5;
  const gridX: [number, string][] = [[-15, "A"], [0, "B"], [15, "C"]];
  const gridZ: [number, string][] = [[-10, "1"], [10, "2"]];
  for (const [x] of gridX) {
    ctx.beginPath();
    ctx.moveTo(px(x), pz(-12.2));
    ctx.lineTo(px(x), pz(10.6));
    ctx.stroke();
  }
  for (const [z] of gridZ) {
    ctx.beginPath();
    ctx.moveTo(px(-17.2), pz(z));
    ctx.lineTo(px(15.6), pz(z));
    ctx.stroke();
  }
  ctx.restore();
  ctx.font = type(700, 26);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const bubble = (x: number, y: number, label: string) => {
    ctx.fillStyle = FINISH.paper;
    ctx.strokeStyle = FINISH.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = FINISH.ink;
    ctx.fillText(label, x, y + 1);
  };
  for (const [x, label] of gridX) bubble(px(x), pz(-12.9), label);
  for (const [z, label] of gridZ) bubble(px(-17.9), pz(z), label);

  // Exterior walls in solid poché, with openings left clear.
  const wall = 0.5;
  ctx.fillStyle = FINISH.ink;
  const run = (from: number, to: number, gaps: [number, number][], place: (a: number, b: number) => void) => {
    let at = from;
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (g0 > at) place(at, g0);
      at = Math.max(at, g1);
    }
    if (at < to) place(at, to);
  };
  run(-15, 15, [[0, 10], [-12, -8]], (a, b) => ctx.fillRect(px(a), pz(10 - wall), (b - a) * k, wall * k));
  run(-15, 15, [[-4, 10]], (a, b) => ctx.fillRect(px(a), pz(-10), (b - a) * k, wall * k));
  run(-10, 10, [[4, 7], [-5, -1]], (a, b) => ctx.fillRect(px(15 - wall), pz(a), wall * k, (b - a) * k));
  run(-10, 10, [[-3, -0.5]], (a, b) => ctx.fillRect(px(-15), pz(a), wall * k, (b - a) * k));
  // The clerestory is a high window: the wall below it stays cut.
  ctx.globalAlpha = 0.35;
  ctx.fillRect(px(-4), pz(-10), 14 * k, wall * k);
  ctx.globalAlpha = 1;

  // Glazing lines in each opening.
  ctx.strokeStyle = FINISH.ink;
  ctx.lineWidth = 2;
  const glazeX = (x0: number, x1: number, z: number) => {
    for (const f of [0.35, 0.65]) {
      ctx.beginPath();
      ctx.moveTo(px(x0), pz(z - wall * f));
      ctx.lineTo(px(x1), pz(z - wall * f));
      ctx.stroke();
    }
  };
  const glazeZ = (z0: number, z1: number, x: number) => {
    for (const f of [0.35, 0.65]) {
      ctx.beginPath();
      ctx.moveTo(px(x - wall * f), pz(z0));
      ctx.lineTo(px(x - wall * f), pz(z1));
      ctx.stroke();
    }
  };
  glazeX(0, 10, 10);
  glazeX(-12, -8, 10);
  glazeZ(-5, -1, 15);
  glazeZ(-3, -0.5, -15 + wall);
  ctx.beginPath();
  ctx.moveTo(px(5), pz(10 - wall * 0.2));
  ctx.lineTo(px(5), pz(10 - wall * 0.8));
  ctx.stroke();

  // Entry door swing.
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(15 - wall), pz(4));
  ctx.lineTo(px(15 - wall - 3), pz(4));
  ctx.stroke();
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(px(15 - wall), pz(4), 3 * k, Math.PI, Math.PI / 2, true);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bath partitions and its door.
  ctx.fillStyle = FINISH.ink;
  ctx.fillRect(px(-14.5), pz(-3.5) - 0.17 * k, 2.9 * k, 0.35 * k);
  ctx.fillRect(px(-9.2), pz(-3.5) - 0.17 * k, 1.2 * k, 0.35 * k);
  ctx.fillRect(px(-8) - 0.17 * k, pz(-9.5), 0.35 * k, 6 * k);
  ctx.beginPath();
  ctx.moveTo(px(-9.2), pz(-3.5));
  ctx.lineTo(px(-9.2), pz(-5.9));
  ctx.stroke();
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(px(-9.2), pz(-3.5), 2.4 * k, Math.PI, -Math.PI / 2, true);
  ctx.stroke();
  ctx.setLineDash([]);

  // Furniture and fixtures, light line.
  ctx.strokeStyle = FINISH.inkFine;
  ctx.lineWidth = 2;
  const box = (x0: number, z0: number, x1: number, z1: number) => ctx.strokeRect(px(x0), pz(z0), (x1 - x0) * k, (z1 - z0) * k);
  box(-14.3, 1.5, -7.4, 6.7); // bed
  box(-14.1, 2.0, -12.9, 3.8);
  box(-14.1, 4.4, -12.9, 6.2);
  box(-7.5, -9.5, 4, -7.5); // counter
  box(-5.1, -9.3, -2.9, -7.9); // sink
  box(4.2, -9.5, 7.2, -7.1); // fridge
  box(-3.3, -4.4, 1.3, -1.6); // table
  box(11.5, -6.1, 14.4, 1.1); // sofa
  box(-10.5 - 1.5, -9.5, -10.5 + 1.5, -7.7); // vanity
  for (const [cx, cz] of [[0.3, -8.6], [2.7, -8.6], [0.3, -8], [2.7, -8]] as const) {
    ctx.beginPath();
    ctx.arc(px(cx), pz(cz), 0.28 * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(px(9.4), pz(-2.5), 1.4 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(px(-13.4), pz(-8.2), 0.75 * k, 0.95 * k, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Room names.
  ctx.fillStyle = FINISH.inkFine;
  ctx.font = type(700, 28);
  ctx.textAlign = "center";
  ctx.fillText("LIVING", px(8.5), pz(4.6));
  ctx.fillText("KITCHEN", px(-1.5), pz(-6.4));
  ctx.fillText("BEDROOM", px(-10.5), pz(8.4));
  ctx.fillText("BATH", px(-11.2), pz(-5.6));

  // Dimension strings.
  ctx.strokeStyle = FINISH.ink;
  ctx.fillStyle = FINISH.ink;
  ctx.lineWidth = 2;
  const tick = (x: number, y: number) => {
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 9);
    ctx.lineTo(x + 9, y - 9);
    ctx.stroke();
  };
  const dimZ = pz(12.4);
  ctx.beginPath();
  ctx.moveTo(px(-15.6), dimZ);
  ctx.lineTo(px(15.6), dimZ);
  ctx.stroke();
  for (const x of [-15, 0, 10, 15]) tick(px(x), dimZ);
  ctx.font = type(600, 26);
  ctx.textBaseline = "bottom";
  ctx.fillText("30'-0\"", px(-7.5), dimZ - 8);
  ctx.fillText("10'-0\"", px(5), dimZ - 8);
  ctx.fillText("5'-0\"", px(12.5), dimZ - 8);
  const dimX = px(17.4);
  ctx.beginPath();
  ctx.moveTo(dimX, pz(-10.6));
  ctx.lineTo(dimX, pz(10.6));
  ctx.stroke();
  for (const z of [-10, 10]) tick(dimX, pz(z));
  ctx.save();
  ctx.translate(dimX - 10, pz(0));
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("20'-0\"", 0, 0);
  ctx.restore();

  // North arrow and scale bar.
  const nx = px(-16.4);
  const ny = pz(14.2);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(nx, ny, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nx, ny - 40);
  ctx.lineTo(nx + 17, ny + 22);
  ctx.lineTo(nx, ny + 10);
  ctx.closePath();
  ctx.fill();
  ctx.textBaseline = "middle";
  ctx.font = type(700, 22);
  ctx.fillText("N", nx, ny - 64);
  const sx = nx + 90;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? FINISH.ink : FINISH.paper;
    ctx.fillRect(sx + i * 2 * k, ny + 6, 2 * k, 14);
  }
  ctx.strokeRect(sx, ny + 6, 8 * k, 14);
  ctx.fillStyle = FINISH.ink;
  ctx.font = type(600, 20);
  ctx.textAlign = "left";
  ctx.fillText("0   2   4   8 FT", sx, ny - 14);
}

/** The structural sheet under A-101: mostly hidden, it gives the set an edge. */
function sheetUnder(ctx: Ctx, rand: Rand, { font }: SheetStyle) {
  ctx.fillStyle = FINISH.paperUnder;
  ctx.fillRect(0, 0, 1024, 768);
  speckle(ctx, rand, 1024, 900, [FINISH.paper, FINISH.inkFine], 0.2);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = FINISH.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 996, 740);
  ctx.setLineDash([14, 8]);
  ctx.lineWidth = 2;
  ctx.strokeRect(120, 120, 700, 470);
  ctx.setLineDash([]);
  ctx.fillStyle = FINISH.ink;
  ctx.font = `700 44px ${font}`;
  ctx.fillText("S-201", 860, 720);
}

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Paints every surface, one canvas per task, so the work never lands on the
 * main thread as a single long task while the visitor is scrolling.
 */
export async function paintStackTextures(style: SheetStyle): Promise<StackTextures> {
  const painters: { [K in keyof StackTextures]: () => THREE.CanvasTexture } = {
    cedar: () => paint(512, 512, 11, cedar),
    oak: () => paint(512, 512, 23, oak),
    fir: () => paint(256, 256, 31, fir),
    concrete: () => paint(256, 256, 41, concrete),
    tile: () => paint(512, 512, 53, tile),
    rug: () => paint(512, 512, 61, rug),
    cabinet: () => paint(1024, 232, 71, (ctx) => cabinet(ctx)),
    art: () => paint(320, 240, 83, (ctx) => art(ctx)),
    blob: () => paint(128, 128, 89, (ctx) => blob(ctx)),
    sheet: () => paint(2048, 1536, 97, (ctx, rand) => sheet(ctx, rand, style)),
    sheetUnder: () => paint(1024, 768, 101, (ctx, rand) => sheetUnder(ctx, rand, style)),
  };
  const textures = {} as StackTextures;
  for (const key of Object.keys(painters) as (keyof StackTextures)[]) {
    await yieldToMain();
    textures[key] = painters[key]();
  }
  for (const key of ["rug", "cabinet", "art", "blob", "sheet", "sheetUnder"] as const) {
    textures[key].wrapS = THREE.ClampToEdgeWrapping;
    textures[key].wrapT = THREE.ClampToEdgeWrapping;
  }
  textures.sheet.anisotropy = 16;
  return textures;
}

export function disposeStackTextures(textures: StackTextures) {
  Object.values(textures).forEach((texture) => texture.dispose());
}
