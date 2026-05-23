// Concept 4 — YardUp Permit Radar
// "Weather report for your permit." A clear forecast pattern: big hero condition,
// then a stack of weather-style condition cards underneath. Verified sources
// surfaced like a credible news source.

function ForecastDial({ value = 38, label = 'Light setbacks' }) {
  // value 0–100 risk; lower = clearer.
  const r = 70, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const color = value < 35 ? YU.revenue : value < 65 ? YU.permit : YU.error;
  return (
    <div style={{ position: 'relative', width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      {/* small ticks behind ring */}
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * 2 * Math.PI;
          const x1 = 90 + Math.cos(a) * 56, y1 = 90 + Math.sin(a) * 56;
          const x2 = 90 + Math.cos(a) * 60, y2 = 90 + Math.sin(a) * 60;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(237,243,238,0.18)" strokeWidth="1" />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EDF3EE' }}>
        <Mono size={9} color="rgba(237,243,238,0.5)" weight={700}>RISK</Mono>
        <div style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 56, lineHeight: 1, color: '#EDF3EE', marginTop: 2 }}>{value}</div>
        <Mono size={10} color={color} weight={700}>/ 100</Mono>
      </div>
    </div>
  );
}

function ConditionRow({ glyph, label, value, tone = 'ok', detail }) {
  const toneMap = {
    ok: { bg: YU.mintSoft, fg: YU.revenueDeep, dot: YU.revenue },
    warn: { bg: YU.permitSoft, fg: YU.permit, dot: YU.permit },
    bad: { bg: YU.errorSoft, fg: YU.error, dot: YU.error },
    neutral: { bg: YU.paper2, fg: YU.muted, dot: YU.faint },
  };
  const t = toneMap[tone];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14,
      background: YU.canvas, border: `1px solid ${YU.border}`,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.fg, fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 18,
      }}>{glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <Body size={13} weight={700}>{label}</Body>
          <Mono size={10} color={YU.muted}>{detail}</Mono>
        </div>
        <Mono size={12} color={t.fg} weight={700} style={{ display: 'block', marginTop: 2 }}>{value}</Mono>
      </div>
      <Dot color={t.dot} size={8} />
    </div>
  );
}

function PermitRadarScreen() {
  return (
    <YUScreen bg={YU.paper}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 6, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 18 }}>←</div>
          <div>
            <Mono size={9.5} color={YU.muted}>oakland · 94609</Mono>
            <div style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14 }}>Permit forecast</div>
          </div>
        </div>
        <Mono size={9.5} color={YU.muted}>verified May 20</Mono>
      </div>

      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 60, padding: '0 14px', overflow: 'auto' }}>

        {/* Hero forecast card */}
        <div style={{
          marginTop: 4,
          background: 'linear-gradient(150deg, #143D2B 0%, #0E2C20 70%)',
          color: '#EDF3EE', borderRadius: 22, padding: 18, boxShadow: YU_SHADOW.deep,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* radial sand glow */}
          <div aria-hidden style={{
            position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(207,248,109,0.18), transparent 65%)',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <ForecastDial value={38} />
            <div style={{ flex: 1, paddingTop: 6 }}>
              <Eyebrow tone="light">Forecast for your lot</Eyebrow>
              <div style={{
                fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 28, lineHeight: 1.05,
                color: '#EDF3EE', marginTop: 6,
              }}>
                Clear with <span style={{ color: YU.permit, fontStyle: 'italic' }}>light setbacks</span>.
              </div>
              <Body size={11.5} color="rgba(237,243,238,0.78)" style={{ display: 'block', marginTop: 8 }}>
                3 conditions are good. 1 needs a small footprint adjustment.
              </Body>
            </div>
          </div>

          {/* mini outlook strip */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {[
              { d: 'Today', t: '38' },
              { d: 'Plan check', t: '46' },
              { d: 'After 2025', t: '32', good: true },
              { d: 'SB-9 path', t: '22', good: true },
            ].map((o, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Eyebrow tone="light">{o.d}</Eyebrow>
                <div style={{ marginTop: 4 }}>
                  <Mono size={14} weight={700} color={o.good ? YU.cash : '#EDF3EE'}>{o.t}</Mono>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Condition stack */}
        <div style={{ marginTop: 16, marginBottom: 8, paddingLeft: 4, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Eyebrow>Conditions on your parcel</Eyebrow>
          <Mono size={10} color={YU.muted}>4 of 8 checked</Mono>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ConditionRow glyph="◐" label="Rear setback" detail="min 4 ft" value="4 ft 2 in clear · tight margin" tone="warn" />
          <ConditionRow glyph="↥" label="Height limit" detail="16 ft" value="14 ft proposed · cleared" tone="ok" />
          <ConditionRow glyph="◇" label="Fire access path" detail="3 ft side" value="3 ft 6 in available · cleared" tone="ok" />
          <ConditionRow glyph="≡" label="Utility tie-in" detail="sewer lateral" value="lateral within 12 ft of footprint" tone="ok" />
          <ConditionRow glyph="◯" label="Coastal overlay" detail="not flagged" value="parcel outside zone" tone="neutral" />
        </div>

        {/* Verified source row */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 14,
          background: YU.canvas, border: `1px solid ${YU.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Eyebrow>Sources verified</Eyebrow>
            <Pill bg={YU.mintSoft} fg={YU.revenueDeep} border={`1px solid ${YU.mintSoft}`}>
              <Dot color={YU.revenue} size={6} /> Tier-A
            </Pill>
          </div>
          {[
            'Oakland Planning Code §17.103 (ADU)',
            'CA Gov Code §65852.2',
            'Alameda County Fire Code §503',
          ].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Mono size={11} color={YU.muted} weight={500}>↗</Mono>
              <Body size={12}>{s}</Body>
            </div>
          ))}
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10, background: YU.paper2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Body size={11} color={YU.muted}><span style={{ color: YU.ink, fontWeight: 700 }}>Verify with Oakland Planning</span> before construction</Body>
            <Mono size={11} weight={700} color={YU.builder}>call →</Mono>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>

      <YUTabBar active={3} tabs={['Money','Studio','Build','Permit','You']} />
    </YUScreen>
  );
}

Object.assign(window, { PermitRadarScreen });
