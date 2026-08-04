import { useTradingStore } from '../store/tradingStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function MetricTile({ label, value, subValue, accentColor, prefix = '', suffix = '' }) {
  return (
    <div className="metric-tile" style={{ '--tile-accent': accentColor }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : (value || '—')}
        {suffix && <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{suffix}</span>}
      </div>
      {subValue && <div className="metric-change text-secondary">{subValue}</div>}
    </div>
  );
}

function PnLChart({ pnl }) {
  // Generate mock curve data for demo (replace with real time-series from DB)
  const data = [
    { t: '9:15', pnl: 0 },
    { t: '9:45', pnl: 450 },
    { t: '10:15', pnl: 1200 },
    { t: '10:45', pnl: 800 },
    { t: '11:15', pnl: 1800 },
    { t: '11:45', pnl: 2200 },
    { t: '12:15', pnl: 1600 },
    { t: '12:45', pnl: pnl },
  ];

  const isPositive = pnl >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.78rem' }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'P&L']}
        />
        <Area type="monotone" dataKey="pnl" stroke={strokeColor} strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SignalSummary({ signal }) {
  if (!signal) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖</div>
        <div>Waiting for AI signal...</div>
      </div>
    );
  }

  const biasClass = signal.bias?.toLowerCase();
  const confidence = signal.confidence || 0;
  const confLevel = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';

  return (
    <div className={`signal-card ${biasClass}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <span className={`badge badge-${biasClass}`}>{signal.bias}</span>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '6px' }}>{signal.strategy}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>CONFIDENCE</div>
          <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: confLevel === 'high' ? 'var(--color-profit)' : confLevel === 'medium' ? 'var(--color-accent-yellow)' : 'var(--color-loss)' }}>
            {confidence}%
          </div>
        </div>
      </div>

      <div className="confidence-bar">
        <div className={`confidence-fill ${confLevel}`} style={{ width: `${confidence}%` }}></div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {signal.reasoning}
      </div>

      {signal.legs && signal.legs.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {signal.legs.map((leg, i) => (
            <div key={i} style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              background: leg.action === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: leg.action === 'BUY' ? 'var(--color-profit)' : 'var(--color-loss)',
              border: `1px solid ${leg.action === 'BUY' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {leg.action} {leg.strike} {leg.type} × {leg.lots}
            </div>
          ))}
        </div>
      )}

      {signal.avoid_if && (
        <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-accent-yellow)' }}>⚠️ Avoid if: {signal.avoid_if}</span>
        </div>
      )}
    </div>
  );
}

function AlertPanel({ alerts, dismissAlert }) {
  if (alerts.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {alerts.slice(0, 3).map((alert, i) => (
        <div key={i} className={`alert-bar ${(alert.level || 'info').toLowerCase()}`}>
          <span style={{ flex: 1 }}>{alert.message}</span>
          <button onClick={() => dismissAlert(i)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', opacity: 0.6 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const {
    spot, spotChange, spotChangePercent, vix, pcr, atm,
    todayPnl, realizedPnl, positions,
    latestSignal, alerts, dismissAlert,
    winningTrades, losingTrades,
    historicalDate, historicalLoading,
    loadHistoricalData, fetchLiveData,
  } = useTradingStore();

  const winRate = (winningTrades + losingTrades) > 0
    ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Trading Dashboard</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {historicalDate && (
              <span style={{
                background: 'rgba(16,185,129,0.15)',
                color: 'var(--color-profit)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '5px',
                padding: '1px 7px',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}>📅 Historical: {historicalDate}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={historicalLoading}
            onClick={async () => {
              try { await loadHistoricalData('2026-07-31'); } catch (e) { alert('Load failed: ' + e.message); }
            }}
            style={{ opacity: historicalLoading ? 0.6 : 1 }}
          >
            {historicalLoading ? '⏳ Loading…' : '📅 Load 31-Jul-2026'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchLiveData()}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm">+ New Trade</button>
        </div>
      </div>

      {/* Alerts */}
      <AlertPanel alerts={alerts} dismissAlert={dismissAlert} />

      {/* Metric Tiles Row */}
      <div className="grid-4">
        <MetricTile
          label="Nifty Spot"
          value={spot}
          subValue={spot ? `${spotChange > 0 ? '▲' : '▼'} ${Math.abs(spotChangePercent || 0).toFixed(2)}%` : null}
          accentColor={spotChange >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
        />
        <MetricTile
          label="Today's P&L"
          value={todayPnl}
          prefix="₹"
          accentColor={todayPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
          subValue={`Win rate: ${winRate}%`}
        />
        <MetricTile
          label="PCR (OI)"
          value={pcr || '—'}
          accentColor={pcr > 1.2 ? 'var(--color-profit)' : pcr < 0.8 ? 'var(--color-loss)' : 'var(--color-accent-yellow)'}
          subValue={pcr > 1.2 ? 'Bullish lean' : pcr < 0.8 ? 'Bearish lean' : 'Neutral'}
        />
        <MetricTile
          label="Open Positions"
          value={positions.length}
          accentColor="var(--color-accent-blue)"
          subValue="Active legs"
        />
      </div>

      {/* Main Grid — P&L chart + Signal */}
      <div className="grid-2">
        {/* P&L Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Intraday P&L</span>
            <span className={todayPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
              {todayPnl >= 0 ? '+' : ''}₹{todayPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <PnLChart pnl={todayPnl} />
        </div>

        {/* Latest AI Signal */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🤖 Latest AI Signal</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {latestSignal && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {new Date(latestSignal.generatedAt).toLocaleTimeString('en-IN')}
                </span>
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                onClick={async () => {
                  try {
                    await fetch('http://localhost:3001/api/signals/generate', { method: 'POST' });
                  } catch (e) {
                    console.error('Trigger signal failed:', e);
                  }
                }}
              >
                ⚡ Trigger Now
              </button>
            </div>
          </div>
          <SignalSummary signal={latestSignal} />
        </div>
      </div>

      {/* Positions Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Open Positions</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{positions.length} active</span>
        </div>
        {positions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No open positions
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th><th>Type</th><th>Qty</th>
                <th>Entry</th><th>LTP</th><th>MTM P&L</th>
                <th>Delta</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{pos.symbol || '—'}</td>
                  <td><span className={`badge ${pos.buyQty > 0 ? 'badge-bullish' : 'badge-bearish'}`}>{pos.buyQty > 0 ? 'LONG' : 'SHORT'}</span></td>
                  <td>{pos.netQty || '—'}</td>
                  <td>{pos.costPrice?.toFixed(2) || '—'}</td>
                  <td className="font-mono">{pos.lastTradedPrice?.toFixed(2) || '—'}</td>
                  <td className={pos.unrealizedProfit >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {pos.unrealizedProfit >= 0 ? '+' : ''}₹{(pos.unrealizedProfit || 0).toFixed(0)}
                  </td>
                  <td className="text-secondary">—</td>
                  <td><button className="btn btn-danger btn-sm">Exit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
