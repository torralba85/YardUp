// Concept 1 — YardUp Income
// "Open the app, see what every backyard around you is worth."
// Hero: a stylized 3/4-iso neighborhood with floating $/mo tags above each house.
// Screen 1: the map. Screen 2: tapped a house — property detail with payback.

// Hand-drawn iso house. roof + body + door, with a small backyard footprint we
// can tag.
function IsoHouse({ x, y, scale = 1, color = '#E8E2D2', roof = '#9C6B3E', flag, you, dim, onClick }) {
  const s = scale;
  const w = 70 * s, h = 90 * s;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: dim ? 0.35 : 1, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <svg viewBox="0 0 70 90" width={w} height={h} style={{ display: 'block' }}>
        {/* backyard ground patch behind */}
        <polygon points="2,72 18,84 60,68 44,56" fill={you ? 'rgba(31,157,99,0.22)' : 'rgba(31,157,99,0.10)'} stroke="rgba(31,157,99,0.4)" strokeWidth={you ? 1.4 : 0.6} strokeDasharray={you ? '0' : '2 3'} />
        {/* body */}
        <polygon points="10,40 36,28 60,40 60,68 34,80 10,68" fill={color} stroke="rgba(21,35,28,0.35)" strokeWidth="0.8" />
        {/* roof */}
        <polygon points="10,40 36,28 60,40 36,52" fill={roof} stroke="rgba(21,35,28,0.4)" strokeWidth="0.8" />
        {/* door */}
        <polygon points="28,60 36,56 36,72 28,75" fill="#3a2e22" />
        {/* window */}
        <polygon points="44,50 52,46 52,56 44,60" fill="#cfe5f1" stroke="rgba(21,35,28,0.3)" strokeWidth="0.5" />
        {you && (
          <polygon points="10,40 36,28 60,40 36,52" fill="none" stroke="#1F9D63" strokeWidth="1.5" />
        )}
      </svg>
      {flag && (
        <div style={{
          position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {flag}
        </div>
      )}
    </div>
  );
}

function IncomePill({ amount, you, blocked }) {
  if (blocked) {
    return (
      <div style={{
        padding: '3px 8px', borderRadius: 9999,
        background: 'rgba(255,255,255,0.92)', border: `1px dashed ${YU.borderStrong}`,
        fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 9.5, color: YU.muted,
        boxShadow: '0 4px 10px rgba(14,44,32,0.12)',
      }}>
        no setback
      </div>
    );
  }
  if (you) {
    return (
      <div style={{
        padding: '6px 12px 7px', borderRadius: 9999,
        background: YU.forestDeep, color: YU.cash,
        boxShadow: '0 10px 24px rgba(14,44,32,0.35)',
        display: 'flex', alignItems: 'center', gap: 6,
        border: `1.5px solid ${YU.cash}`,
      }}>
        <Dot color={YU.cash} size={6} />
        <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 18, lineHeight: 1, letterSpacing: -0.2 }}>$2,450</span>
        <span style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 9.5, color: '#EDF3EE', opacity: 0.7 }}>/mo</span>
      </div>
    );
  }
  return (
    <div style={{
      padding: '3px 9px 4px', borderRadius: 9999,
      background: 'rgba(255,255,255,0.96)',
      border: `1px solid ${YU.border}`,
      boxShadow: '0 6px 14px rgba(14,44,32,0.14)',
      fontFamily: YU_FONT.mono, fontWeight: 600, fontSize: 11, color: YU.ink,
      fontVariantNumeric: 'tabular-nums',
    }}>
      ${amount}
    </div>
  );
}

