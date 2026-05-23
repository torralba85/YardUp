// mobile-app.jsx — runnable mobile-app prototype from the YardUp redesign artboards.
// Keeps the original design canvas untouched and wires the redesign into a focused flow:
// Welcome → AR scan → scan result → single Project Page → full-bleed detail screens.

function MobilePhone({ frame, children }) {
  if (frame === 'android') {
    return <AndroidDevice width={402} height={840}>{children}</AndroidDevice>;
  }
  return <IOSDevice width={402} height={840}>{children}</IOSDevice>;
}

function AppControl({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid rgba(21,35,28,0.12)',
        background: active ? '#15231C' : '#FFFFFF',
        color: active ? '#F6F4EE' : '#15231C',
        borderRadius: 999,
        padding: '9px 13px',
        fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: active ? '0 8px 22px rgba(21,35,28,0.14)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function BottomAction({ children, onClick, tone = 'accent', secondary }) {
  const { t, accent } = useT();
  const bg = secondary ? 'rgba(255,255,255,0.86)' : tone === 'ink' ? t.ink : accent.c;
  const fg = secondary ? t.ink : '#fff';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', border: secondary ? `1px solid ${t.line}` : 'none',
        background: bg, color: fg, borderRadius: 999, padding: '15px 18px',
        fontFamily: YM_FONT.sans, fontSize: 14, fontWeight: 800,
        letterSpacing: -0.1, cursor: 'pointer',
        boxShadow: secondary ? 'none' : '0 12px 30px rgba(21,35,28,0.18)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {children}
    </button>
  );
}

function ActionDock({ children }) {
  return (
    <div style={{
      position: 'absolute', left: 24, right: 24, bottom: 26, zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'auto',
    }}>
      {children}
    </div>
  );
}

function AppScreen({ children, dock }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {children}
      {dock && <ActionDock>{dock}</ActionDock>}
    </div>
  );
}

function DetailNav({ go }) {
  const { t } = useT();
  const items = [
    ['estimate', 'Cost'],
    ['studio', 'Fit'],
    ['permit', 'Permit'],
    ['build', 'Build'],
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      padding: 8, borderRadius: 999, background: 'rgba(255,255,255,0.86)',
      border: `1px solid ${t.line}`, boxShadow: '0 16px 40px rgba(21,35,28,0.12)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    }}>
      {items.map(([route, label]) => (
        <button key={route} onClick={() => go(route)} style={{
          border: 'none', borderRadius: 999, background: 'transparent', color: t.ink,
          padding: '10px 0', fontFamily: YM_FONT.mono, fontSize: 10.5, fontWeight: 800,
          cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  );
}

function ProjectScreen({ go }) {
  return (
    <AppScreen dock={<DetailNav go={go} />}>
      <ProjectPage activeSection={0} />
    </AppScreen>
  );
}

function DetailScreen({ route, go }) {
  const screens = {
    estimate: <EstimateScreen />,
    studio: <StudioScreen />,
    permit: <PermitScreen />,
    build: <BuildScreen />,
  };
  return (
    <AppScreen
      dock={
        <>
          <BottomAction secondary onClick={() => go('project')}>← Back to Project Page</BottomAction>
        </>
      }
    >
      {screens[route] || screens.estimate}
    </AppScreen>
  );
}

function RouteContent({ route, go }) {
  if (route === 'welcome') {
    return (
      <AppScreen dock={<BottomAction onClick={() => go('scan')}>Scan my yard</BottomAction>}>
        <WelcomeScreen />
      </AppScreen>
    );
  }

  if (route === 'scan') {
    return (
      <AppScreen dock={<BottomAction onClick={() => go('result')} tone="ink">Use this placement</BottomAction>}>
        <LensScanScreen />
      </AppScreen>
    );
  }

  if (route === 'result') {
    return (
      <AppScreen dock={<BottomAction onClick={() => go('project')}>Open Project Page</BottomAction>}>
        <LensResultScreen />
      </AppScreen>
    );
  }

  if (route === 'project') return <ProjectScreen go={go} />;
  return <DetailScreen route={route} go={go} />;
}

function MobileApp() {
  const [route, setRoute] = React.useState('welcome');
  const [frame, setFrame] = React.useState('ios');
  const [theme, setTheme] = React.useState('paper');
  const [accent, setAccent] = React.useState('revenue');

  const go = React.useCallback((next) => setRoute(next), []);

  return (
    <div style={{
      minHeight: '100vh', background: '#F0EEE9', color: '#15231C',
      display: 'grid', gridTemplateRows: 'auto 1fr',
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
        padding: '18px 22px', borderBottom: '1px solid rgba(21,35,28,0.08)',
      }}>
        <div>
          <div style={{
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, fontWeight: 800,
            letterSpacing: 1.5, textTransform: 'uppercase', color: '#566159',
          }}>Implemented prototype</div>
          <h1 style={{ margin: '4px 0 0', fontFamily: '"Fraunces", Georgia, serif', fontSize: 28, lineHeight: 1, letterSpacing: -0.6 }}>
            YardUp mobile redesign
          </h1>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
          <AppControl active={frame === 'ios'} onClick={() => setFrame('ios')}>iOS</AppControl>
          <AppControl active={frame === 'android'} onClick={() => setFrame('android')}>Android</AppControl>
          <AppControl active={theme === 'paper'} onClick={() => setTheme('paper')}>Paper</AppControl>
          <AppControl active={theme === 'dusk'} onClick={() => setTheme('dusk')}>Dusk</AppControl>
          <AppControl active={accent === 'revenue'} onClick={() => setAccent('revenue')}>Revenue</AppControl>
          <AppControl active={accent === 'cash'} onClick={() => setAccent('cash')}>Cash</AppControl>
        </div>
      </header>

      <main style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflow: 'auto',
      }}>
        <MobilePhone frame={frame}>
          <YMProvider theme={theme} accent={accent} device={frame}>
            <RouteContent route={route} go={go} />
          </YMProvider>
        </MobilePhone>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MobileApp />);
