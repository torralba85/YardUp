// Onboarding (minimal) — Welcome, Lens AR scan, Result.
// All three sit in the same paper-on-paper aesthetic. The Lens screen is the
// only one allowed to break to dark + ornament, since it's the AR moment.

// ── 1. Welcome ─────────────────────────────────────────────────────────────
function WelcomeScreen() {
  const { t, accent } = useT();
  return (
    <Page>
      <div style={{ padding: '32px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <YMMark size={22} />
          <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 17, letterSpacing: -0.4, color: t.ink }}>
            Yard<span style={{ color: accent.c }}>Up</span>
          </span>
        </div>
        <Mono size={10.5} color={t.inkFaint}>1 of 3</Mono>
      </div>

      <div style={{ padding: '64px 28px 32px' }}>
        <Eye style={{ marginBottom: 24 }}>A quiet underwriting tool</Eye>
        <Display size={64}>
          Let's see what your <span style={{ fontStyle: 'italic', color: accent.c }}>backyard</span> could earn.
        </Display>
        <div style={{ marginTop: 22, maxWidth: 320 }}>
          <Body size={15} color={t.inkSoft}>
            Three minutes. We scan your lot, look up the rules, model the money, and surface the builders who can act on it. No fluff.
          </Body>
        </div>
      </div>

      {/* Quiet three-step preview, minimal */}
      <div style={{ padding: '0 28px', marginTop: 'auto' }}>
        <Hairline />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { n: '01', t: 'Scan the yard', it: '~2 minutes', body: 'Point your phone, drop four corners, watch the ADU place itself.' },
            { n: '02', t: 'See the money', it: 'instantly', body: 'Rent, payback, value lift. Verified rules. Assumptions stay yours.' },
            { n: '03', t: 'Send to builders', it: 'when ready', body: 'Three trusted bids, side-by-side. Your address stays private.' },
          ].map((s, i) => (
            <div key={s.n}>
              <div style={{ padding: '20px 0', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Mono size={11} weight={700} color={t.inkFaint} style={{ paddingTop: 4 }}>{s.n}</Mono>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: t.ink, letterSpacing: -0.3,
                  }}>
                    {s.t} <span style={{ fontStyle: 'italic', color: t.inkFaint, fontSize: 14, fontWeight: 500 }}>· {s.it}</span>
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <Body size={13} color={t.inkSoft}>{s.body}</Body>
                  </div>
                </div>
              </div>
              {i < 2 && <Hairline />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 28px 12px' }}>
        <QuietCTA tone="ink">Begin scan <span style={{ marginLeft: 4 }}>→</span></QuietCTA>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Body size={12} color={t.inkFaint}>or <span style={{ color: t.ink, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>type your address instead</span></Body>
        </div>
      </div>
    </Page>
  );
}

// ── 2. Lens (AR scan) ─────────────────────────────────────────────────────
// Stays dark; the camera moment is the one place we break from paper.

function LensYardScene() {
  // Calmer than concept-02: softer palette, less detail.
  return (
    <svg viewBox="0 0 360 760" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1B2B2A" />
          <stop offset="0.55" stopColor="#2C3D32" />
          <stop offset="1" stopColor="#3B4E36" />
        </linearGradient>
        <linearGradient id="grass2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1E2E20" />
          <stop offset="1" stopColor="#0F1A12" />
        </linearGradient>
      </defs>
      <rect width="360" height="420" fill="url(#sky2)" />
      <rect y="420" width="360" height="340" fill="url(#grass2)" />
      {/* tree silhouettes */}
      <ellipse cx="70" cy="340" rx="80" ry="42" fill="#172319" opacity="0.85" />
      <ellipse cx="290" cy="320" rx="64" ry="36" fill="#1a261b" opacity="0.85" />
      {/* fence */}
      <rect x="-20" y="380" width="400" height="48" fill="#1A1612" />
      {[...Array(24)].map((_, i) => (
        <line key={i} x1={-20 + i*16} x2={-20 + i*16} y1="382" y2="426" stroke="#2A2218" strokeWidth="1" />
      ))}
      {/* a path */}
      <polygon points="120,430 220,430 280,760 60,760" fill="#3a3a30" opacity="0.6" />
    </svg>
  );
}

function LensWireframe() {
  // Minimal wireframe ADU in iso, accent-colored stroke.
  return (
    <svg width="280" height="200" viewBox="0 0 280 200" style={{ filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.5))' }}>
      <g>
        <polygon points="20,160 160,160 250,110 110,110"
          fill="rgba(31,157,99,0.08)" stroke="#1F9D63" strokeWidth="1.4" strokeDasharray="4 3" />
        <polygon points="20,160 160,160 160,80 20,80"
          fill="rgba(31,157,99,0.04)" stroke="#1F9D63" strokeWidth="1.4" />
        <polygon points="160,160 250,110 250,40 160,80"
          fill="rgba(31,157,99,0.02)" stroke="#1F9D63" strokeWidth="1.4" />
        <polygon points="20,80 160,80 250,40 110,40"
          fill="rgba(31,157,99,0.10)" stroke="#1F9D63" strokeWidth="1.4" />
        {/* corner pins */}
        {[[20,160],[160,160],[250,110],[110,110]].map(([cx,cy],i)=>(
          <g key={i}>
            <circle cx={cx} cy={cy} r="4" fill="#0F1614" stroke="#1F9D63" strokeWidth="1.8" />
          </g>
        ))}
        {/* dim labels */}
        <text x="90" y="178" fill="#1F9D63" fontFamily='"IBM Plex Mono"' fontSize="9" fontWeight="600" textAnchor="middle">28 ft</text>
        <text x="220" y="148" fill="#1F9D63" fontFamily='"IBM Plex Mono"' fontSize="9" fontWeight="600">12 ft</text>
      </g>
    </svg>
  );
}

function LensScanScreen() {
  return (
    <YMCtx.Provider value={{ ...React.useContext(YMCtx), t: YMTokens.dusk }}>
      <Page bg="#000">
        <div style={{ position: 'absolute', inset: 0 }}>
          <LensYardScene />
        </div>

        {/* vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none' }} />

        {/* viewfinder corners — extremely minimal */}
        {[[16,80],[326,80],[16,620],[326,620]].map(([x,y],i)=>(
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 14, height: 14,
            borderTop: i < 2 ? '1.5px solid rgba(255,255,255,0.55)' : 'none',
            borderBottom: i >= 2 ? '1.5px solid rgba(255,255,255,0.55)' : 'none',
            borderLeft: i % 2 === 0 ? '1.5px solid rgba(255,255,255,0.55)' : 'none',
            borderRight: i % 2 === 1 ? '1.5px solid rgba(255,255,255,0.55)' : 'none',
          }} />
        ))}

        {/* wireframe ADU placed mid-yard */}
        <div style={{ position: 'absolute', left: 60, top: 360, pointerEvents: 'none' }}>
          <LensWireframe />
        </div>

        {/* Top HUD — extremely calm. One line. */}
        <div style={{
          position: 'absolute', top: 64, left: 24, right: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mono size={10.5} color="rgba(237,233,221,0.55)">2 of 3</Mono>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1F9D63' }} />
            <Mono size={10.5} color="#1F9D63" weight={700}>scanning</Mono>
          </div>
          <Mono size={10.5} color="rgba(237,233,221,0.55)">28 × 12 ft</Mono>
        </div>

        {/* Center directive — single sentence */}
        <div style={{ position: 'absolute', top: 130, left: 24, right: 24, textAlign: 'center' }}>
          <Display size={28} color="#EDE9DD" italic>
            tap four corners of <span style={{ fontStyle: 'normal' }}>where the studio sits</span>.
          </Display>
        </div>

        {/* Progress — 4 minimal pips, last is pulsing */}
        <div style={{
          position: 'absolute', bottom: 156, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 14,
        }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{
              width: i === 3 ? 8 : 10, height: i === 3 ? 8 : 10, borderRadius: '50%',
              background: i < 3 ? '#1F9D63' : 'transparent',
              border: i < 3 ? 'none' : '1.5px solid rgba(237,233,221,0.6)',
              animation: i === 3 ? 'lens-pulse 1.4s ease-in-out infinite' : 'none',
            }} />
          ))}
          <style>{`@keyframes lens-pulse { 0%,100% { opacity: 0.4; transform: scale(0.85);} 50% { opacity: 1; transform: scale(1.1);} }`}</style>
        </div>

        {/* Bottom — one ticker line, minimal */}
        <div style={{
          position: 'absolute', bottom: 40, left: 24, right: 24,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          paddingBottom: 16, borderBottom: '1px solid rgba(237,233,221,0.18)',
        }}>
          <div>
            <Mono size={10.5} color="rgba(237,233,221,0.55)">LIVE ESTIMATE</Mono>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 38, color: '#EDE9DD', letterSpacing: -1, lineHeight: 1 }}>$326k</span>
              <Body size={12} color="rgba(237,233,221,0.55)">turnkey · 380 sqft</Body>
            </div>
          </div>
          <Mono size={11} color="#1F9D63" weight={700}>→</Mono>
        </div>
      </Page>
    </YMCtx.Provider>
  );
}

