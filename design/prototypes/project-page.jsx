// The Project Page — calm, one long vertical narrative.
// Replaces the 6-tab bottom nav. Sections: Money → Cost → Fit → Permit → Builders → Packet.

function ProjectPage({ activeSection = 1 }) {
  const { t, accent } = useT();
  return (
    <Page>
      <TopStrip sub="4218 magnolia · oakland 94609"
        right={<>
          <Chip tone="ghost" size={10}>scanned May 23</Chip>
          <span style={{ fontFamily: YM_FONT.serif, fontSize: 18, fontWeight: 600, color: t.ink }}>≡</span>
        </>}
      />

      <ProgressRail active={activeSection}
        items={['MONEY', 'COST', 'FIT', 'PERMIT', 'BUILD', 'PACKET']} />

      {/* ── HERO — the money line ─────────────────────────────────── */}
      <div style={{ padding: '60px 28px 40px', position: 'relative' }} data-screen-anchor="money">
        <Eye style={{ marginBottom: 18 }} dot>Income · live estimate</Eye>
        <Display size={48} italic style={{ fontWeight: 500, color: t.inkSoft, marginBottom: 16 }}>
          Your backyard could
          <br/>be earning rent.
        </Display>

        {/* Hero figure */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 96, color: accent.c,
            letterSpacing: -3, lineHeight: 0.95,
          }}>$2,450</span>
          <Body size={18} weight={600} color={t.inkSoft}>/mo</Body>
        </div>

        <div style={{ marginTop: 16, maxWidth: 320 }}>
          <Body size={13.5} color={t.inkSoft}>
            Comparable studio ADUs within 0.6 mi rent at <Mono weight={700} color={t.ink}>$2,310–$2,580</Mono>. Estimate, not a guarantee.
          </Body>
        </div>

        {/* Tiny tap-target — adjust assumptions */}
        <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Mono size={11} color={t.ink} weight={700} style={{ borderBottom: `1px solid ${t.ink}`, paddingBottom: 1 }}>adjust assumptions</Mono>
          <Mono size={11} color={t.inkFaint}>·</Mono>
          <Mono size={11} color={t.inkFaint}>tap the figure</Mono>
        </div>
      </div>

      <Hairline />

      {/* ── COST ──────────────────────────────────────────────────── */}
      <div style={{ padding: '40px 28px' }} data-screen-anchor="cost">
        <Eye style={{ marginBottom: 14 }}>The cost</Eye>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 44, color: t.ink, lineHeight: 1, letterSpacing: -1,
          }}>$278<span style={{ color: t.inkFaint }}>–</span>$334k</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Body size={14.5}>
            Pays back in <span style={{ fontFamily: YM_FONT.serif, fontStyle: 'italic', color: accent.c, fontSize: 18, fontWeight: 600 }}>6.4 years</span>. 
            After that, every month of rent is yours. <span style={{ color: t.inkFaint }}>HELOC at 7.4% dry-run.</span>
          </Body>
        </div>

        {/* Mini sparkline — payback crossover */}
        <div style={{ marginTop: 24, position: 'relative', height: 92, padding: '12px 0' }}>
          <svg viewBox="0 0 320 80" preserveAspectRatio="none" style={{ width: '100%', height: 80, display: 'block' }}>
            <line x1="0" y1="60" x2="320" y2="60" stroke={t.line} strokeWidth="1" />
            {/* horizon */}
            <line x1="0" y1="20" x2="320" y2="20" stroke={t.lineSoft} strokeWidth="1" strokeDasharray="3 3" />
            {/* equity curve */}
            <path d="M 0 75 C 30 70, 60 60, 100 50 S 180 30, 220 18 S 290 6, 320 4"
              fill="none" stroke={accent.c} strokeWidth="2" />
            {/* breakeven dot */}
            <circle cx="135" cy="38" r="4" fill={t.bg} stroke={accent.c} strokeWidth="2" />
          </svg>
          <div style={{ position: 'absolute', left: 130, top: 14 }}>
            <Mono size={9} color={accent.c} weight={700}>BREAKEVEN · YR 6</Mono>
          </div>
          <div style={{ position: 'absolute', right: 0, bottom: 6 }}>
            <Mono size={9} color={t.inkFaint} weight={600}>YR 30 · +$420K</Mono>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mono size={11} color={t.ink} weight={700} style={{ borderBottom: `1px solid ${t.ink}`, paddingBottom: 1 }}>see the sheet →</Mono>
        </div>
      </div>

      <Hairline />

      {/* ── FIT (Studio) ──────────────────────────────────────────── */}
      <div style={{ padding: '40px 28px' }} data-screen-anchor="fit">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <Eye>The fit</Eye>
          <Mono size={10.5} color={t.inkSoft} weight={700}>94 / 100</Mono>
        </div>
        <Display size={36}>
          Garden Studio, <span style={{ fontStyle: 'italic', color: accent.c }}>placed.</span>
        </Display>
        <div style={{ marginTop: 12, maxWidth: 320 }}>
          <Body size={13.5} color={t.inkSoft}>
            28 × 12 ft. Clears the 4 ft setback with two inches to spare. Keeps the lemon tree.
          </Body>
        </div>

        {/* iso preview, very calm */}
        <div style={{ marginTop: 26, padding: '8px 0' }}>
          <svg viewBox="0 0 320 140" width="100%" height="140" style={{ display: 'block' }}>
            {/* lot outline */}
            <polygon points="20,120 290,120 300,30 30,40" fill="none" stroke={t.line} strokeWidth="1" />
            {/* main house at top */}
            <rect x="30" y="40" width="120" height="22" fill={t.bgSubtle} stroke={t.line} strokeWidth="0.8" />
            <text x="36" y="55" fontFamily={YM_FONT.mono} fontSize="9" fill={t.inkFaint} fontWeight="600">YOUR HOUSE</text>
            {/* ADU placed in back */}
            <g>
              <polygon points="160,90 250,90 290,68 200,68" fill={accent.soft} stroke={accent.c} strokeWidth="1.4" />
              <polygon points="160,90 250,90 250,75 160,75" fill="#fff" stroke={accent.c} strokeWidth="1.4" />
            </g>
            <text x="200" y="106" fontFamily={YM_FONT.mono} fontSize="9" fill={accent.c} fontWeight="700">GARDEN STUDIO</text>
            {/* setback line */}
            <line x1="290" y1="68" x2="300" y2="68" stroke={t.lineStrong} strokeWidth="1" />
            <line x1="295" y1="63" x2="295" y2="73" stroke={t.lineStrong} strokeWidth="1" />
            <text x="270" y="60" fontFamily={YM_FONT.mono} fontSize="8" fill={t.inkSoft}>4'2"</text>
            {/* dim arrow */}
            <line x1="160" y1="98" x2="250" y2="98" stroke={t.lineSoft} strokeWidth="0.8" strokeDasharray="2 2" />
          </svg>
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 14, alignItems: 'center' }}>
          <Mono size={11} color={t.ink} weight={700} style={{ borderBottom: `1px solid ${t.ink}`, paddingBottom: 1 }}>try other models</Mono>
          <Mono size={11} color={t.inkFaint}>· 5 fit your lot</Mono>
        </div>
      </div>

      <Hairline />

      {/* ── PERMIT ────────────────────────────────────────────────── */}
      <div style={{ padding: '40px 28px' }} data-screen-anchor="permit">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <Eye>The permit</Eye>
          <Mono size={10.5} color={t.inkFaint}>verified May 20</Mono>
        </div>
        <Display size={36}>
          Clear with <span style={{ fontStyle: 'italic', color: '#C1760D' }}>light setbacks.</span>
        </Display>
        <div style={{ marginTop: 14, maxWidth: 340 }}>
          <Body size={13.5} color={t.inkSoft}>
            Oakland 94609. Three conditions cleared. One needs a small footprint adjustment to stay above the rear-yard minimum.
          </Body>
        </div>

        {/* Compact condition strip */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { l: 'rear setback', v: '4 ft 2 in clear', tone: 'warn' },
            { l: 'height limit', v: '14 ft of 16 ft', tone: 'ok' },
            { l: 'fire path', v: '3 ft 6 in clear', tone: 'ok' },
            { l: 'utility tie-in', v: 'lateral within 12 ft', tone: 'ok' },
          ].map((c, i, arr) => {
            const dotColor = c.tone === 'ok' ? accent.c : c.tone === 'warn' ? '#C1760D' : '#D1583F';
            return (
              <React.Fragment key={c.l}>
                <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                    <Body size={13} weight={700}>{c.l}</Body>
                  </div>
                  <Mono size={12} color={t.inkSoft}>{c.v}</Mono>
                </div>
                {i < arr.length - 1 && <Hairline />}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ marginTop: 18, padding: '12px 14px', background: t.bgSubtle, borderRadius: 4 }}>
          <Body size={12} color={t.inkSoft} italic>
            <Mono size={11} weight={700} color={t.ink}>Verify with Oakland Planning</Mono> before construction. Three Tier-A sources cited.
          </Body>
        </div>
      </div>

      <Hairline />

      {/* ── BUILDERS ──────────────────────────────────────────────── */}
      <div style={{ padding: '40px 28px' }} data-screen-anchor="build">
        <Eye style={{ marginBottom: 14 }}>The builders</Eye>
        <Display size={36}>
          Seven ready in <span style={{ fontStyle: 'italic', color: accent.c }}>your zone.</span>
        </Display>
        <div style={{ marginTop: 12, maxWidth: 320 }}>
          <Body size={13.5} color={t.inkSoft}>
            Filtered to licensed, insured, with ADU experience. Lowest bid arriving from Golden State Modular at <Mono weight={700} color={t.ink}>$278k</Mono>.
          </Body>
        </div>

        {/* 3 builders, minimal rows */}
        <div style={{ marginTop: 24 }}>
          {[
            { n: 'Apex ADU Builders', m: '96 fit', p: '$316k', e: '28 wk', rib: 'best fit' },
            { n: 'Golden State Modular', m: '91 fit', p: '$278k', e: '22 wk', rib: 'lowest' },
            { n: 'EcoStudio Construction', m: '87 fit', p: '$346k', e: '34 wk', rib: 'premium' },
          ].map((b, i, arr) => (
            <React.Fragment key={b.n}>
              <div style={{ padding: '18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mono size={10.5} color={t.inkFaint} style={{ width: 16 }}>{String(i+1).padStart(2,'0')}</Mono>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 18, color: t.ink, letterSpacing: -0.3 }}>{b.n}</div>
                  <div style={{ marginTop: 2, display: 'flex', gap: 10 }}>
                    <Mono size={11} color={t.inkSoft}>{b.m}</Mono>
                    <Mono size={11} color={t.inkSoft}>·</Mono>
                    <Mono size={11} color={t.inkSoft}>{b.e}</Mono>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 20, color: t.ink }}>{b.p}</span>
                  <div><Mono size={9} color={accent.c} weight={700}>{b.rib.toUpperCase()}</Mono></div>
                </div>
              </div>
              {i < arr.length - 1 && <Hairline />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <Mono size={11} color={t.ink} weight={700} style={{ borderBottom: `1px solid ${t.ink}`, paddingBottom: 1 }}>open the live feed →</Mono>
        </div>
      </div>

      <Hairline />

      {/* ── PACKET — the final CTA ──────────────────────────────── */}
      <div style={{ padding: '40px 28px 24px' }} data-screen-anchor="packet">
        <Eye style={{ marginBottom: 14 }}>The packet</Eye>
        <Display size={32}>
          Six of six items <span style={{ fontStyle: 'italic', color: accent.c }}>ready.</span>
        </Display>
        <div style={{ marginTop: 24 }}>
          {[
            'Lot scan + buildable zone',
            'Model fit · Garden Studio',
            'Permit forecast · Oakland 94609',
            'Cost range + payback',
            'Owner notes · privacy + tenant plan',
            'Three quote-ready scopes',
          ].map((it, i) => (
            <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', background: accent.c, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: YM_FONT.sans, fontWeight: 800, fontSize: 10,
              }}>✓</span>
              <Body size={13.5}>{it}</Body>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30 }}>
          <QuietCTA tone="ink">Send packet to three builders →</QuietCTA>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Body size={11.5} color={t.inkFaint}>your address stays private until you choose a builder</Body>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </Page>
  );
}

Object.assign(window, { ProjectPage });
