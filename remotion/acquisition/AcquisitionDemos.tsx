import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COLOR } from "../../lib/design-tokens";
import { fonts } from "../demo/fonts";
import data from "./data.json";

const ink = COLOR["lot-ink"], chalk = COLOR["lot-chalk"], orange = COLOR["lot-orange"];
const stone = COLOR["lot-stone"], line = COLOR["lot-line"];
const dollars = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const range = (low: number, high: number) => "$" + low / 1000 + "K–$" + high / 1000 + "K";
const Title: React.FC<React.PropsWithChildren> = ({ children }) => <h1 style={{ margin: 0, font: `600 100px/1.04 ${fonts.display}`, letterSpacing: -4 }}>{children}</h1>;
const Copy: React.FC<React.PropsWithChildren> = ({ children }) => <p style={{ margin: "30px 0 0", fontSize: 44, lineHeight: 1.35 }}>{children}</p>;
const Figure: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 400 250" width="100%" style={{ display: "block", marginTop: 20 }}>
    <path d="M20 90L270 25L390 100L140 170Z" fill={COLOR["lot-surface"]} stroke={ink} strokeWidth="2"/>
    <path d="M20 90V115L140 195L390 125V100L140 170Z" fill={line} stroke={ink} strokeWidth="2"/>
    <path d="M55 80L140 58L205 98L120 120Z" fill={ink}/>
    <path d="M55 80V115L120 155L205 133V98L120 120Z" fill={stone} stroke={ink} strokeWidth="2"/>
    <g transform={size === 800 ? "translate(0,-7) scale(1.07)" : ""}>
      <path d="M225 63L290 46L345 81L280 98Z" fill={orange} stroke={ink} strokeWidth="2"/>
      <path d="M225 63V93L280 128L345 111V81L280 98Z" fill={orange} stroke={ink} strokeWidth="2"/>
    </g>
  </svg>
);
const Shell: React.FC<React.PropsWithChildren<{ progress: number }>> = ({ children, progress }) => (
  <AbsoluteFill style={{ background: chalk, color: ink, fontFamily: fonts.sans }}>
    <div style={{ position: "absolute", top: 105, left: 92, right: 92, display: "flex", alignItems: "center", gap: 20, fontSize: 36, fontWeight: 700 }}>
      <span style={{ width: 32, height: 32, background: orange, display: "inline-block", border: `2px solid ${ink}` }}/> LOTFOUNDRY
      <span style={{ marginLeft: "auto", fontSize: 28 }}>A LOT MORE.</span>
    </div>
    <div style={{ position: "absolute", top: 220, left: 92, right: 92, bottom: 310 }}>{children}</div>
    <div style={{ position: "absolute", bottom: 105, left: 92, right: 92, borderTop: `2px solid ${line}`, paddingTop: 26, fontSize: 40, lineHeight: 1.35, color: stone }}>
      Illustrative scenario · not a quote<br/>Estimates are not permit approval.
    </div>
    <div style={{ position: "absolute", bottom: 0, height: 10, left: 0, width: `${progress * 100}%`, background: orange }}/>
  </AbsoluteFill>
);