function IncomeMapScreen() {
  return (
    <YUScreen bg={YU.paper}>
      {/* topo background */}
      <svg viewBox="0 0 360 700" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
        <defs>
          <linearGradient id="topo" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#F6F4EE" />
            <stop offset="1" stopColor="#EDEBE2" />
          </linearGradient>
        </defs>
        <rect width="360" height="700" fill="url(#topo)" />
        {/* contour lines */}
        {[0,1,2,3,4,5,6].map(i => (
          <path key={i} d={`M -20 ${80 + i*70} Q 100 ${50 + i*70 + (i%2?20:-20)} 200 ${90 + i*70} T 380 ${100 + i*70}`}
            stroke="rgba(20,61,43,0.08)" strokeWidth="1" fill="none" />
        ))}
        {/* street curve */}
        <path d="M -10 470 Q 120 430 200 470 T 380 460" stroke="#D5D2C5" strokeWidth="28" fill="none" />
        <path d="M -10 470 Q 120 430 200 470 T 380 460" stroke="#F6F4EE" strokeWidth="1.5" fill="none" strokeDasharray="6 8" />
      </svg>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 8, left: 16, right: 16, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <YardUpWordmark size={17} />
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.forestDeep, color: YU.cash, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 12 }}>SK</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.94)', border: `1px solid ${YU.border}`, borderRadius: 14,
          padding: '12px 14px', boxShadow: YU_SHADOW.soft,
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: YU.mintSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={YU.revenue} strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 13, color: YU.ink, lineHeight: 1.2 }}>4218 Magnolia Ave</div>
            <div style={{ fontFamily: YU_FONT.mono, fontWeight: 500, fontSize: 10.5, color: YU.muted, marginTop: 2 }}>Oakland · 6,200 sqft lot</div>
          </div>
          <Pill bg={YU.mint} fg={YU.revenueDeep} border={`1px solid ${YU.mint}`}>
            <Dot color={YU.revenue} size={6} /> live
          </Pill>
        </div>
      </div>

      {/* Block view */}
      <div style={{ position: 'absolute', top: 110, left: 0, right: 0, height: 440 }}>
        <IsoHouse x={28} y={50} scale={0.85} color="#E0D6BE" roof="#7A4F2C"
          flag={<IncomePill amount="1,820" />} />
        <IsoHouse x={138} y={28} scale={1.0} color="#E8DDC3" roof="#8E5E36"
          flag={<IncomePill amount="2,140" />} />
        <IsoHouse x={250} y={62} scale={0.9} color="#D7CCB3" roof="#9C6B3E"
          flag={<IncomePill blocked />} dim />

        <IsoHouse x={18} y={170} scale={0.95} color="#E4D9BE" roof="#6E4422"
          flag={<IncomePill amount="1,540" />} />
        {/* hero — your house */}
        <IsoHouse x={130} y={148} scale={1.25} color="#FFFFFF" roof="#143D2B"
          you flag={<IncomePill you />} />
        <IsoHouse x={272} y={184} scale={0.85} color="#E8E2D2" roof="#9C6B3E"
          flag={<IncomePill amount="1,990" />} />

        <IsoHouse x={36} y={302} scale={0.9} color="#DCD0B6" roof="#7A4F2C"
          flag={<IncomePill amount="2,310" />} />
        <IsoHouse x={156} y={322} scale={0.85} color="#E8DDC3" roof="#8E5E36"
          flag={<IncomePill amount="1,720" />} />
        <IsoHouse x={260} y={310} scale={0.95} color="#D7CCB3" roof="#9C6B3E"
          flag={<IncomePill amount="2,060" />} />
      </div>

      {/* Bottom sheet — block summary */}
      <div style={{
        position: 'absolute', bottom: 64, left: 12, right: 12,
        background: YU.canvas, borderRadius: 22, border: `1px solid ${YU.border}`,
        boxShadow: YU_SHADOW.deep, padding: 16, paddingTop: 14,
      }}>
        <div style={{ width: 32, height: 4, borderRadius: 99, background: YU.border, margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <Eyebrow>Your block · 12 viable backyards</Eyebrow>
          <Mono size={10.5} color={YU.muted}>tap a house</Mono>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Money value="$2,450" unit="/mo" size={40} weight={600} />
          <Body size={12} color={YU.muted} weight={500}>median for your lot</Body>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.paper2, border: `1px solid ${YU.border}` }}>
            <Eyebrow>Net annual</Eyebrow>
            <div style={{ marginTop: 4 }}><Mono size={15} weight={700}>$22,140</Mono></div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.paper2, border: `1px solid ${YU.border}` }}>
            <Eyebrow>Payback</Eyebrow>
            <div style={{ marginTop: 4 }}><Mono size={15} weight={700}>6.4 yr</Mono></div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.forestDeep, border: `1px solid ${YU.forestDeep}` }}>
            <span style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10.5, color: YU.cash, letterSpacing: 0.6, textTransform: 'uppercase' }}>Builders</span>
            <div style={{ marginTop: 4 }}><Mono size={15} weight={700} color={YU.cash}>7 ready</Mono></div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: YU.ink, color: '#EDF3EE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 13 }}>Open the underwriting sheet</span>
          <span style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 16, color: YU.cash }}>→</span>
        </div>
      </div>

      <YUTabBar active={0} />
    </YUScreen>
  );
}

