// Concept 2 — YardUp Lens
// Camera-first AR onboarding: point at your yard, tap the corners, watch the ADU
// materialize. Cost ticker live in the top HUD.

// Painted backyard scene — fence + grass + back of house, low-detail.
function YardScene() {
  return (
    <svg viewBox="0 0 360 700" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C9D9D7" />
          <stop offset="0.7" stopColor="#E6E5D3" />
          <stop offset="1" stopColor="#D6D4B6" />
        </linearGradient>
        <linearGradient id="grass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4F6C40" />
          <stop offset="1" stopColor="#2F4A26" />
        </linearGradient>
        <linearGradient id="fence" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#A07A4E" />
          <stop offset="1" stopColor="#6E4C28" />
        </linearGradient>
        <linearGradient id="house" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E2D9C6" />
          <stop offset="1" stopColor="#B8AC91" />
        </linearGradient>
      </defs>
      {/* sky */}
      <rect width="360" height="380" fill="url(#sky)" />
      {/* distant tree silhouette */}
      <circle cx="40" cy="300" r="40" fill="#395431" opacity="0.9" />
      <circle cx="76" cy="280" r="36" fill="#456b40" opacity="0.85" />
      <circle cx="320" cy="290" r="44" fill="#3d5e36" opacity="0.9" />
      {/* back of main house at left */}
      <rect x="-10" y="180" width="160" height="220" fill="url(#house)" />
      <polygon points="-10,180 150,180 80,130" fill="#8A6D44" />
      <rect x="16" y="210" width="26" height="34" fill="#3F5A6B" stroke="#2A3D4A" strokeWidth="1" />
      <rect x="58" y="210" width="26" height="34" fill="#3F5A6B" stroke="#2A3D4A" strokeWidth="1" />
      <rect x="100" y="210" width="26" height="34" fill="#3F5A6B" stroke="#2A3D4A" strokeWidth="1" />
      {/* fence back */}
      <rect x="150" y="320" width="220" height="80" fill="url(#fence)" />
      {/* fence vertical slats */}
      {Array.from({length: 22}).map((_, i) => (
        <line key={i} x1={150 + i*10} x2={150 + i*10} y1="320" y2="400" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
      ))}
      {/* fence top horizontal */}
      <rect x="150" y="318" width="220" height="3" fill="#3F2A14" />
      {/* grass */}
      <rect y="380" width="360" height="320" fill="url(#grass)" />
      {/* path */}
      <polygon points="60,400 120,400 200,700 -10,700" fill="#A8956A" opacity="0.55" />
      {/* shrubs */}
      <ellipse cx="320" cy="430" rx="46" ry="22" fill="#365b2c" />
      <ellipse cx="270" cy="420" rx="32" ry="16" fill="#2b4a23" />
      {/* grass texture */}
      {Array.from({length: 60}).map((_, i) => {
        const x = (i * 37) % 360;
        const y = 400 + ((i * 53) % 280);
        return <line key={i} x1={x} x2={x+2} y1={y} y2={y-5} stroke="rgba(80,110,60,0.4)" strokeWidth="0.6" />;
      })}
    </svg>
  );
}