function Demo({ kind }: { kind: "size" | "finance" }) {
  const frame = useCurrentFrame();
  const phase = frame < 120 ? 0 : frame < 420 ? 1 : frame < 570 ? 2 : 3;
  const phaseStart = [0, 120, 420, 570][phase];
  const enter = interpolate(frame - phaseStart, [0, 14], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame - phaseStart, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Shell progress={frame / 720}><div style={{ transform: `translateY(${enter}px)`, opacity }}>
    {phase === 0 && <>
      <div style={{ fontSize: 36, textTransform: "uppercase", letterSpacing: 3, marginBottom: 45 }}>One question. Before you build.</div>
      <Title>{kind === "size" ? <>600 or<br/>800 sq ft?</> : <>Rent isn’t<br/>cash flow.</>}</Title>
      {kind === "size" ? <><Figure size={600}/><Copy>More space changes the budget.<br/>Does it change the rent?</Copy></> : <><div style={{ fontSize: 150, fontFamily: fonts.display, marginTop: 120, letterSpacing: -6 }}>$2,335<span style={{ fontSize: 44, letterSpacing: 0 }}> /mo</span></div><Copy>San Diego’s HUD FY2027<br/>one-bedroom benchmark.</Copy><Copy>Expenses and loan payments<br/>still need to come out.</Copy></>}
    </>}
    {phase === 1 && (kind === "size" ? <>
      <Title>Same rent<br/>assumption.</Title>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 55 }}>
        {[data.six, data.eight].map(row => <div key={row.size} style={{ border: `2px solid ${ink}`, padding: 24, boxShadow: `7px 7px 0 ${ink}` }}>
          <div style={{ fontFamily: fonts.display, fontSize: 68, letterSpacing: -2 }}>{row.size}<span style={{ fontSize: 32 }}> sq ft</span></div>
          <Figure size={row.size}/>
          <div style={{ fontSize: 32, color: stone, marginTop: 20 }}>Modeled build</div>
          <div style={{ fontFamily: fonts.display, fontSize: 48, whiteSpace: "nowrap", marginTop: 10 }}>{range(row.costLow, row.costHigh)}</div>
          <div style={{ borderTop: `1px solid ${line}`, marginTop: 25, paddingTop: 20, fontSize: 36 }}>{dollars(row.monthlyRent)}/mo</div>
        </div>)}
      </div>
      <Copy>Both map to a one-bedroom<br/>rent benchmark in this model.</Copy>
      <p style={{ fontSize: 35, lineHeight: 1.4, color: stone }}>San Diego · cedar finish · national build base.<br/>Site work and financing need separate pricing.</p>
    </> : <>
      <Title>Subtract the<br/>loan payment.</Title>
      <div style={{ background: orange, padding: "24px 28px", fontSize: 40, marginTop: 45, border: `2px solid ${ink}` }}>$120K loan · 6.5% fixed · 30 years<br/><span style={{ fontSize: 32 }}>Illustrative terms, not a lender quote.</span></div>
      <div style={{ marginTop: 40 }}>
        {[
          ["Rent after operating expenses", data.loan.monthlyNoi],
          ["Less monthly loan payment", data.loan.payment],
          ["Modeled cash after loan", data.loan.cash],
        ].map(([label, amount], i) => <div key={String(label)} style={{ borderBottom: `2px solid ${line}`, padding: "23px 0", background: i === 2 ? COLOR["lot-surface"] : "transparent" }}>
          <div style={{ fontSize: 38 }}>{label}</div>
          <div style={{ fontSize: 90, fontFamily: fonts.display, marginTop: 8, letterSpacing: -3 }}>{dollars(Number(amount))}<span style={{ fontSize: 36, letterSpacing: 0 }}> /mo</span></div>
        </div>)}
      </div>
      <p style={{ fontSize: 35, lineHeight: 1.4, color: stone }}>600 sq ft · San Diego · HUD FY2027.<br/>Loan covers part of the build budget.<br/>Excludes income tax and future rent changes.</p>
    </>)}
    {phase === 2 && <>
      <Title>{kind === "size" ? <>Change the size.<br/>See the tradeoff.</> : <>Try your own<br/>loan terms.</>}</Title>
      <div style={{ marginTop: 50, border: `2px solid ${ink}`, boxShadow: `10px 10px 0 ${ink}`, overflow: "hidden", height: 740 }}>
        <Img src={staticFile(`${kind === "size" ? "calculator" : "financing"}.png`)} style={{ width: "100%", height: "100%", objectFit: kind === "size" ? "cover" : "contain", objectPosition: "top" }}/>
      </div>
      <Copy>Actual LotFoundry calculator.<br/>Free to use. No account needed.</Copy>
    </>}
    {phase === 3 && <>
      <div style={{ width: 100, height: 100, background: orange, border: `3px solid ${ink}`, marginBottom: 65 }}/>
      <Title>{kind === "size" ? <>Compare the size.<br/>Then check<br/>your lot.</> : <>Compare the loan.<br/>Then check<br/>your lot.</>}</Title>
      <Copy>Start with a planning estimate.<br/>Confirm with local professionals.</Copy>
      <div style={{ marginTop: 65, padding: "30px 32px", background: orange, border: `2px solid ${ink}`, fontWeight: 700, fontSize: 46 }}>Try the free calculator →</div>
      <div style={{ marginTop: 40, fontSize: 44, fontWeight: 600 }}>lotfoundry.net</div>
      <div style={{ fontSize: 36, marginTop: 8, color: stone }}>/adu-cost-calculator</div>
    </>}
  </div></Shell>;
}
export const SizeDemo: React.FC = () => <Demo kind="size"/>;
export const FinancingDemo: React.FC = () => <Demo kind="finance"/>;