// Screen 2 — tapped a house; comparison detail
function IncomeDetailScreen() {
  return (
    <YUScreen bg={YU.paper}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 6, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 18, color: YU.ink }}>←</div>
          <div>
            <Mono size={9.5} color={YU.muted}>4218 magnolia</Mono>
            <div style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14, color: YU.ink, lineHeight: 1.1 }}>Your backyard</div>
          </div>
        </div>
        <Pill bg={YU.mint} fg={YU.revenueDeep} border={`1px solid ${YU.mint}`}>
          <Dot color={YU.revenue} size={6} /> high-fit
        </Pill>
      </div>

      <div style={{ position: 'absolute', inset: 0, paddingTop: 50, paddingLeft: 14, paddingRight: 14, paddingBottom: 70, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        {/* Hero card */}
        <div style={{ background: 'linear-gradient(160deg, #143D2B 0%, #0E2C20 60%, #0E5F3C 120%)', borderRadius: 22, padding: 18, color: '#EDF3EE', boxShadow: YU_SHADOW.deep, position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(207,248,109,0.25), transparent 70%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Eyebrow tone="light">Income, your lot</Eyebrow>
            <Pill bg="rgba(255,255,255,0.1)" fg="#EDF3EE" border="1px solid rgba(255,255,255,0.18)">Garden Studio · 380 sqft</Pill>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 64, lineHeight: 0.95, color: YU.cash, letterSpacing: -1 }}>$2,450</span>
            <span style={{ fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 16, opacity: 0.8 }}>/mo</span>
          </div>
          <Body size={12} color="rgba(237,243,238,0.78)">comparable rent for studio ADUs within 0.6 mi</Body>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ flex: 1 }}>
              <Eyebrow tone="light">Cost range</Eyebrow>
              <div style={{ marginTop: 2 }}><Mono size={14} color="#EDF3EE" weight={600}>$278k–$334k</Mono></div>
            </div>
            <div style={{ flex: 1 }}>
              <Eyebrow tone="light">Payback</Eyebrow>
              <div style={{ marginTop: 2 }}><Mono size={14} color="#EDF3EE" weight={600}>6.4 yr</Mono></div>
            </div>
            <div style={{ flex: 1 }}>
              <Eyebrow tone="light">ROI yr 10</Eyebrow>
              <div style={{ marginTop: 2 }}><Mono size={14} color={YU.cash} weight={700}>+58%</Mono></div>
            </div>
          </div>
        </div>

        {/* Comparison row — block context */}
        <div style={{ background: YU.canvas, borderRadius: 14, padding: 12, border: `1px solid ${YU.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Eyebrow>How you compare on the block</Eyebrow>
            <Mono size={10} color={YU.muted}>n=12</Mono>
          </div>
          {/* small histogram */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
            {[20, 32, 44, 38, 50, 28, 18].map((h, i) => {
              const me = i === 4;
              return (
                <div key={i} style={{ flex: 1, position: 'relative' }}>
                  <div style={{ height: h, background: me ? YU.revenue : YU.border, borderRadius: 4, position: 'relative' }}>
                    {me && (
                      <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                        <Mono size={9} weight={700} color={YU.revenue}>you</Mono>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}><Mono size={8.5} color={YU.muted}>${1.4 + i*0.18 | 0}k</Mono></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Builder readiness row */}
        <div style={{ background: YU.canvas, borderRadius: 14, padding: 12, border: `1px solid ${YU.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Eyebrow accent={YU.builder}>Builders ready in your zone</Eyebrow>
            <Mono size={10} color={YU.muted}>7 matches</Mono>
          </div>
          <div style={{ display: 'flex', gap: -4 }}>
            {['AP','GS','EC','RK','BG','HS','+1'].map((s, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: '50%',
                background: i === 6 ? YU.builderSoft : ['#9C6B3E','#143D2B','#1F9D63','#566159','#0D5DB8','#C1760D'][i],
                color: i === 6 ? YU.builder : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 10,
                marginLeft: i === 0 ? 0 : -8, border: '2px solid #fff',
              }}>{s}</div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{
              padding: '6px 12px', borderRadius: 9999, background: YU.builder, color: '#fff',
              fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              Request quotes →
            </div>
          </div>
        </div>
      </div>

      <YUTabBar active={0} />
    </YUScreen>
  );
}

Object.assign(window, { IncomeMapScreen, IncomeDetailScreen });
