// YardUp shared theme + primitives (HTML/web port of the React Native theme.ts)
// Brand: forest greens on warm paper. Fraunces for revenue, Hanken Grotesk for body,
// IBM Plex Mono for data. Cash-highlight #CFF86D used sparingly.

const YU = {
  paper: '#F6F4EE',
  paper2: '#EFEEE7',
  canvas: '#FFFFFF',
  ink: '#15231C',
  ink2: '#0E2C20',
  forest: '#143D2B',
  forestDeep: '#0E2C20',
  muted: '#566159',
  faint: '#8C968D',
  border: '#E5E3D9',
  borderStrong: '#D5D2C5',
  revenue: '#1F9D63',
  revenuePress: '#177A4D',
  revenueDeep: '#0E5F3C',
  mint: '#DCF1E5',
  mintSoft: '#EBF6EF',
  cash: '#CFF86D',
  cashDeep: '#A6D03A',
  builder: '#0D5DB8',
  builderSoft: '#E4F0FF',
  permit: '#C1760D',
  permitSoft: '#FFF1D7',
  error: '#D1583F',
  errorSoft: '#FDE3DA',
  highlighterInk: '#162C16',
  charcoal: '#10110F',
  // alphas for layering
  inkLine: 'rgba(21,35,28,0.12)',
  inkLineSoft: 'rgba(21,35,28,0.07)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha18: 'rgba(255,255,255,0.18)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
};

const YU_FONT = {
  sans: '"Hanken Grotesk", -apple-system, system-ui, sans-serif',
  serif: '"Fraunces", "Iowan Old Style", Georgia, serif',
  mono: '"IBM Plex Mono", Menlo, monospace',
};

const YU_RADII = { xs: 6, sm: 10, md: 16, lg: 22, full: 9999 };

const YU_SHADOW = {
  soft: '0 10px 22px rgba(20, 40, 30, 0.06)',
  med: '0 18px 34px rgba(14, 44, 32, 0.12)',
  crisp: '0 4px 10px rgba(14, 44, 32, 0.08)',
  deep: '0 26px 56px rgba(14, 44, 32, 0.22)',
};

// YardUp mark — roof-as-arrow + body + ground-line
function YardUpMark({ size = 28, color = YU.revenue, ground = null }) {
  const stroke = Math.max(3, size * 0.11);
  const groundColor = ground || color;
  return (
    <div style={{ position: 'relative', height: size, width: size, flexShrink: 0 }}>
      {/* roof left */}
      <div style={{ position: 'absolute', background: color, borderRadius: stroke, height: stroke, left: size * 0.18, top: size * 0.34, transform: 'rotate(-39deg)', width: size * 0.42 }} />
      {/* roof right */}
      <div style={{ position: 'absolute', background: color, borderRadius: stroke, height: stroke, right: size * 0.18, top: size * 0.34, transform: 'rotate(39deg)', width: size * 0.42 }} />
      {/* stem */}
      <div style={{ position: 'absolute', background: color, borderRadius: stroke, height: size * 0.45, left: (size - stroke) / 2, top: size * 0.28, width: stroke }} />
      {/* ground */}
      <div style={{ position: 'absolute', background: groundColor, borderRadius: stroke, bottom: size * 0.14, height: stroke, left: size * 0.28, width: size * 0.44 }} />
    </div>
  );
}

function YardUpWordmark({ size = 22, tone = 'dark' }) {
  const ink = tone === 'light' ? '#EDF3EE' : YU.ink;
  const up = tone === 'light' ? YU.cash : YU.revenue;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <YardUpMark size={size * 1.3} color={tone === 'light' ? YU.cash : YU.revenue} />
      <span style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: size, color: ink, letterSpacing: -0.2 }}>
        Yard<span style={{ color: up }}>Up</span>
      </span>
    </div>
  );
}

// Universal small components