// 3D-ish wireframe ADU in iso projection, dropped at a yard "pin spot"
function WireframeADU({ x, y, w = 170, d = 100, h = 70, ghost = false }) {
  // Build iso edges. Origin at top-left of footprint front face.
  const o = ghost ? 0.5 : 1;
  const stroke = YU.cash;
  const fill = ghost ? 'rgba(207,248,109,0.10)' : 'rgba(207,248,109,0.22)';
  // 2:1 iso ratio
  return (
    <svg width="320" height="220" viewBox="0 0 320 220" style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', opacity: o, filter: 'drop-shadow(0 12px 30px rgba(207,248,109,0.25))' }}>
      <g>
        {/* footprint (ground rect) */}
        <polygon points="40,170 200,170 280,120 120,120" fill={fill} stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
        {/* front face */}
        <polygon points="40,170 200,170 200,90 40,90" fill="rgba(207,248,109,0.10)" stroke={stroke} strokeWidth="1.5" />
        {/* side face */}
        <polygon points="200,170 280,120 280,40 200,90" fill="rgba(207,248,109,0.06)" stroke={stroke} strokeWidth="1.5" />
        {/* roof */}
        <polygon points="40,90 200,90 280,40 120,40" fill="rgba(207,248,109,0.12)" stroke={stroke} strokeWidth="1.5" />
        {/* door */}
        <rect x="80" y="120" width="22" height="50" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2" />
        {/* window */}
        <rect x="130" y="115" width="40" height="28" fill="none" stroke={stroke} strokeWidth="1.2" />
        {/* corner pins */}
        {[
          [40,170],[200,170],[280,120],[120,120],
        ].map(([cx,cy],i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5" fill="#0E2C20" stroke={stroke} strokeWidth="2" />
            <circle cx={cx} cy={cy} r="11" fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.5" />
          </g>
        ))}
        {/* dim line */}
        <line x1="40" y1="180" x2="200" y2="180" stroke={stroke} strokeWidth="1" strokeDasharray="2 3" />
        <text x="115" y="194" fill={stroke} fontFamily={YU_FONT.mono} fontSize="9" fontWeight="700" textAnchor="middle">28 ft</text>
        <line x1="208" y1="170" x2="288" y2="120" stroke={stroke} strokeWidth="1" strokeDasharray="2 3" />
        <text x="262" y="155" fill={stroke} fontFamily={YU_FONT.mono} fontSize="9" fontWeight="700">12 ft</text>
      </g>
    </svg>
  );
}

function LensCaptureScreen() {
  return (
    <YUScreen bg="#000" padTop={0} padBottom={0}>
      {/* Camera viewport */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <YardScene />
      </div>

      {/* AR wireframe overlay */}
      <WireframeADU x={20} y={300} />

      {/* Camera vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)', pointerEvents: 'none' }} />

      {/* Corner reticle marks (viewfinder) */}
      {[[14,68],[330,68],[14,602],[330,602]].map(([x,y],i)=>(
        <div key={i} style={{
          position: 'absolute', left: x, top: y, width: 16, height: 16,
          borderTop: i < 2 ? '2px solid rgba(255,255,255,0.7)' : 'none',
          borderBottom: i >= 2 ? '2px solid rgba(255,255,255,0.7)' : 'none',
          borderLeft: i % 2 === 0 ? '2px solid rgba(255,255,255,0.7)' : 'none',
          borderRight: i % 2 === 1 ? '2px solid rgba(255,255,255,0.7)' : 'none',
        }} />
      ))}

      {/* Top HUD — cost ticker (glass) */}
      <div style={{
        position: 'absolute', top: 56, left: 14, right: 14,
        background: 'rgba(14,28,22,0.62)', color: '#EDF3EE',
        borderRadius: 18, padding: '12px 14px',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(207,248,109,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <YardUpMark size={18} color={YU.cash} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow tone="light">Live estimate · ADU placing</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 24, color: YU.cash, lineHeight: 1 }}>$326,400</span>
            <span style={{ fontFamily: YU_FONT.sans, fontWeight: 600, fontSize: 11, color: 'rgba(237,243,238,0.7)' }}>·</span>
            <Mono size={11.5} color="#EDF3EE" weight={500}>380 sqft</Mono>
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: YU.cash, boxShadow: `0 0 12px ${YU.cash}` }} />
      </div>

      {/* Side rail — progress */}
      <div style={{
        position: 'absolute', right: 14, top: 150,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {[
          { n: 1, label: 'corner', done: true },
          { n: 2, label: 'corner', done: true },
          { n: 3, label: 'corner', done: true },
          { n: 4, label: 'corner', done: true },
          { n: 5, label: 'fit', done: false },
        ].map(s => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(14,28,22,0.55)', color: '#EDF3EE',
            borderRadius: 9999, padding: '5px 10px 5px 5px',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: s.done ? YU.cash : 'rgba(255,255,255,0.18)',
              color: s.done ? YU.ink2 : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 11,
            }}>{s.done ? '✓' : s.n}</div>
            <Mono size={10.5} color="#EDF3EE" weight={600}>{s.label}</Mono>
          </div>
        ))}
      </div>

      {/* Bottom action sheet */}
      <div style={{
        position: 'absolute', bottom: 30, left: 14, right: 14,
        background: 'rgba(14,28,22,0.78)', color: '#EDF3EE',
        backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24, padding: 14, paddingBottom: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Eyebrow tone="light">Garden Studio fits your buildable zone</Eyebrow>
          <Mono size={10} color="rgba(207,248,109,0.85)" weight={700}>fit · 94</Mono>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { l: 'rent', v: '$2,450/mo', cash: true },
            { l: 'payback', v: '6.4 yr' },
            { l: 'permit', v: 'low risk', amber: false },
          ].map((m, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 10px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Eyebrow tone="light">{m.l}</Eyebrow>
              <div style={{ marginTop: 2 }}>
                <Mono size={13} color={m.cash ? YU.cash : '#EDF3EE'} weight={700}>{m.v}</Mono>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.10)', color: '#EDF3EE',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 13,
          }}>
            ↻ rescan yard
          </div>
          <div style={{
            flex: 1.6, padding: '12px 14px', borderRadius: 14,
            background: YU.cash, color: YU.highlighterInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 13,
          }}>
            Lock placement →
          </div>
        </div>
      </div>
    </YUScreen>
  );
}

