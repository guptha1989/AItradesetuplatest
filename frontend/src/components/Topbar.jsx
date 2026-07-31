import { useTradingStore } from '../store/tradingStore';

export default function Topbar() {
  const { wsConnected, paperMode, spot, spotChange, spotChangePercent, tradingHalted, vix } = useTradingStore();

  const formatSpot = (val) => val ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const changeColor = spotChange > 0 ? 'var(--color-profit)' : spotChange < 0 ? 'var(--color-loss)' : 'var(--color-text-muted)';

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <div className="topbar-brand-icon">📈</div>
        <span>NiftyAI Trader</span>
      </div>

      {/* Center — Live Nifty spot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NIFTY 50</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatSpot(spot)}</span>
            {spotChange !== null && (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: changeColor }}>
                {spotChange > 0 ? '▲' : '▼'} {Math.abs(spotChange).toFixed(2)} ({Math.abs(spotChangePercent).toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {vix && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VIX</div>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: vix > 20 ? 'var(--color-loss)' : vix < 12 ? 'var(--color-profit)' : 'var(--color-text-primary)' }}>
              {vix?.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Right — Status badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {tradingHalted && (
          <span className="badge badge-bearish" style={{ animation: 'pulse-red 1.5s infinite' }}>
            🛑 HALTED
          </span>
        )}
        <span className={`badge ${paperMode ? 'badge-paper' : 'badge-live'}`}>
          {paperMode ? '📝 PAPER' : '🔴 LIVE'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
          <span className={`live-dot ${wsConnected ? '' : 'red'}`}></span>
          {wsConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </header>
  );
}