// ── 3. Result handoff ────────────────────────────────────────────────────
function LensResultScreen() {
  const { t, accent } = useT();
  return (
    <Page>
      <div style={{ padding: '32px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Mono size={10.5} color={t.inkFaint}>3 of 3</Mono>
        <Chip tone="accent">scanned · just now</Chip>
      </div>

      {/* The single quiet line */}
      <div style={{ padding: '52px 28px 28px' }}>
        <Eye style={{ marginBottom: 18 }}>Your project is open</Eye>
        <Display size={56}>
          4218 Magnolia. <span style={{ fontStyle: 'italic', color: accent.c }}>Garden studio</span>, placed.
        </Display>
      </div>

      {/* Rendered ADU thumbnail — calm card, no chrome */}
      <div style={{ padding: '0 28px' }}>
        <div style={{ position: 'relative', height: 220, borderRadius: 4, overflow: 'hidden', background: t.bgRaised, border: `1px solid ${t.line}` }}>
          <svg viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
            <rect width="360" height="120" fill="#E0E2D6" />
            <rect y="120" width="360" height="100" fill="#7B8B5C" />
            {/* fence */}
            <rect x="0" y="105" width="360" height="14" fill="#5C4831" />
            {/* tree */}
            <ellipse cx="46" cy="92" rx="38" ry="22" fill="#3F5234" />
            <ellipse cx="312" cy="86" rx="34" ry="20" fill="#3F5234" />
            {/* ADU iso */}
            <g transform="translate(78,72)">
              <polygon points="0,90 130,90 200,55 70,55" fill="#352a1b" />
              <polygon points="0,90 130,90 130,30 0,30" fill="#E6E0D0" />
              <polygon points="130,90 200,55 200,0 130,30" fill="#B8AC91" />
              <polygon points="0,30 130,30 200,0 70,0" fill="#15231C" />
              <rect x="28" y="46" width="14" height="36" fill="#3D2A14" />
              <rect x="70" y="42" width="32" height="22" fill="#7E9DB0" />
            </g>
          </svg>
          {/* small caption pinned in corner */}
          <div style={{ position: 'absolute', left: 12, bottom: 10 }}>
            <Mono size={9} color="rgba(255,255,255,0.85)" weight={700}>RENDER · WARM MODERN</Mono>
          </div>
        </div>
      </div>

      {/* 3 stat lines */}
      <div style={{ padding: '32px 28px 0' }}>
        <Hairline />
        {[
          { k: 'rent', v: '$2,450/mo' },
          { k: 'cost', v: '$278–$334k' },
          { k: 'payback', v: '6.4 yr' },
          { k: 'permit', v: 'clear · light setbacks' },
        ].map((r, i, arr) => (
          <React.Fragment key={r.k}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '14px 0' }}>
              <Mono size={11} weight={700} color={t.inkSoft} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>{r.k}</Mono>
              <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 22, color: t.ink, letterSpacing: -0.4 }}>{r.v}</span>
            </div>
            {i < arr.length - 1 && <Hairline />}
          </React.Fragment>
        ))}
        <Hairline />
      </div>

      <div style={{ padding: '36px 28px 12px' }}>
        <QuietCTA tone="accent">Open the project →</QuietCTA>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Body size={12} color={t.inkFaint}>
            assumptions are yours · <span style={{ color: t.ink, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>adjust before opening</span>
          </Body>
        </div>
      </div>
    </Page>
  );
}

Object.assign(window, { WelcomeScreen, LensScanScreen, LensResultScreen });
