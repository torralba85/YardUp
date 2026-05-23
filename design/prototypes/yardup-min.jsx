// yardup-min.jsx — calm-minimal redesign tokens + primitives.
// Two themes (paper / dusk), accent variable, hairline dividers, generous space.
// All screens consume tokens via the `useT()` hook; the canvas sets theme + accent
// in a React context.

const YMTokens = {
  paper: {
    bg: '#F6F4EE',
    bgRaised: '#FFFFFF',
    bgSubtle: '#EFEEE7',
    bgDeep: '#0E2C20',
    ink: '#15231C',
    inkSoft: '#566159',
    inkFaint: '#8C968D',
    line: 'rgba(21,35,28,0.10)',
    lineSoft: 'rgba(21,35,28,0.06)',
    lineStrong: 'rgba(21,35,28,0.20)',
    onDeep: '#EDF3EE',
    onDeepSoft: 'rgba(237,243,238,0.72)',
    deepLine: 'rgba(237,243,238,0.12)',
  },
  dusk: {
    bg: '#0F1614',
    bgRaised: '#161E1B',
    bgSubtle: '#1B2421',
    bgDeep: '#080C0B',
    ink: '#EDE9DD',
    inkSoft: '#9CA39A',
    inkFaint: '#5E6661',
    line: 'rgba(237,233,221,0.10)',
    lineSoft: 'rgba(237,233,221,0.05)',
    lineStrong: 'rgba(237,233,221,0.20)',
    onDeep: '#EDE9DD',
    onDeepSoft: 'rgba(237,233,221,0.66)',
    deepLine: 'rgba(237,233,221,0.10)',
  },
};

const YM_ACCENTS = {
  revenue: { c: '#1F9D63', press: '#177A4D', soft: '#DCF1E5', onLight: '#0E5F3C', deep: '#0E2C20' },
  cash:    { c: '#A6D03A', press: '#88B12A', soft: '#EAF6CC', onLight: '#3E5410', deep: '#1A2410' },
  builder: { c: '#0D5DB8', press: '#0A4B95', soft: '#E4F0FF', onLight: '#0A3F7A', deep: '#0F1F3A' },
};

const YM_FONT = {
  sans: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
  serif: '"Fraunces", "Iowan Old Style", Georgia, serif',
  mono: '"IBM Plex Mono", Menlo, monospace',
};

const YMCtx = React.createContext({
  theme: 'paper', t: YMTokens.paper, accent: YM_ACCENTS.revenue, device: 'ios',
});
const useT = () => React.useContext(YMCtx);

function YMProvider({ theme = 'paper', accent = 'revenue', device = 'ios', children }) {
  const t = YMTokens[theme];
  const a = YM_ACCENTS[accent];
  React.useEffect(() => { window.__YU_DEVICE = device; }, [device]);
  return (
    <YMCtx.Provider value={{ theme, t, accent: a, device }}>
      {children}
    </YMCtx.Provider>
  );
}

// ── PRIMITIVES ─────────────────────────────────────────────────────────────

// Big serif moment — for hero $/mo and section moments.
function Display({ children, size = 80, italic, color, style }) {
  const { t } = useT();
  return (
    <div style={{
      fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: size,
      lineHeight: 0.96, letterSpacing: -size * 0.025,
      fontStyle: italic ? 'italic' : 'normal',
      color: color || t.ink, ...style,
    }}>{children}</div>
  );
}

// Section eyebrow — small mono uppercase, with a hairline divider above by default.
function Eye({ children, color, style, dot, accent }) {
  const { t, accent: a } = useT();
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: YM_FONT.mono, fontWeight: 600, fontSize: 10.5,
      letterSpacing: 1.6, textTransform: 'uppercase',
      color: color || t.inkSoft,
      ...style,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent || a.c, display: 'inline-block' }} />}
      {children}
    </div>
  );
}

function Body({ children, size = 15, weight = 400, color, italic, style }) {
  const { t } = useT();
  return (
    <span style={{
      fontFamily: YM_FONT.sans, fontWeight: weight, fontSize: size, lineHeight: 1.5,
      color: color || t.ink, fontStyle: italic ? 'italic' : 'normal',
      letterSpacing: -0.05, ...style,
    }}>{children}</span>
  );
}

function Mono({ children, size = 12, weight = 500, color, style }) {
  const { t } = useT();
  return (
    <span style={{
      fontFamily: YM_FONT.mono, fontWeight: weight, fontSize: size,
      color: color || t.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: 0,
      ...style,
    }}>{children}</span>
  );
}

function Hairline({ pad = 0, color, style }) {
  const { t } = useT();
  return <div style={{ height: 1, background: color || t.line, margin: `${pad}px 0`, ...style }} />;
}

