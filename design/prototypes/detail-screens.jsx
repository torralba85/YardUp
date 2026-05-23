// Detail screens — Estimate, Studio (Fit), Permit, Build.
// Reached by drilling into a section of The Project Page. Same calm-minimal
// aesthetic but each one earns the full bleed for one focused decision.

function DetailHeader({ kicker, title, italic, right, onBack = true }) {
  const { t, accent } = useT();
  return (
    <>
      <div style={{ padding: '16px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Mono size={11} color={t.ink} weight={700}>{onBack ? '←' : ''} <span style={{ color: t.inkFaint }}>back to project</span></Mono>
        {right}
      </div>
      <div style={{ padding: '32px 24px 24px' }}>
        <Eye style={{ marginBottom: 16 }}>{kicker}</Eye>
        <Display size={44}>
          {title}{italic && <> <span style={{ fontStyle: 'italic', color: accent.c }}>{italic}</span></>}
        </Display>
      </div>
      <Hairline />
    </>
  );
}

// ── ESTIMATE ──────────────────────────────────────────────────────────────
function EstimateScreen() {
  const { t, accent } = useT();
  return (
    <Page>
      <DetailHeader kicker="Underwriting · your lot"
        title="The sheet."
        italic="every assumption visible."
        right={<Mono size={10.5} color={t.inkFaint}>v3 · edited 2m ago</Mono>} />

      {/* Sheet — rows of inputs and computed values */}
      <div style={{ padding: '8px 24px 0' }}>
        {[
          { sec: 'INCOME', rows: [
            { l: 'Monthly rent', v: '$2,450', interactive: true, sub: '$2,310–$2,580 comps' },
            { l: 'Vacancy', v: '6%', interactive: true, sub: '~3 wks/yr' },
            { l: 'Gross rent (yr 1)', v: '$27,636', mute: true },
          ]},
          { sec: 'EXPENSES', rows: [
            { l: 'Property tax bump', v: '$1,840', sub: 'on $230k assessed lift' },
            { l: 'Insurance', v: '$420' },
            { l: 'Maintenance', v: '$1,800', sub: '6.5% of rent' },
            { l: 'Net annual', v: '$23,576', mute: true, accent: true },
          ]},
        ].map((s) => (
          <div key={s.sec} style={{ marginBottom: 24 }}>
            <Mono size={10.5} weight={700} color={t.inkSoft} style={{ display: 'block', letterSpacing: 2, marginBottom: 6 }}>{s.sec}</Mono>
            {s.rows.map((r, i, arr) => (
              <React.Fragment key={r.l}>
                <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Body size={14} weight={r.mute ? 700 : 500} color={t.ink}>{r.l}</Body>
                    {r.sub && <div style={{ marginTop: 2 }}><Mono size={10.5} color={t.inkFaint}>{r.sub}</Mono></div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: r.mute ? YM_FONT.serif : YM_FONT.mono,
                      fontWeight: r.mute ? 600 : 600, fontSize: r.mute ? 22 : 14,
                      color: r.accent ? accent.c : t.ink,
                      letterSpacing: r.mute ? -0.3 : 0,
                    }}>{r.v}</span>
                    {r.interactive && <div><Mono size={9.5} color={t.inkFaint}>tap to adjust</Mono></div>}
                  </div>
                </div>
                {i < arr.length - 1 && <Hairline />}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      <Hairline />

      {/* Hero result — restated */}
      <div style={{ padding: '32px 24px' }}>
        <Eye style={{ marginBottom: 12 }}>The verdict</Eye>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div>
            <Mono size={10.5} color={t.inkFaint}>NET ANNUAL</Mono>
            <div><span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 54, color: accent.c, letterSpacing: -1, lineHeight: 1 }}>$23,576</span></div>
          </div>
          <div style={{ paddingBottom: 6 }}>
            <Mono size={11} color={t.inkFaint}>PAYBACK</Mono>
            <div><span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 26, color: t.ink, lineHeight: 1 }}>6.4 yr</span></div>
          </div>
        </div>
        <div style={{ marginTop: 14, maxWidth: 320 }}>
          <Body size={13} color={t.inkSoft}>
            Year 10 ROI <Mono weight={700} color={t.ink}>+58%</Mono>. Year 30 home value lift <Mono weight={700} color={t.ink}>+$420k</Mono>.
          </Body>
        </div>
      </div>

      <Hairline />

      {/* Sensitivity — three pivots */}
      <div style={{ padding: '32px 24px 40px' }}>
        <Eye style={{ marginBottom: 16 }}>If we change one number</Eye>
        {[
          { axis: 'Rent', moves: [
            { v: '−$250', d: 'payback to 7.4 yr', neg: true },
            { v: '+$250', d: 'payback to 5.6 yr' },
          ]},
          { axis: 'Cost', moves: [
            { v: '−$30k', d: 'payback to 5.5 yr' },
            { v: '+$30k', d: 'payback to 7.6 yr', neg: true },
          ]},
          { axis: 'Vacancy', moves: [
            { v: '12%', d: 'payback to 7.1 yr', neg: true },
            { v: '3%', d: 'payback to 6.0 yr' },
          ]},
        ].map((row, i, arr) => (
          <React.Fragment key={row.axis}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 0', gap: 12 }}>
              <Mono size={11} weight={700} color={t.ink} style={{ width: 70 }}>{row.axis}</Mono>
              <div style={{ display: 'flex', gap: 14, flex: 1, justifyContent: 'flex-end' }}>
                {row.moves.map(m => (
                  <div key={m.v} style={{ textAlign: 'right' }}>
                    <Mono size={12} weight={700} color={m.neg ? '#D1583F' : accent.c}>{m.v}</Mono>
                    <div><Mono size={10} color={t.inkFaint}>{m.d}</Mono></div>
                  </div>
                ))}
              </div>
            </div>
            {i < arr.length - 1 && <Hairline />}
          </React.Fragment>
        ))}
      </div>
    </Page>
  );
}

// ── STUDIO (FIT) ─────────────────────────────────────────────────────────
function StudioScreen() {
  const { t, accent } = useT();
  const models = [
    { id: 'studio-340', n: 'Garden Studio', s: '380 sqft · studio', fit: 94, rent: '$2,450', cost: '$278k', tag: 'placed', active: true },
    { id: 'one-500', n: 'One-Bed Bar', s: '500 sqft · 1bd', fit: 91, rent: '$2,890', cost: '$326k' },
    { id: 'garage-420', n: 'Garage Suite', s: '420 sqft · studio', fit: 89, rent: '$2,100', cost: '$214k', tag: 'conversion' },
    { id: 'two-610', n: 'Compact Two', s: '610 sqft · 2bd', fit: 86, rent: '$3,310', cost: '$342k' },
    { id: 'accessible-560', n: 'Universal One', s: '560 sqft · 1bd', fit: 88, rent: '$2,540', cost: '$356k', tag: 'accessible' },
  ];
  return (
    <Page>
      <DetailHeader kicker="Studio · model fit"
        title="Five fit"
        italic="your buildable zone."
        right={<Mono size={10.5} color={t.inkFaint}>↻ rescan yard</Mono>} />

      {/* The placed model preview */}
      <div style={{ padding: '28px 24px 12px' }}>
        <svg viewBox="0 0 320 160" width="100%" height="160" style={{ display: 'block' }}>
          {/* lot */}
          <polygon points="14,140 304,140 312,30 22,40" fill={t.bgRaised} stroke={t.line} strokeWidth="1" />
          {/* main house */}
          <rect x="22" y="40" width="140" height="22" fill={t.bgSubtle} stroke={t.line} strokeWidth="0.8" />
          <text x="28" y="55" fontFamily={YM_FONT.mono} fontSize="9" fill={t.inkFaint} fontWeight="600">YOUR HOUSE</text>
          {/* placed studio iso */}
          <g>
            <polygon points="170,105 280,105 312,82 200,82" fill={accent.soft} stroke={accent.c} strokeWidth="1.4" />
            <polygon points="170,105 280,105 280,90 170,90" fill="#fff" stroke={accent.c} strokeWidth="1.4" />
            <polygon points="280,105 312,82 312,68 280,90" fill={t.bgSubtle} stroke={accent.c} strokeWidth="1.2" />
            <polygon points="170,90 280,90 312,68 200,68" fill={t.ink} stroke={accent.c} strokeWidth="1.4" />
          </g>
          <text x="218" y="124" fontFamily={YM_FONT.mono} fontSize="9" fill={accent.c} fontWeight="700">GARDEN STUDIO</text>
          {/* setback markers */}
          <line x1="312" y1="68" x2="320" y2="68" stroke={t.lineStrong} strokeWidth="1" />
          <text x="288" y="60" fontFamily={YM_FONT.mono} fontSize="8" fill={t.inkSoft}>4'2"</text>
        </svg>
      </div>

      <Hairline />

      {/* Model list — minimal rows */}
      <div style={{ padding: '14px 24px 0' }}>
        <Eye style={{ marginBottom: 6, display: 'block' }}>Other models that fit</Eye>
      </div>
      <div style={{ padding: '0 24px' }}>
        {models.map((m, i) => (
          <React.Fragment key={m.id}>
            <div style={{ padding: '18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 60, height: 48, position: 'relative' }}>
                {/* mini iso glyph */}
                <svg viewBox="0 0 60 48" width="60" height="48">
                  <polygon points="6,38 38,38 56,28 24,28" fill={m.active ? accent.soft : t.bgSubtle} stroke={m.active ? accent.c : t.line} strokeWidth="1.2" />
                  <polygon points="6,38 38,38 38,22 6,22" fill={t.bgRaised} stroke={m.active ? accent.c : t.line} strokeWidth="1.2" />
                  <polygon points="6,22 38,22 56,12 24,12" fill={m.active ? t.ink : t.inkSoft} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 17, color: t.ink, letterSpacing: -0.3 }}>{m.n}</span>
                  {m.tag && <Chip tone={m.active ? 'accent' : 'ghost'} size={9}>{m.tag}</Chip>}
                </div>
                <div style={{ marginTop: 2 }}>
                  <Mono size={11} color={t.inkSoft}>{m.s}</Mono>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Mono size={13} weight={700} color={t.ink}>{m.rent}<span style={{ color: t.inkFaint, fontWeight: 500 }}>/mo</span></Mono>
                <div><Mono size={10.5} color={t.inkFaint}>{m.cost} · {m.fit} fit</Mono></div>
              </div>
            </div>
            {i < models.length - 1 && <Hairline />}
          </React.Fragment>
        ))}
      </div>

      <Hairline />

      {/* Style — calm */}
      <div style={{ padding: '24px 24px 40px' }}>
        <Eye style={{ marginBottom: 16 }}>Look · pick a direction</Eye>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Warm modern', 'Bungalow', 'Coastal', 'Industrial', 'Farmhouse'].map((s, i) => (
            <Chip key={s} tone={i === 0 ? 'ink' : 'ghost'} size={11}>{s}</Chip>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <QuietCTA tone="ghost">Regenerate concept →</QuietCTA>
        </div>
      </div>
    </Page>
  );
}

// ── PERMIT ─────────────────────────────────────────────────────────────────
function PermitScreen() {
  const { t, accent } = useT();
  return (
    <Page>
      <DetailHeader kicker="Permit · oakland 94609"
        title="Three cleared,"
        italic="one to verify."
        right={<Mono size={10.5} color={t.inkFaint}>verified May 20</Mono>} />

      {/* Forecast strip across time */}
      <div style={{ padding: '24px 24px 0' }}>
        <Eye style={{ marginBottom: 12 }}>Outlook</Eye>
        <div style={{ display: 'flex', gap: 0, marginTop: 6 }}>
          {[
            { d: 'Today', t: '38', m: 'clear · light setbacks' },
            { d: 'Plan check', t: '46', m: '~12 wk queue' },
            { d: 'After SB-9', t: '22', m: 'cleaner if reduced' },
            { d: '2027', t: '32', m: 'rule refresh pending' },
          ].map((o, i, arr) => (
            <React.Fragment key={o.d}>
              <div style={{ flex: 1, padding: '14px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Mono size={9.5} color={t.inkFaint} weight={700}>{o.d.toUpperCase()}</Mono>
                <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 22, color: t.ink, lineHeight: 1 }}>{o.t}</span>
                <Mono size={9.5} color={t.inkSoft}>{o.m}</Mono>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1, background: t.line }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Hairline />

      {/* Conditions */}
      <div style={{ padding: '24px 24px 0' }}>
        <Eye style={{ marginBottom: 14 }}>Conditions on your parcel</Eye>
        {[
          { l: 'Rear setback', v: '4 ft 2 in clear', d: 'min 4 ft · tight margin', tone: 'warn' },
          { l: 'Height limit', v: '14 ft of 16 ft', d: 'cleared', tone: 'ok' },
          { l: 'Fire access path', v: '3 ft 6 in side', d: 'cleared', tone: 'ok' },
          { l: 'Utility tie-in', v: 'lateral at 12 ft', d: 'within reach · cleared', tone: 'ok' },
          { l: 'Coastal overlay', v: 'not flagged', d: 'parcel outside zone', tone: 'neutral' },
          { l: 'Owner-occupancy', v: 'not required', d: 'state law CA Gov §65852.2', tone: 'ok' },
          { l: 'Tree protection', v: 'oak at 8 ft', d: 'survey before grading', tone: 'warn' },
        ].map((c, i, arr) => {
          const dot = c.tone === 'ok' ? accent.c : c.tone === 'warn' ? '#C1760D' : t.inkFaint;
          return (
            <React.Fragment key={c.l}>
              <div style={{ padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
                    <Body size={14} weight={700}>{c.l}</Body>
                  </div>
                  <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 17, color: t.ink, letterSpacing: -0.3 }}>{c.v}</span>
                </div>
                <div style={{ marginLeft: 17, marginTop: 3 }}><Mono size={10.5} color={t.inkSoft}>{c.d}</Mono></div>
              </div>
              {i < arr.length - 1 && <Hairline />}
            </React.Fragment>
          );
        })}
      </div>

      <Hairline />

      {/* Sources */}
      <div style={{ padding: '24px 24px 40px' }}>
        <Eye style={{ marginBottom: 14 }}>Sources verified · tier-A</Eye>
        {[
          { c: 'Oakland Planning Code §17.103 (ADU)', d: 'verified May 20' },
          { c: 'CA Gov Code §65852.2', d: 'verified May 20' },
          { c: 'Alameda County Fire Code §503', d: 'verified May 19' },
        ].map((s, i, arr) => (
          <React.Fragment key={s.c}>
            <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Body size={13.5}>{s.c}</Body>
              <Mono size={11} color={t.inkFaint}>{s.d}</Mono>
            </div>
            {i < arr.length - 1 && <Hairline />}
          </React.Fragment>
        ))}
        <div style={{ marginTop: 22, padding: '14px 16px', background: t.bgSubtle, borderRadius: 4 }}>
          <Body size={12.5} italic color={t.inkSoft}>
            <Mono size={11.5} weight={700} color={t.ink}>Always verify with Oakland Planning</Mono> before construction. Conditions change; we re-pull rules on every project open.
          </Body>
        </div>
      </div>
    </Page>
  );
}

// ── BUILD ─────────────────────────────────────────────────────────────────
function BuildScreen() {
  const { t, accent } = useT();
  return (
    <Page>
      <DetailHeader kicker="Build · live bids"
        title="Three landed"
        italic="four watching."
        right={<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1583F', animation: 'bp 1.6s ease-out infinite' }} />
          <Mono size={10.5} color="#D1583F" weight={800}>LIVE</Mono>
          <style>{`@keyframes bp { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
        </div>} />

      {/* Range strip */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ position: 'relative', height: 72 }}>
          <svg viewBox="0 0 320 60" width="100%" height="60" style={{ display: 'block', position: 'absolute', top: 6, left: 0 }}>
            <line x1="0" y1="40" x2="320" y2="40" stroke={t.line} strokeWidth="1" />
            {/* low – median – high markers */}
            {[
              { x: 0, l: 'low', v: '$278k' },
              { x: 140, l: 'median', v: '$306k' },
              { x: 320, l: 'high', v: '$346k' },
            ].map((mk, i) => (
              <g key={i}>
                <line x1={mk.x} y1={32} x2={mk.x} y2={48} stroke={t.ink} strokeWidth="1" />
                <text x={mk.x === 320 ? mk.x : mk.x + 4} y="26" fontFamily={YM_FONT.mono} fontSize="9" fontWeight="700" fill={t.inkFaint}
                  textAnchor={mk.x === 320 ? 'end' : 'start'}>
                  {mk.l.toUpperCase()}
                </text>
                <text x={mk.x === 320 ? mk.x : mk.x + 4} y="58" fontFamily={YM_FONT.serif} fontSize="14" fontWeight="600" fill={t.ink}
                  textAnchor={mk.x === 320 ? 'end' : 'start'}>{mk.v}</text>
              </g>
            ))}
            {/* current bids cluster */}
            {[20, 100, 240].map((x, i) => (
              <circle key={i} cx={x} cy="40" r="4" fill={accent.c} stroke={t.bg} strokeWidth="1" />
            ))}
          </svg>
        </div>
      </div>

      <Hairline />

      {/* Bids — each minimal row */}
      <div style={{ padding: '8px 24px 0' }}>
        {[
          { i: 'GS', n: 'Golden State Modular', l: 'CSLB B · 1024917', a: 'LA · SD · Bay Area',
            bid: '$278,200', eta: '22 wk', rib: 'lowest', mt: 'just now', fresh: true },
          { i: 'AP', n: 'Apex ADU Builders', l: 'CSLB B · 894125', a: 'LA core',
            bid: '$316,500', eta: '28 wk', rib: 'best fit · 96', mt: '4 min' },
          { i: 'EC', n: 'EcoStudio Construction', l: 'CSLB B · 716304', a: 'NE LA + Pasadena',
            bid: '$346,800', eta: '34 wk', rib: 'premium finish', mt: '11 min' },
        ].map((b, i, arr) => (
          <React.Fragment key={b.n}>
            <div style={{ padding: '22px 0', position: 'relative' }}>
              {b.fresh && <div style={{
                position: 'absolute', left: -10, top: 30, width: 2, height: 20, background: accent.c, borderRadius: 1,
              }} />}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <Mono size={10.5} color={t.inkFaint} style={{ width: 16, paddingTop: 6 }}>{String(i+1).padStart(2,'0')}</Mono>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 20, color: t.ink, letterSpacing: -0.3 }}>{b.n}</span>
                    <Mono size={10} color={accent.c} weight={700}>{b.rib.toUpperCase()}</Mono>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 10 }}>
                    <Mono size={10.5} color={t.inkSoft}>{b.l}</Mono>
                    <Mono size={10.5} color={t.inkSoft}>·</Mono>
                    <Mono size={10.5} color={t.inkSoft}>{b.a}</Mono>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: YM_FONT.serif, fontWeight: 600, fontSize: 28, color: t.ink, letterSpacing: -0.5 }}>{b.bid}</span>
                    <div style={{ textAlign: 'right' }}>
                      <Mono size={10} color={t.inkFaint}>ETA</Mono>
                      <div><Mono size={14} weight={700} color={t.ink}>{b.eta}</Mono></div>
                    </div>
                    <div>
                      <Mono size={10} color={t.inkFaint} style={{ textAlign: 'right', display: 'block' }}>landed</Mono>
                      <Mono size={11.5} weight={700} color={t.ink}>{b.mt}</Mono>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {i < arr.length - 1 && <Hairline />}
          </React.Fragment>
        ))}
      </div>

      <Hairline />

      {/* Action */}
      <div style={{ padding: '24px 24px 40px' }}>
        <div style={{ marginBottom: 16 }}>
          <Body size={13.5} color={t.inkSoft}>
            <Mono weight={700} color={t.ink}>Three selected.</Mono> Packets share scope only — your address stays private until you choose a builder.
          </Body>
        </div>
        <QuietCTA tone="ink">Send packets to three builders →</QuietCTA>
      </div>
    </Page>
  );
}

Object.assign(window, { EstimateScreen, StudioScreen, PermitScreen, BuildScreen });
