// Concept 6 — YardUp Council
// "Decide together." Multiplayer family-planning surface — spouse, parents,
// lender, builder all in one. Live cursors on a floor plan, vote tally, comments.

function CouncilAvatar({ initials, color, online, role, size = 32 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: size * 0.4,
        border: '2px solid #fff',
        boxShadow: YU_SHADOW.crisp,
      }}>{initials}</div>
      {online && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.32, height: size * 0.32,
          borderRadius: '50%', background: YU.revenue,
          border: '2px solid #fff',
        }} />
      )}
    </div>
  );
}

function LiveCursor({ x, y, color, name }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 5 }}>
      <svg width="20" height="22" viewBox="0 0 20 22"><path d="M2 1 L18 12 L11 13 L8 20 Z" fill={color} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      <div style={{
        position: 'absolute', left: 16, top: 18,
        padding: '3px 8px', borderRadius: 9999,
        background: color, color: '#fff',
        fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10, letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}>{name}</div>
    </div>
  );
}

function FloorPlan() {
  // Top-down floor plan of a Garden Studio (28x12) with rooms.
  // Annotated with "sticky" debates.
  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: YU.canvas, border: `1px solid ${YU.border}` }}>
      <svg viewBox="0 0 320 220" width="100%" style={{ display: 'block', background: YU.paper2 }}>
        {/* outer wall */}
        <rect x="20" y="20" width="280" height="180" fill="#fff" stroke={YU.ink} strokeWidth="2.5" />
        {/* interior walls */}
        <line x1="180" y1="20" x2="180" y2="120" stroke={YU.ink} strokeWidth="1.5" />
        <line x1="180" y1="120" x2="300" y2="120" stroke={YU.ink} strokeWidth="1.5" />
        {/* bath wall */}
        <line x1="230" y1="120" x2="230" y2="200" stroke={YU.ink} strokeWidth="1.5" />
        {/* door swing — front */}
        <path d="M 60 20 A 24 24 0 0 1 84 44" fill="none" stroke={YU.muted} strokeWidth="1" strokeDasharray="2 2" />
        <line x1="60" y1="20" x2="84" y2="20" stroke="#fff" strokeWidth="3" />
        {/* window glyphs */}
        <line x1="120" y1="20" x2="160" y2="20" stroke={YU.builder} strokeWidth="3" />
        <line x1="220" y1="200" x2="260" y2="200" stroke={YU.builder} strokeWidth="3" />
        <line x1="20" y1="60" x2="20" y2="100" stroke={YU.builder} strokeWidth="3" />

        {/* labels */}
        <text x="100" y="105" fontFamily={YU_FONT.sans} fontWeight="800" fontSize="11" fill={YU.muted}>LIVING + KITCHEN</text>
        <text x="220" y="70" fontFamily={YU_FONT.sans} fontWeight="800" fontSize="11" fill={YU.muted}>BED 1</text>
        <text x="200" y="165" fontFamily={YU_FONT.sans} fontWeight="800" fontSize="11" fill={YU.muted}>BED 2?</text>
        <text x="260" y="165" fontFamily={YU_FONT.sans} fontWeight="800" fontSize="10" fill={YU.muted}>BATH</text>

        {/* furniture */}
        <rect x="35" y="40" width="38" height="22" rx="3" fill={YU.mint} stroke={YU.revenue} strokeWidth="0.8" />
        <rect x="40" y="70" width="28" height="14" rx="2" fill={YU.paper2} stroke={YU.muted} strokeWidth="0.5" />
        <rect x="200" y="36" width="56" height="32" rx="3" fill={YU.paper2} stroke={YU.muted} strokeWidth="0.5" />
        <rect x="248" y="130" width="44" height="60" rx="3" fill="#FFFFFF" stroke={YU.permit} strokeWidth="1" strokeDasharray="3 2" />
      </svg>

      {/* Sticky comment pin */}
      <div style={{
        position: 'absolute', left: 184, top: 130,
        padding: '6px 10px 7px', borderRadius: 12, borderTopLeftRadius: 0,
        background: YU.permit, color: '#fff', maxWidth: 130,
        boxShadow: YU_SHADOW.crisp,
        fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 11, lineHeight: 1.25,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: 0.85, fontSize: 9.5 }}>
          <CouncilAvatar initials="LR" color={YU.permit} size={12} /> Dad · 2m
        </div>
        Need this for caregiver overnight stays.
      </div>

      {/* Vote ribbon */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        padding: '4px 8px', borderRadius: 9999,
        background: YU.builderSoft, color: YU.builder,
        fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 9.5, letterSpacing: 0.4,
        textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Dot color={YU.builder} size={6} /> open vote
      </div>

      {/* Live cursors */}
      <LiveCursor x={62} y={62} color={YU.builder} name="Sarah" />
      <LiveCursor x={232} y={48} color={YU.revenue} name="You" />
    </div>
  );
}