// Indent-style minimal nav row: kicker + value + chevron, hairlines around.
function NavRow({ kicker, title, body, value, accent, italic, onClick, last, first }) {
  const { t, accent: a } = useT();
  return (
    <>
      {!first && <Hairline />}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        padding: '22px 24px', cursor: 'pointer',
      }} onClick={onClick}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eye style={{ marginBottom: 8 }}>{kicker}</Eye>
          <div style={{
            fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 26, lineHeight: 1.1,
            color: t.ink, letterSpacing: -0.6,
          }}>
            {title}
            {italic && <> <span style={{ fontStyle: 'italic', color: accent || a.c }}>{italic}</span></>}
          </div>
          {body && (
            <div style={{ marginTop: 6 }}>
              <Body size={13.5} color={t.inkSoft}>{body}</Body>
            </div>
          )}
        </div>
        <div style={{
          fontFamily: YM_FONT.sans, fontWeight: 700, fontSize: 18, color: t.inkFaint,
          paddingTop: 22,
        }}>→</div>
      </div>
      {last && <Hairline />}
    </>
  );
}

// Top context strip — project address + tiny actions. Replaces the chrome of tabs.
function TopStrip({ left = 'YardUp', right, sub }) {
  const { t, accent } = useT();
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '12px 24px 12px', borderBottom: `1px solid ${t.lineSoft}`,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* mini wordmark */}
          <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 16, letterSpacing: -0.4, color: t.ink }}>
            Yard<span style={{ color: accent.c }}>Up</span>
          </span>
        </div>
        {sub && <Mono size={10.5} color={t.inkFaint} style={{ display: 'block', marginTop: 2 }}>{sub}</Mono>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: t.inkSoft, fontFamily: YM_FONT.sans, fontWeight: 700, fontSize: 12 }}>
        {right}
      </div>
    </div>
  );
}

// Progress rail — vertical dots on the right side of The Project Page, fills as
// you scroll. Replaces tab bar as the global navigation overview.
function ProgressRail({ active = 0, items, dark }) {
  const { t, accent } = useT();
  return (
    <div style={{
      position: 'absolute', right: 8, top: 80,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18,
      pointerEvents: 'none', zIndex: 5,
    }}>
      {items.map((label, i) => {
        const on = i <= active;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: YM_FONT.mono, fontSize: 9, fontWeight: 700,
              color: on ? t.ink : t.inkFaint, letterSpacing: 0.8,
              opacity: i === active ? 1 : 0.5,
            }}>{label}</span>
            <span style={{
              width: i === active ? 10 : 6, height: i === active ? 10 : 6,
              borderRadius: '50%',
              background: on ? (i === active ? accent.c : t.ink) : 'transparent',
              border: on ? 'none' : `1px solid ${t.lineStrong}`,
            }} />
          </div>
        );
      })}
    </div>
  );
}

// Big quiet CTA — minimal button on a calm page.
function QuietCTA({ children, tone = 'ink', onClick, full = true }) {
  const { t, accent } = useT();
  const toneMap = {
    ink:    { bg: t.ink,    fg: t.bg,        bd: t.ink },
    accent: { bg: accent.c, fg: '#fff',      bd: accent.c },
    ghost:  { bg: 'transparent', fg: t.ink, bd: t.lineStrong },
  };
  const c = toneMap[tone];
  return (
    <div onClick={onClick} style={{
      display: full ? 'flex' : 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, width: full ? '100%' : 'auto',
      background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
      borderRadius: 9999, padding: '16px 22px',
      fontFamily: YM_FONT.sans, fontWeight: 700, fontSize: 14, letterSpacing: -0.1,
      cursor: 'pointer',
    }}>
      {children}
    </div>
  );
}

// Pill chip — minimal, single line.
function Chip({ children, tone = 'paper', size = 11, style }) {
  const { t, accent } = useT();
  const toneMap = {
    paper:  { bg: t.bgRaised,  fg: t.inkSoft,  bd: t.line },
    ink:    { bg: t.ink,       fg: t.bg,       bd: t.ink },
    accent: { bg: accent.soft, fg: accent.onLight, bd: accent.soft },
    deep:   { bg: t.bgDeep,    fg: t.onDeep,   bd: t.bgDeep },
    ghost:  { bg: 'transparent', fg: t.inkSoft, bd: t.line },
  };
  const c = toneMap[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px 5px', borderRadius: 9999,
      background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
      fontFamily: YM_FONT.sans, fontWeight: 700, fontSize: size, letterSpacing: 0.1,
      ...style,
    }}>{children}</span>
  );
}

// The full-bleed screen surface that all minimal screens nest inside.
// Handles top status-bar padding for both frames + scroll.
function Page({ children, bg, scroll = true }) {
  const { t, device } = useT();
  const padTop = device === 'android' ? 12 : 56;
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: bg || t.bg, color: t.ink,
      fontFamily: YM_FONT.sans, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, paddingTop: padTop, paddingBottom: 30,
        overflowY: scroll ? 'auto' : 'hidden',
      }}>{children}</div>
    </div>
  );
}

// Roof-arrow mark in the minimal kit (vector reproducing the YardUp mark).
function YMMark({ size = 24, color }) {
  const { accent } = useT();
  const c = color || accent.c;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 11 L12 5 L19 11" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7 L12 16" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M8 17 L16 17" stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, {
  YMTokens, YM_ACCENTS, YM_FONT, YMCtx, useT, YMProvider,
  Display, Eye, Body: Body, Mono: Mono, Hairline, NavRow, TopStrip, ProgressRail, QuietCTA, Chip, Page, YMMark,
});
