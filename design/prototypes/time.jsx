// Concept 3 — YardUp Time Machine
// "See yourself richer." Scrub a year and watch the rent tower compound,
// annotated with life events: ADU built, payback hit, loan paid, family moved in.

function RentTower({ year = 7 }) {
  // Each brick = $5,000 banked rent. Tower grows.
  // Net annual ~ 22,140 → ~4.4 bricks/year after yr 1.
  const cap = 60;
  const bricks = Math.min(cap, Math.max(0, Math.floor((year - 1) * 4.4)));
  return (
    <div style={{ position: 'relative', width: 120, height: 360, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* base — ADU footprint plate */}
      <div style={{
        position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%) skewX(-30deg)',
        width: 130, height: 22, background: YU.forestDeep, borderRadius: 4,
        boxShadow: '0 18px 22px rgba(0,0,0,0.18)',
      }} />
      {/* tower */}
      <div style={{
        width: 84, display: 'flex', flexDirection: 'column-reverse', gap: 2, padding: 2,
        position: 'relative', zIndex: 2,
      }}>
        {Array.from({ length: bricks }).map((_, i) => {
          const isCash = i % 5 === 4; // every 5th = $25k milestone, accent
          return (
            <div key={i} style={{
              height: 10, borderRadius: 1.5,
              background: isCash ? YU.cash : (i < 4 ? YU.revenueDeep : YU.revenue),
              border: '1px solid rgba(0,0,0,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08)',
              position: 'relative',
              animation: `tg-rise 0.5s cubic-bezier(.2,.7,.3,1) ${i * 0.012}s both`,
            }}>
              {isCash && (
                <div style={{ position: 'absolute', right: 'calc(100% + 8px)', top: -3, whiteSpace: 'nowrap' }}>
                  <Mono size={9} color={YU.muted} weight={700}>${(i+1)*5}k</Mono>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ghost stack of "remaining years" outline */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 88, height: bricks * 12 + bricks * 0, pointerEvents: 'none',
      }} />
      <style>{`@keyframes tg-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function TimelineMark({ left, label, value, accent = YU.revenue, active }) {
  return (
    <div style={{ position: 'absolute', left, top: -38, transform: 'translateX(-50%)', textAlign: 'center' }}>
      <div style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10, color: accent, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
      <Mono size={9} color={YU.muted} weight={600}>{value}</Mono>
      <div style={{ width: 1, height: 16, background: accent, margin: '4px auto 0', opacity: active ? 1 : 0.5 }} />
    </div>
  );
}

function TimeMachineScreen() {
  const year = 7;
  const banked = 184200;
  return (
    <YUScreen bg={YU.paper}>
      {/* topographic warm backdrop */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, opacity: 0.45,
        background: 'radial-gradient(circle at 50% 25%, rgba(207,248,109,0.18), transparent 50%), radial-gradient(circle at 20% 80%, rgba(31,157,99,0.10), transparent 55%)',
      }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: 6, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 18 }}>←</div>
          <div>
            <Mono size={9.5} color={YU.muted}>4218 magnolia · garden studio</Mono>
            <div style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14 }}>Time Machine</div>
          </div>
        </div>
        <Pill bg={YU.forestDeep} fg={YU.cash} border={`1px solid ${YU.forestDeep}`}>
          assumption mode
        </Pill>
      </div>

      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 }}>

        {/* The hero year */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Eyebrow>Year</Eyebrow>
          <div style={{
            fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 86, lineHeight: 0.9,
            color: YU.ink, letterSpacing: -2, marginTop: -2,
          }}>{year}</div>
          <div style={{ marginTop: 6 }}>
            <Body size={12} color={YU.muted}>since the studio went rentable</Body>
          </div>
        </div>

        {/* tower + side annotations */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 10 }}>
          {/* Left side annotations */}
          <div style={{ width: 130, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 28 }}>
            <div>
              <Eyebrow accent={YU.revenue}>Net banked</Eyebrow>
              <div style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 30, color: YU.ink, lineHeight: 1, marginTop: 2 }}>
                $184,200
              </div>
              <Mono size={10} color={YU.muted}>cash + equity</Mono>
            </div>
            <div>
              <Eyebrow accent={YU.builder}>Loan balance</Eyebrow>
              <div style={{ fontFamily: YU_FONT.mono, fontWeight: 600, fontSize: 18, color: YU.ink, lineHeight: 1, marginTop: 2 }}>$148k</div>
            </div>
          </div>

          <RentTower year={year} />

          {/* Right side annotations */}
          <div style={{ width: 130, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 28 }}>
            <div>
              <Eyebrow accent={YU.permit}>Tenant</Eyebrow>
              <Body size={12} weight={700} style={{ display: 'block', marginTop: 2 }}>Year 3 tenant</Body>
              <Mono size={10} color={YU.muted}>$2,610/mo</Mono>
            </div>
            <div>
              <Eyebrow accent={YU.revenueDeep}>Payback</Eyebrow>
              <Body size={12} weight={700} style={{ display: 'block', marginTop: 2 }}>cleared yr 6.4</Body>
              <Mono size={10} color={YU.revenue} weight={700}>+$32,400 ahead</Mono>
            </div>
            <div>
              <Eyebrow>Home value</Eyebrow>
              <Mono size={13} weight={700}>+$118k</Mono>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom — scrubber */}
      <div style={{
        position: 'absolute', bottom: 64, left: 12, right: 12,
        background: YU.canvas, borderRadius: 22, padding: '20px 14px 14px',
        border: `1px solid ${YU.border}`, boxShadow: YU_SHADOW.med,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingTop: 2 }}>
          <Eyebrow>Scrub a year</Eyebrow>
          <Mono size={10} color={YU.muted}>0 → 30 yr</Mono>
        </div>

        <div style={{ position: 'relative', height: 60, marginBottom: 6 }}>
          {/* track */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 4, borderRadius: 99, background: YU.border }} />
          {/* fill */}
          <div style={{ position: 'absolute', left: 0, top: 30, height: 4, borderRadius: 99, background: `linear-gradient(90deg, ${YU.revenueDeep}, ${YU.revenue} 60%, ${YU.cashDeep})`, width: `${(year / 30) * 100}%` }} />
          {/* milestone marks */}
          <TimelineMark left="3%" label="Built" value="yr 1" accent={YU.muted} />
          <TimelineMark left="21%" label="Payback" value="yr 6.4" accent={YU.revenue} active />
          <TimelineMark left="40%" label="Mom in" value="yr 12" accent={YU.permit} />
          <TimelineMark left="100%" label="Owned outright" value="yr 30" accent={YU.muted} />
          {/* thumb */}
          <div style={{
            position: 'absolute', left: `calc(${(year / 30) * 100}% - 18px)`, top: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: YU.forestDeep, border: `3px solid ${YU.cash}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: YU.cash, fontFamily: YU_FONT.mono, fontWeight: 800, fontSize: 13,
            boxShadow: '0 8px 18px rgba(14,44,32,0.35)',
          }}>{year}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${YU.border}` }}>
          <Body size={11.5} color={YU.muted}>
            <span style={{ color: YU.ink, fontWeight: 700 }}>$72/day</span> · cash flowing after expenses
          </Body>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: YU.mintSoft, borderRadius: 9999, color: YU.revenueDeep, fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 11 }}>
            <Dot color={YU.revenue} size={6} />tweak assumptions
          </div>
        </div>
      </div>

      <YUTabBar active={2} tabs={['Money','Studio','Time','Build','You']} />
    </YUScreen>
  );
}

Object.assign(window, { TimeMachineScreen });
