import React from "react";
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts } from "../demo/fonts";
import film from "./film.json";
import captions from "./captions.json";

export const FILM_FPS = film.fps;
export const FILM_DURATION = Math.round(film.duration * FILM_FPS);
const C = { paper: "#F5F5F0", ink: "#161616", orange: "#FF5B24", muted: "#65655F", line: "#DADAD3" };
const asset = (name: string) => staticFile(`play-film/${name}`);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = { ...clamp, easing: Easing.bezier(0.2, 0.65, 0.25, 1) };

const Mark: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M38 18V42H6V10H29M23 25L40 8" stroke="currentColor" strokeWidth="4" />
    <circle cx="40" cy="8" r="4" fill={C.orange} />
  </svg>
);

const Masthead: React.FC<{ light?: boolean }> = ({ light = false }) => (
  <div style={{ position: "absolute", left: 76, top: 54, display: "flex", alignItems: "center", gap: 16, color: light ? C.paper : C.ink }}>
    <Mark /><span style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 600, letterSpacing: -1.2 }}>LotFoundry</span>
  </div>
);

const Chapter: React.FC<{ number: string; label: string; note?: string }> = ({ number, label, note = "SEATTLE DEMO · ACTUAL APP" }) => (
  <>
    <div style={{ position: "absolute", top: 60, left: 76, display: "flex", alignItems: "center", gap: 22, fontSize: 25, fontWeight: 600, letterSpacing: 2 }}>
      <span style={{ color: C.muted }}>{number}</span><span style={{ width: 40, height: 3, backgroundColor: C.orange }} /><span>{label}</span>
    </div>
    <div style={{ position: "absolute", right: 76, top: 65, color: C.muted, fontSize: 19, letterSpacing: 1.4 }}>{note}</div>
    <div style={{ position: "absolute", left: 76, right: 76, top: 120, height: 1, backgroundColor: C.line }} />
  </>
);

// A camera window on the original, unaltered app screenshot. Source crop
// coordinates are in the 1080 x 1920 native screenshot pixel space.
const AppCrop: React.FC<{ file: string; x: number; y: number; width: number; height: number; sourceX?: number; sourceY: number; sourceWidth?: number; drift?: number }> = ({ file, x, y, width, height, sourceX = 0, sourceY, sourceWidth = 1080, drift = 0 }) => {
  const frame = useCurrentFrame();
  const scale = width / sourceWidth;
  return <div style={{ position: "absolute", left: x, top: y, width, height, overflow: "hidden", backgroundColor: C.paper }}>
    <Img src={asset(file)} style={{ position: "absolute", width: 1080 * scale, maxWidth: "none", height: 1920 * scale, left: -sourceX * scale, top: -sourceY * scale - interpolate(frame, [0, 210], [0, drift], clamp) }} />
  </div>;
};