// Screen 2 — render-result version. Same backyard but ADU is rendered in
// realistic-ish form, with a "concept generated" card.
function LensResultScreen() {
  return (
    <YUScreen bg="#000" padTop={0} padBottom={0}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <YardScene />
      </div>
      {/* Realistic ADU rendered */}
      <svg width="320" height="220" style={{ position: 'absolute', left: 20, top: 290, filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.45))' }} viewBox="0 0 320 220">
        {/* ground patch */}
        <ellipse cx="160" cy="200" rx="160" ry="20" fill="rgba(0,0,0,0.35)" />
        {/* footprint */}
        <polygon points="40,170 200,170 280,120 120,120" fill="#3a3326" />
        {/* front face */}
        <polygon points="40,170 200,170 200,90 40,90" fill="#E2D9C6" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
        {/* side face */}
        <polygon points="200,170 280,120 280,40 200,90" fill="#B8AC91" />
        {/* roof */}
        <polygon points="40,90 200,90 280,40 120,40" fill="#1a2620" />
        <polygon points="40,90 200,90 280,40 120,40" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
        {/* door */}
        <rect x="80" y="120" width="22" height="50" fill="#3F2A14" />
        <rect x="100" y="142" width="2" height="2" fill="#A07A4E" />
        {/* window */}
        <rect x="130" y="115" width="40" height="28" fill="#7E9DB0" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
        <line x1="150" y1="115" x2="150" y2="143" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5" />
        {/* side window */}
        <polygon points="220,100 250,80 250,130 220,150" fill="#7E9DB0" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
        {/* fascia */}
        <line x1="40" y1="90" x2="200" y2="90" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
        <line x1="200" y1="90" x2="280" y2="40" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      </svg>

      {/* "Generated" chip */}
      <div style={{ position: 'absolute', top: 62, left: 14 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px 6px 8px', borderRadius: 9999,
          background: 'rgba(14,28,22,0.65)', color: '#EDF3EE',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
          <Dot color={YU.cash} size={6} />
          <Mono size={10} color={YU.cash} weight={700}>concept · v3</Mono>
          <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.18)', margin: '0 4px' }} />
          <Mono size={10} color="rgba(237,243,238,0.8)" weight={500}>warm modern</Mono>
        </div>
      </div>

      {/* Bottom — verdict */}
      <div style={{
        position: 'absolute', bottom: 30, left: 14, right: 14,
        background: '#F6F4EE', borderRadius: 22, padding: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Eyebrow>Generated for 4218 Magnolia</Eyebrow>
            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <span style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 24, color: YU.ink, lineHeight: 1.05 }}>
                Garden Studio, <span style={{ fontStyle: 'italic', color: YU.revenue }}>placed.</span>
              </span>
            </div>
            <Body size={12} color={YU.muted}>Setback margin clears 4 ft. Buildable zone fully covers footprint.</Body>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: YU.forestDeep,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: YU.cash,
          }}>
            <span style={{ fontFamily: YU_FONT.serif, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>94</span>
            <Mono size={8} color="rgba(207,248,109,0.7)" weight={700}>fit</Mono>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: YU.canvas, border: `1px solid ${YU.border}`, textAlign: 'center', fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 13, color: YU.ink }}>save look</div>
          <div style={{ flex: 1.4, padding: '12px 0', borderRadius: 12, background: YU.ink, color: '#EDF3EE', textAlign: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 13 }}>
            see the money →
          </div>
        </div>
      </div>
    </YUScreen>
  );
}

Object.assign(window, { LensCaptureScreen, LensResultScreen });
