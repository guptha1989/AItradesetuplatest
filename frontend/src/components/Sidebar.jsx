import { useTradingStore } from '../store/tradingStore';

const navSections = [
  {
    title: 'Trading',
    items: [
      { id: 'dashboard', icon: '⚡', label: 'Dashboard' },
      { id: 'dhan-dashboard', icon: '🎯', label: 'Dhan Live Chain' },
      { id: 'all-contracts', icon: '📜', label: 'All Contracts' },
      { id: 'chain',     icon: '📊', label: 'Option Chain' },
      { id: 'trending',  icon: '📈', label: 'Trending OI' },
      { id: 'signals',   icon: '🤖', label: 'AI Signals' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { id: 'sr',      icon: '🎯', label: 'Support & Resistance' },
      { id: 'journal', icon: '📋', label: 'Trade Journal' },
    ],
  },
];

export default function Sidebar() {
  const { activePage, setActivePage, todayPnl, positions, alerts, tradingHalted, paperMode } = useTradingStore();

  const pnlColor = todayPnl > 0 ? 'var(--color-profit)' : todayPnl < 0 ? 'var(--color-loss)' : 'var(--color-text-muted)';

  return (
    <aside className="sidebar">
      {navSections.map((section) => (
        <div key={section.title}>
          <div className="nav-section-title">{section.title}</div>
          {section.items.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'signals' && alerts.length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--color-loss)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}>{alerts.length}</span>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Today's P&L Summary */}
      <div style={{ margin: '16px 10px 0', padding: '14px', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.63rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Today's P&L</div>
        <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: pnlColor }}>
          {todayPnl >= 0 ? '+' : ''}₹{Math.abs(todayPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {positions.length} open position{positions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Risk Status */}
      <div style={{
        margin: '10px 10px 0',
        padding: '10px 14px',
        background: tradingHalted ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
        border: `1px solid ${tradingHalted ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.15)'}`,
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontSize: '0.63rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Risk Monitor</div>
        <div style={{ fontSize: '0.78rem', color: tradingHalted ? 'var(--color-loss)' : 'var(--color-profit)', fontWeight: 600 }}>
          {tradingHalted ? '🛑 HALTED' : '✓ All limits OK'}
        </div>
      </div>

      {/* Mode indicator */}
      <div style={{ margin: '10px 10px 0', textAlign: 'center' }}>
        <span className={`badge ${paperMode ? 'badge-paper' : 'badge-live'}`} style={{ width: '100%', justifyContent: 'center', padding: '6px' }}>
          {paperMode ? '📝 PAPER MODE' : '🔴 LIVE MODE'}
        </span>
      </div>
    </aside>
  );
}