function VoteRow({ option, votes, count, total, accent, leading }) {
  const pct = (count / total) * 100;
  return (
    <div style={{ position: 'relative', padding: '10px 12px', borderRadius: 12, background: YU.paper2, border: leading ? `2px solid ${accent}` : `1px solid ${YU.border}` }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: `linear-gradient(90deg, ${accent}22 ${pct}%, transparent ${pct}%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Body size={13} weight={800} style={{ flex: 1 }}>{option}</Body>
        <div style={{ display: 'flex', gap: -6 }}>
          {votes.map((v, i) => (
            <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <CouncilAvatar initials={v.i} color={v.c} size={22} online={false} />
            </div>
          ))}
        </div>
        <Mono size={13} weight={800}>{count}/{total}</Mono>
      </div>
    </div>
  );
}

function CommentRow({ avatar, name, time, text, action, tone }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <CouncilAvatar initials={avatar.i} color={avatar.c} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <Body size={12} weight={800}>{name}</Body>
          <Mono size={9.5} color={YU.muted}>{time}</Mono>
          {action && (
            <Pill bg={tone === 'revenue' ? YU.mintSoft : tone === 'builder' ? YU.builderSoft : YU.permitSoft}
                  fg={tone === 'revenue' ? YU.revenueDeep : tone === 'builder' ? YU.builder : YU.permit}
                  border={`1px solid ${tone === 'revenue' ? YU.mintSoft : tone === 'builder' ? YU.builderSoft : YU.permitSoft}`}
                  style={{ padding: '1px 7px', fontSize: 9.5 }}>
              {action}
            </Pill>
          )}
        </div>
        <Body size={12} style={{ display: 'block', marginTop: 2 }} color={YU.ink}>{text}</Body>
      </div>
    </div>
  );
}

function CouncilScreen() {
  const me   = { i: 'AT', c: YU.revenue };
  const sara = { i: 'SK', c: YU.builder };
  const dad  = { i: 'LR', c: YU.permit };
  const lend = { i: 'NW', c: YU.forestDeep };

  return (
    <YUScreen bg={YU.paper}>
      {/* Header — project + roster */}
      <div style={{ position: 'absolute', top: 6, left: 14, right: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9999, background: YU.canvas, border: `1px solid ${YU.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 18 }}>←</div>
            <div>
              <Mono size={9.5} color={YU.muted}>magnolia studio · council</Mono>
              <div style={{ fontFamily: YU_FONT.sans, fontWeight: 800, fontSize: 14 }}>Family room</div>
            </div>
          </div>
          <Pill bg={YU.canvas} fg={YU.revenueDeep} border={`1px solid ${YU.revenue}`}>
            <Dot color={YU.revenue} size={6} /> 3 here
          </Pill>
        </div>
        {/* Roster strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: YU.canvas, border: `1px solid ${YU.border}`, borderRadius: 14, padding: 8 }}>
          <div style={{ display: 'flex' }}>
            {[me, sara, dad, lend].map((p, i) => (
              <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <CouncilAvatar initials={p.i} color={p.c} size={28} online={i < 3} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Body size={11.5} weight={800}>You · Sarah · Dad <span style={{ color: YU.muted, fontWeight: 500 }}>+ Nora (lender)</span></Body>
            <Mono size={9.5} color={YU.muted} style={{ display: 'block', marginTop: 1 }}>Sarah viewing floor plan</Mono>
          </div>
          <div style={{
            padding: '5px 10px', borderRadius: 9999, background: YU.ink, color: '#EDF3EE',
            fontFamily: YU_FONT.sans, fontWeight: 700, fontSize: 10,
          }}>invite →</div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 132, left: 14, right: 14, bottom: 56, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Open decision card */}
        <div style={{ background: YU.canvas, border: `1px solid ${YU.border}`, borderRadius: 16, padding: 14, boxShadow: YU_SHADOW.soft }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Eyebrow accent={YU.builder}>Open decision · #4 of 6</Eyebrow>
            <Mono size={9.5} color={YU.muted}>closes Fri 6pm</Mono>
          </div>
          <div style={{ fontFamily: YU_FONT.serif, fontWeight: 600, fontSize: 22, color: YU.ink, lineHeight: 1.1, marginTop: 6, marginBottom: 12, letterSpacing: -0.3 }}>
            One bedroom, or <span style={{ color: YU.revenue, fontStyle: 'italic' }}>squeeze a second</span>?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <VoteRow option="1BR · $2,450/mo · 6.4yr payback"
              votes={[me, lend]} count={2} total={4}
              accent={YU.revenue} />
            <VoteRow option="2BR · $2,890/mo · adds ~$28k"
              votes={[sara, dad]} count={2} total={4}
              accent={YU.builder} leading />
          </div>
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: YU.mintSoft, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mono size={11} color={YU.revenueDeep} weight={700}>+$5,280/yr</Mono>
            <Body size={11} color={YU.muted}>more rent on 2BR, but +6 wk build, +1 ft setback risk</Body>
          </div>
        </div>

        {/* Floorplan with live cursors */}
        <FloorPlan />

        {/* Activity feed */}
        <div style={{ flex: 1, minHeight: 0, background: YU.canvas, border: `1px solid ${YU.border}`, borderRadius: 14, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Eyebrow>Recent activity</Eyebrow>
          <CommentRow avatar={dad} name="Dad" time="2m"
            text="Need the 2nd bedroom for caregiver stays."
            action="voted 2BR" tone="builder" />
          <CommentRow avatar={sara} name="Sarah" time="4m"
            text="If Apex's bid clears under $320k I'm fine with 2BR."
            action="voted 2BR" tone="builder" />
          <CommentRow avatar={lend} name="Nora · lender" time="14m"
            text="HELOC dry-run: 1BR is the safer payback profile at current rate."
            action="voted 1BR" tone="revenue" />
        </div>
      </div>

      <YUTabBar active={4} tabs={['Money','Studio','Build','Permit','Council']} />
    </YUScreen>
  );
}

Object.assign(window, { CouncilScreen });