const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: 596, top: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      <Img src={asset("backyard-editorial.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "69% center", transform: `scale(${interpolate(frame, [0, 96], [1.035, 1], clamp)})` }} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 596, backgroundColor: C.paper }} />
    <Masthead />
    <div style={{ position: "absolute", left: 76, top: 302, width: 505, opacity: interpolate(frame, [0, 14], [0, 1], clamp), transform: `translateY(${interpolate(frame, [0, 24], [16, 0], smooth)}px)` }}>
      <div style={{ fontSize: 21, letterSpacing: 2.3, color: C.muted, marginBottom: 36 }}>BEFORE THE BLUEPRINTS</div>
      <div style={{ fontFamily: fonts.display, fontSize: 95, fontWeight: 500, letterSpacing: -5.7, lineHeight: 0.99 }}>What could<br />your yard<br />become<span style={{ color: C.orange }}>?</span></div>
      <div style={{ width: 70, height: 5, marginTop: 44, backgroundColor: C.orange }} />
    </div>
    <div style={{ position: "absolute", left: 76, bottom: 65, fontSize: 24, color: C.muted }}>A little space. A lot more possibility.</div>
    <div style={{ position: "absolute", right: 35, bottom: 32, padding: "8px 12px", backgroundColor: C.paper, fontSize: 17 }}>Concept imagery</div>
  </AbsoluteFill>;
};

const Find: React.FC = () => (
  <AbsoluteFill>
    <Chapter number="01" label="START WITH YOUR ADDRESS" />
    <AppCrop file="find.png" x={270} y={170} width={1380} height={745} sourceX={20} sourceY={284} sourceWidth={1040} />
    <div style={{ position: "absolute", bottom: 38, left: 76, fontSize: 20, color: C.muted }}>Find the starting point for your backyard home.</div>
  </AbsoluteFill>
);

const Earn: React.FC = () => (
  <AbsoluteFill>
    <Chapter number="02" label="EXPLORE THE POTENTIAL" />
    <AppCrop file="earn.png" x={90} y={223} width={1250} height={740} sourceX={20} sourceY={287} sourceWidth={1040} />
    <div style={{ position: "absolute", left: 1440, top: 263, height: 580, width: 1, backgroundColor: C.line }} />
    <div style={{ position: "absolute", left: 1490, top: 292, width: 345 }}>
      <div style={{ fontFamily: fonts.display, fontSize: 67, letterSpacing: -3.2, lineHeight: 1.02 }}>Space<br />with<br />potential.</div>
      <div style={{ width: 52, height: 4, backgroundColor: C.orange, margin: "36px 0" }} />
      <div style={{ fontSize: 27, color: C.muted, lineHeight: 1.55 }}>An early rental estimate for the lot you have.</div>
    </div>
    <div style={{ position: "absolute", bottom: 38, left: 76, fontSize: 20, color: C.muted }}>Curated demo figures. Your address will have its own estimate.</div>
  </AbsoluteFill>
);

const Shape: React.FC = () => {
  const frame = useCurrentFrame();
  const detail = interpolate(frame, [65, 83], [1, 0], smooth);
  return <AbsoluteFill>
    <Chapter number="03" label="SEE HOW IT FITS" note="3D STUDIO · MODELED SITE FIT" />
    <div style={{ position: "absolute", left: 75, top: 160, width: 1230, height: 740, overflow: "hidden" }}>
      <OffthreadVideo src={asset("studio-orbit.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
    <div style={{ position: "absolute", left: 1390, top: 226, width: 435, opacity: 1 - detail }}>
      <div style={{ color: C.muted, fontSize: 23, letterSpacing: 1.5, marginBottom: 30 }}>EXPLORE IN THREE DIMENSIONS</div>
      <div style={{ fontFamily: fonts.display, fontSize: 87, letterSpacing: -4.6, lineHeight: 1.01 }}>A home.<br />On your<br />own lot.</div>
      <div style={{ marginTop: 42, fontSize: 28, lineHeight: 1.5, color: C.muted }}>Try a footprint.<br />Explore the placement.<br />See the relationship.</div>
    </div>
    <div style={{ opacity: detail }}>
      <div style={{ position: "absolute", left: 1380, top: 247, fontFamily: fonts.display, fontSize: 78, letterSpacing: -4, lineHeight: 1.03 }}>Choose<br />a footprint.</div>
      <AppCrop file="shape.png" x={1365} y={510} width={465} height={250} sourceX={30} sourceY={1392} sourceWidth={1020} />
    </div>
    <div style={{ position: "absolute", bottom: 38, left: 76, fontSize: 20, color: C.muted }}>Actual 3D model and controls. Site fit is an early estimate.</div>
  </AbsoluteFill>;
};

const Check: React.FC = () => {
  const frame = useCurrentFrame();
  const showChecks = frame >= 120;
  return <AbsoluteFill>
    <Chapter number="04" label={showChecks ? "KNOW WHAT TO CHECK NEXT" : "BRING THE NUMBERS TOGETHER"} />
    <AppCrop file="check.png" x={155} y={showChecks ? 245 : 222} width={1610} height={showChecks ? 600 : 590} sourceX={28} sourceY={showChecks ? 696 : 291} sourceWidth={1024} />
    <div style={{ position: "absolute", top: 871, left: 175, fontSize: 26, color: C.muted }}>
      {showChecks ? "See the items that need local verification." : "Build cost. Rental estimate. Payback. In one place."}
    </div>
    <div style={{ position: "absolute", bottom: 38, left: 76, fontSize: 20, color: C.muted }}>Early feasibility estimates. Verify local requirements before permitting.</div>
  </AbsoluteFill>;
};

const Recap: React.FC = () => (
  <AbsoluteFill>
    <Masthead />
    <div style={{ position: "absolute", top: 175, left: 76, width: 810, fontFamily: fonts.display, fontSize: 93, lineHeight: 1.03, letterSpacing: -5 }}>A clearer<br />first step.</div>
    <div style={{ position: "absolute", top: 455, left: 76, width: 535, fontSize: 34, color: C.muted, lineHeight: 1.45 }}>For the space<br />you already have.</div>
    <div style={{ position: "absolute", left: 793, top: 165, width: 490, height: 740, border: `1px solid ${C.line}`, overflow: "hidden" }}><Img src={asset("earn.png")} style={{ width: "100%" }} /></div>
    <div style={{ position: "absolute", left: 1310, top: 165, width: 490, height: 740, border: `1px solid ${C.line}`, overflow: "hidden" }}><Img src={asset("check.png")} style={{ width: "100%" }} /></div>
  </AbsoluteFill>
);

const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, bottom: 0, overflow: "hidden" }}>
      <Img src={asset("interior-editorial.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "58% center", transform: `scale(${interpolate(frame, [0, 120], [1, 1.025], clamp)})` }} />
      <div style={{ position: "absolute", left: 35, bottom: 32, padding: "8px 12px", backgroundColor: C.paper, fontSize: 17 }}>Concept imagery</div>
    </div>
    <div style={{ position: "absolute", left: 1158, top: 234, width: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 49, fontFamily: fonts.display, letterSpacing: -2 }}><Mark size={60} />LotFoundry</div>
      <div style={{ fontFamily: fonts.display, fontSize: 114, fontWeight: 500, lineHeight: 0.98, letterSpacing: -7, marginTop: 72 }}>A LOT<br />MORE<span style={{ color: C.orange }}>.</span></div>
      <div style={{ fontSize: 29, color: C.muted, marginTop: 38 }}>Possibility starts here.</div>
      <div style={{ fontSize: 28, marginTop: 68 }}>lotfoundry.net</div>
    </div>
    <div style={{ position: "absolute", left: 1158, bottom: 48, width: 680, fontSize: 17, lineHeight: 1.5, color: C.muted }}>
      Music: “Cylinder Five” — Chris Zabriskie · CC BY 4.0<br />
      {film.narrationFile ? "AI narration: Brielle" : "Picture preview · Brielle narration pending"}
    </div>
  </AbsoluteFill>;
};

const scenes: Record<string, React.FC> = { opening: Opening, find: Find, earn: Earn, shape: Shape, check: Check, recap: Recap, closing: Closing };

export const PlayFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const caption = captions.find(c => frame / FILM_FPS >= c.from && frame / FILM_FPS < c.to);
  return <AbsoluteFill style={{ backgroundColor: C.paper, color: C.ink, fontFamily: fonts.sans }}>
    <Audio src={asset("score.wav")} volume={f => interpolate(f, [0, 60, FILM_DURATION - 75, FILM_DURATION], [0, film.narrationFile ? 0.19 : 0.6, film.narrationFile ? 0.19 : 0.6, 0], clamp)} />
    {film.narrationFile && <Audio src={asset(film.narrationFile)} />}
    {film.scenes.map(scene => {
      const Component = scenes[scene.id];
      return <Sequence key={scene.id} from={Math.round(scene.from * FILM_FPS)} durationInFrames={Math.round(scene.to * FILM_FPS) - Math.round(scene.from * FILM_FPS)}><Component /></Sequence>;
    })}
    {film.narrationFile && caption && <div style={{ position: "absolute", bottom: 74, left: 260, right: 260, textAlign: "center", pointerEvents: "none" }}>
      <span style={{ display: "inline-block", padding: "10px 20px 12px", backgroundColor: "rgba(22,22,22,0.92)", color: C.paper, fontSize: 32, lineHeight: 1.35, fontWeight: 500 }}>{caption.text}</span>
    </div>}
    <AbsoluteFill style={{ backgroundColor: C.paper, opacity: interpolate(frame, [0, 8, FILM_DURATION - 10, FILM_DURATION - 1], [1, 0, 0, 1], clamp), pointerEvents: "none" }} />
  </AbsoluteFill>;
};
