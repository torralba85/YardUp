// Concept 5 — YardUp Bids Live
// "Builders bid for your project, live." A real-time auction feed inside the app.
// Each bid card has trust signals, ETA, and a ribbon (lowest / fastest / best fit).

function PulseDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 8, height: 8 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: YU.error,
        animation: 'yu-pulse 1.6s ease-out infinite',
      }} />
      <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: YU.error }} />
      <style>{`@keyframes yu-pulse { 0% { transform: scale(0.7); opacity: 0.85; } 100% { transform: scale(2.6); opacity: 0; } }`}</style>
    </span>
  );
}

function BidCard({ initials, name, license, area, bid, eta, ribbon, ribbonTone, time, fresh, packet }) {
  const ribbonMap = {
    cash: { bg: YU.cash, fg: YU.highlighterInk },
    builder: { bg: YU.builderSoft, fg: YU.builder },
    revenue: { bg: YU.mintSoft, fg: YU.revenueDeep },
    permit: { bg: YU.permitSoft, fg: YU.permit },
  };
  const rt = ribbonMap[ribbonTone] || ribbonMap.builder;

  return (
    <div style={{
      position: 'relative',
      background: YU.canvas, border: `1px solid ${YU.border}`, borderRadius: 16,
      padding: 14, boxShadow: fresh ? `0 14px 30px rgba(13,93,184,0.16), 0 0 0 2px ${YU.builderSoft}` : YU_SHADOW.soft,
    }}>
      {ribbon && (
        <div style={{
          position: 'absolute', top: -8, left: 14,
          padding: '4px 10px', borderRadius: 9999,
          background: rt.bg, color: rt.fg,
          fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 10, letterSpacing: 0.3,
          textTransform: 'uppercase',
          border: `1px solid ${YU.canvas}`,
        }}>{ribbon}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: YU.forestDeep, color: YU.cash,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Body size={13.5} weight={800}>{name}</Body>
            <Pill bg={YU.mintSoft} fg={YU.revenueDeep} border={`1px solid ${YU.mintSoft}`} style={{ padding: '2px 7px', fontSize: 9.5 }}>
              <Dot color={YU.revenue} size={5} /> licensed
            </Pill>
          </div>
          <Mono size={10.5} color={YU.muted} style={{ display: 'block', marginTop: 3 }}>{license} · {area}</Mono>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Mono size={9.5} color={YU.muted} weight={600}>{time}</Mono>
        </div>
      </div>

      {/* Bid + ETA row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Bid</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
            <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 28, color: YU.ink, lineHeight: 1, letterSpacing: -0.5 }}>{bid}</span>
            <Mono size={11} color={YU.muted}>turnkey</Mono>
          </div>
        </div>
        <div>
          <Eyebrow accent={YU.builder}>ETA</Eyebrow>
          <Mono size={16} weight={700} style={{ display: 'block', marginTop: 2 }}>{eta}</Mono>
        </div>
        <div style={{
          padding: '9px 14px', borderRadius: 10, background: YU.builder, color: '#fff',
          fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 11.5,
        }}>view packet</div>
      </div>

      {packet && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${YU.border}`, display: 'flex', gap: 6 }}>
          {packet.map(p => (
            <Pill key={p} bg={YU.paper2} fg={YU.muted} border={`1px solid ${YU.border}`} style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 600 }}>
              {p}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function BidsLiveScreen() {
  return (
    <YUScreen bg={YU.paper}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 6, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 18 }}>←</div>
          <div>
            <Mono size={9.5} color={YU.muted}>request · garden studio</Mono>
            <div style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14 }}>Bids landing</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 8px', borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.error}` }}>
          <PulseDot />
          <Mono size={10.5} color={YU.error} weight={800}>LIVE</Mono>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 60, overflow: 'auto', padding: '0 14px' }}>

        {/* Project micro-card + countdown */}
        <div style={{
          marginTop: 4, padding: '12px 14px', borderRadius: 16,
          background: YU.forestDeep, color: '#EDF3EE',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(207,248,109,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <YardUpMark size={22} color={YU.cash} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow tone="light">Window closes in</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
              <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 22, color: YU.cash, lineHeight: 1 }}>14:32:08</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Eyebrow tone="light">Builders</Eyebrow>
            <Mono size={16} color="#EDF3EE" weight={700} style={{ display: 'block', marginTop: 2 }}>7 watching</Mono>
          </div>
        </div>

        {/* Stats strip — range so far */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.canvas, border: `1px solid ${YU.border}` }}>
            <Eyebrow>Range</Eyebrow>
            <Mono size={13} weight={700} style={{ display: 'block', marginTop: 2 }}>$278–$346k</Mono>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.canvas, border: `1px solid ${YU.border}` }}>
            <Eyebrow>Median</Eyebrow>
            <Mono size={13} weight={700} style={{ display: 'block', marginTop: 2 }}>$306k</Mono>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: YU.canvas, border: `1px solid ${YU.border}` }}>
            <Eyebrow>Fastest ETA</Eyebrow>
            <Mono size={13} weight={700} style={{ display: 'block', marginTop: 2 }}>22 wk</Mono>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 12 }}>
          <Eyebrow>Bid feed · newest</Eyebrow>
          <Mono size={10} color={YU.muted}>auto-refreshing</Mono>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <BidCard
            initials="GS" name="Golden State Modular" license="CSLB B · 1024917"
            area="LA · SD · Bay Area" bid="$278,200" eta="22 wk"
            ribbon="lowest"
            ribbonTone="cash" time="32s ago" fresh
            packet={['prefab', 'fixed scope', 'permit support']}
          />
          <BidCard
            initials="AP" name="Apex ADU Builders" license="CSLB B · 894125"
            area="Los Angeles core" bid="$316,500" eta="28 wk"
            ribbon="best fit · 96"
            ribbonTone="revenue" time="2m ago"
            packet={['design-build', 'LADBS', '42 ADUs']}
          />
          <BidCard
            initials="EC" name="EcoStudio Construction" license="CSLB B · 716304"
            area="NE LA & Pasadena" bid="$346,800" eta="34 wk"
            ribbon="premium finish"
            ribbonTone="builder" time="6m ago"
            packet={['solar-ready', 'low-energy', 'custom finish']}
          />
        </div>

        <div style={{ height: 90 }} />
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: 'absolute', bottom: 64, left: 12, right: 12,
        background: YU.canvas, borderRadius: 18, border: `1px solid ${YU.border}`,
        boxShadow: YU_SHADOW.med, padding: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>3 bids selected</Eyebrow>
          <Body size={11} color={YU.muted} style={{ display: 'block', marginTop: 2 }}>packets share scope only · not your address</Body>
        </div>
        <div style={{
          padding: '11px 14px', borderRadius: 12,
          background: YU.builder, color: '#fff',
          fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Lock & request →
        </div>
      </div>
    </YUScreen>
  );
}

Object.assign(window, { BidsLiveScreen });