function Eyebrow({ children, tone = 'dark', accent }) {
  const color = tone === 'light' ? 'rgba(237,243,238,0.78)' : (accent || YU.muted);
  return (
    <span style={{
      fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10.5, letterSpacing: 0.6,
      textTransform: 'uppercase', color, lineHeight: 1.2,
    }}>{children}</span>
  );
}

function Money({ value, unit = '/mo', size = 44, color = YU.ink, tone, weight = 600 }) {
  // tone: 'cash' | 'mint' | 'dark' shortcut
  const c = tone === 'cash' ? YU.cash
        : tone === 'mint' ? YU.mint
        : tone === 'dark' ? '#EDF3EE'
        : color;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, color: c, fontFamily: YU_FONT.serif, fontWeight: weight, lineHeight: 1.0, letterSpacing: -0.5 }}>
      <span style={{ fontSize: size }}>{value}</span>
      {unit ? <span style={{ fontSize: Math.max(11, size * 0.32), opacity: 0.78, fontFamily: YU_FONT.sans, fontWeight: 600 }}>{unit}</span> : null}
    </div>
  );
}

function Mono({ children, size = 13, color = YU.ink, weight = 500, style }) {
  return <span style={{ fontFamily: YU_FONT.mono, fontWeight: weight, fontSize: size, color, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, ...style }}>{children}</span>;
}

function Body({ children, size = 13, color = YU.ink, weight = 400, style }) {
  return <span style={{ fontFamily: YU_FONT.sans, fontWeight: weight, fontSize: size, color, lineHeight: 1.45, ...style }}>{children}</span>;
}

function Pill({ children, bg = YU.canvas, fg = YU.ink, border, style }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 9999, background: bg, color: fg,
      border: border || `1px solid ${YU.border}`,
      fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 11, letterSpacing: 0.2,
      ...style,
    }}>{children}</div>
  );
}

function Dot({ color = YU.revenue, size = 7 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

// Subtle paper texture grid for backgrounds
function PaperGrid({ opacity = 0.5, color = 'rgba(31,157,99,0.07)' }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity,
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: '24px 24px',
      maskImage: 'linear-gradient(180deg, black 0%, black 60%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 60%, transparent 100%)',
    }} />
  );
}

// Phone screen wrapper that floods background + tucks content under status bar.
// padTop/padBottom default for iOS (status bar absolute). Android wrapper
// overrides to padTop=8 since its status bar is in flow.
function YUScreen({ bg = YU.paper, children, padTop, padBottom = 38 }) {
  const top = padTop ?? (window.__YU_DEVICE === 'android' ? 8 : 56);
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: bg, overflow: 'hidden',
      fontFamily: YU_FONT.sans, color: YU.ink,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top }} />
      <div style={{ position: 'absolute', top, left: 0, right: 0, bottom: padBottom }}>{children}</div>
    </div>
  );
}

// Tab bar — small ios-style bottom nav, branded
function YUTabBar({ tabs = ['Money', 'Studio', 'Build', 'Permit', 'You'], active = 0, dark = false }) {
  const bg = dark ? YU.forestDeep : 'rgba(255,255,255,0.96)';
  const border = dark ? 'rgba(255,255,255,0.08)' : YU.border;
  const fg = dark ? 'rgba(237,243,238,0.62)' : YU.muted;
  const activeFg = dark ? YU.cash : YU.revenue;
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 12, right: 12,
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 8px', background: bg, borderRadius: 22,
      border: `1px solid ${border}`,
      boxShadow: dark ? '0 18px 34px rgba(0,0,0,0.4)' : YU_SHADOW.med,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      {tabs.map((t, i) => (
        <div key={t} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10, color: i === active ? activeFg : fg,
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: i === active ? activeFg : (dark ? 'rgba(237,243,238,0.16)' : YU.border) }} />
          {t}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  YU, YU_FONT, YU_RADII, YU_SHADOW,
  YardUpMark, YardUpWordmark, Eyebrow, Money, Mono, Body, Pill, Dot, PaperGrid, YUScreen, YUTabBar,
});
