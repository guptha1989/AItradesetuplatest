import { useEffect, useState, useRef } from 'react';
import { useTradingStore } from '../store/tradingStore';

const API_BASE = 'http://localhost:3001/api';

const TIMEFRAMES = [
  { label: '1 min', value: 1 },
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
];

// Buildup badge renderer
function BuildupBadge({ type }) {
  const configs = {
    'LONG BUILD-UP':  { bg: 'rgba(16,185,129,0.18)', color: '#10b981', label: '📈 Long Build' },
    'SHORT BUILD-UP': { bg: 'rgba(239,68,68,0.18)',   color: '#ef4444', label: '📉 Short Build' },
    'SHORT COVERING': { bg: 'rgba(59,130,246,0.18)',  color: '#3b82f6', label: '🔼 Cov.' },
    'LONG UNWINDING': { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', label: '🔽 Unwind' },
    'NEUTRAL':        { bg: 'rgba(148,163,184,0.1)',  color: '#64748b', label: '—' },
  };
  const cfg = configs[type] || configs['NEUTRAL'];
  return (
    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

// OI change cell with inline bar
function OICell({ value, pct, side }) {
  const isUp = value > 0;
  const barColor = side === 'CE'
    ? (isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)')
    : (isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)');
  const textColor = isUp ? 'var(--color-profit)' : value < 0 ? 'var(--color-loss)' : 'var(--color-text-muted)';
  return (
    <td style={{ position: 'relative', padding: '8px 10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span className="font-mono" style={{ color: textColor, fontSize: '0.78rem', fontWeight: 600 }}>
          {isUp ? '▲' : value < 0 ? '▼' : ''}{Math.abs(value || 0).toLocaleString('en-IN')}
        </span>
        <span style={{ fontSize: '0.65rem', color: textColor }}>
          {pct > 0 ? '+' : ''}{pct?.toFixed(1)}%
        </span>
      </div>
    </td>
  );
}

// Volume cell
function VolumeCell({ value, pct }) {
  const isUp = pct > 0;
  return (
    <td style={{ padding: '8px 10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span className="font-mono" style={{ fontSize: '0.78rem' }}>{(value || 0).toLocaleString('en-IN')}</span>
        {pct !== undefined && (
          <span style={{ fontSize: '0.65rem', color: isUp ? 'var(--color-profit)' : 'var(--color-loss)' }}>
            {isUp ? '+' : ''}{pct?.toFixed(1)}%
          </span>
        )}
      </div>
    </td>
  );
}

export default function OptionChainView() {
  const { spot } = useTradingStore();
  const [chain, setChain] = useState([]);
  const [prevChain, setPrevChain] = useState({});
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [timeframe, setTimeframe] = useState(5);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chain`).then(r => r.json());
      if (res.chain && Array.isArray(res.chain)) {
        // Save previous for volume change calculation
        const prev = {};
        chain.forEach(r => { prev[r.strike] = r; });
        setPrevChain(prev);
        setChain(res.chain);
        setExpiry(res.expiry || '');
        setLastUpdate(new Date().toLocaleTimeString('en-IN'));
      }
    } catch (err) {
      console.error('Chain fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh based on timeframe
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      fetchChain();
      timerRef.current = setInterval(fetchChain, 5000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeframe, autoRefresh]);

  const atm = spot ? Math.round(spot / 50) * 50 : null;
  const maxOI = Math.max(...chain.map(r => Math.max(r.ceOI || 0, r.peOI || 0)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📊 Option Chain</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {expiry ? `Expiry: ${expiry}` : 'Fetching...'}
            {spot ? ` | Spot: ₹${spot.toLocaleString('en-IN')}` : ''}
            {atm ? ` | ATM: ${atm}` : ''}
            {lastUpdate ? ` | Updated: ${lastUpdate}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '2px', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', padding: '2px' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: timeframe === tf.value ? 'var(--color-accent-blue)' : 'transparent',
                  color: timeframe === tf.value ? 'white' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-ghost'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ Live' : '▶ Start'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={fetchChain} disabled={loading}>
            🔄 {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
        <span>📈 Long Build-up: OI↑ Price↑</span>
        <span>📉 Short Build-up: OI↑ Price↓</span>
        <span>🔼 Short Covering: OI↓ Price↑</span>
        <span>🔽 Long Unwinding: OI↓ Price↓</span>
        <span style={{ color: 'var(--color-accent-blue)' }}>BEP = (CE + PE) / 2</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {chain.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>No option chain data</div>
            <div style={{ fontSize: '0.82rem' }}>Configure Dhan API credentials in .env to see live data</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '1300px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  {/* CE side (right-aligned) */}
                  <th style={{ textAlign: 'right', color: 'var(--color-profit)', borderRight: '1px solid rgba(16,185,129,0.15)' }} colSpan={8}>CALLS (CE)</th>
                  {/* Strike & BEP center */}
                  <th style={{ textAlign: 'center', color: 'var(--color-accent-blue)', background: 'rgba(59,130,246,0.06)', minWidth: '100px' }}>STRIKE</th>
                  <th style={{ textAlign: 'center', color: 'var(--color-accent-blue)', background: 'rgba(59,130,246,0.1)', minWidth: '90px' }}>BEP</th>
                  {/* PE side */}
                  <th style={{ textAlign: 'left', color: 'var(--color-loss)', borderLeft: '1px solid rgba(239,68,68,0.15)' }} colSpan={8}>PUTS (PE)</th>
                </tr>
                <tr style={{ background: 'rgba(16,185,129,0.03)' }}>
                  {/* CE columns */}
                  <th style={{ textAlign: 'right' }}>Buildup</th>
                  <th style={{ textAlign: 'right' }}>Δ Delta</th>
                  <th style={{ textAlign: 'right' }}>Γ Gamma</th>
                  <th style={{ textAlign: 'right' }}>Θ Theta</th>
                  <th style={{ textAlign: 'right' }}>Volume / Chg%</th>
                  <th style={{ textAlign: 'right' }}>OI / Chg%</th>
                  <th style={{ textAlign: 'right' }}>IV %</th>
                  <th style={{ textAlign: 'right', borderRight: '2px solid rgba(16,185,129,0.2)' }}>LTP</th>
                  {/* Center */}
                  <th style={{ textAlign: 'center', background: 'rgba(59,130,246,0.06)', fontWeight: 800 }}>STRIKE</th>
                  <th style={{ textAlign: 'center', background: 'rgba(59,130,246,0.1)', fontWeight: 800, fontSize: '0.72rem' }} title="(CE LTP + PE LTP) / 2">BEP (CE+PE)/2</th>
                  {/* PE columns */}
                  <th style={{ textAlign: 'left', borderLeft: '2px solid rgba(239,68,68,0.2)' }}>LTP</th>
                  <th>IV %</th>
                  <th>OI / Chg%</th>
                  <th>Volume / Chg%</th>
                  <th>Θ Theta</th>
                  <th>Γ Gamma</th>
                  <th>Δ Delta</th>
                  <th>Buildup</th>
                </tr>
              </thead>
              <tbody>
                {chain.map((row, i) => {
                  const isATM = row.strike === atm;
                  const prev = prevChain[row.strike] || {};

                  const ceOIChangePct = row.ceOIChange && prev.ceOI > 0
                    ? (row.ceOIChange / prev.ceOI * 100)
                    : (row.ceOIChangePct || 0);
                  const peOIChangePct = row.peOIChange && prev.peOI > 0
                    ? (row.peOIChange / prev.peOI * 100)
                    : (row.peOIChangePct || 0);
                  const ceVolChgPct = prev.ceVolume > 0 && row.ceVolume > 0
                    ? ((row.ceVolume - prev.ceVolume) / prev.ceVolume * 100)
                    : 0;
                  const peVolChgPct = prev.peVolume > 0 && row.peVolume > 0
                    ? ((row.peVolume - prev.peVolume) / prev.peVolume * 100)
                    : 0;

                  const bep = row.ceLTP && row.peLTP
                    ? ((row.ceLTP + row.peLTP) / 2).toFixed(2)
                    : row.bep ? Number(row.bep).toFixed(2) : '—';

                  return (
                    <tr key={i} style={{
                      background: isATM
                        ? 'rgba(59,130,246,0.07)'
                        : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                      {/* CE: Buildup */}
                      <td style={{ textAlign: 'right', padding: '6px 10px' }}>
                        <BuildupBadge type={row.buildup?.ce || 'NEUTRAL'} />
                      </td>
                      {/* CE: Greeks */}
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{row.ceDelta?.toFixed(3) || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{row.ceGamma?.toFixed(5) || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-loss)' }}>{row.ceTheta?.toFixed(2) || '—'}</td>
                      {/* CE: Volume */}
                      <VolumeCell value={row.ceVolume} pct={ceVolChgPct} />
                      {/* CE: OI */}
                      <OICell value={row.ceOIChange || 0} pct={ceOIChangePct} side="CE" />
                      {/* CE: IV */}
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        {row.ceIV?.toFixed(1) || '—'}
                      </td>
                      {/* CE: LTP */}
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-profit)', borderRight: '2px solid rgba(16,185,129,0.15)', fontSize: '0.88rem' }}>
                        {row.ceLTP?.toFixed(2) || '—'}
                      </td>

                      {/* Strike */}
                      <td style={{
                        textAlign: 'center',
                        fontWeight: isATM ? 800 : 700,
                        color: isATM ? 'var(--color-accent-blue)' : 'var(--color-text-primary)',
                        background: 'rgba(59,130,246,0.04)',
                        fontSize: isATM ? '0.95rem' : '0.85rem',
                        padding: '6px 8px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {row.strike}
                        {isATM && <div style={{ fontSize: '0.55rem', color: 'var(--color-accent-blue)', letterSpacing: '0.1em', fontWeight: 800 }}>ATM</div>}
                      </td>

                      {/* BEP (CE+PE)/2 */}
                      <td style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#38bdf8',
                        background: 'rgba(56,189,248,0.06)',
                        fontSize: '0.85rem',
                        padding: '6px 8px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {bep}
                      </td>

                      {/* PE: LTP */}
                      <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-loss)', borderLeft: '2px solid rgba(239,68,68,0.15)', fontSize: '0.88rem', padding: '6px 10px' }}>
                        {row.peLTP?.toFixed(2) || '—'}
                      </td>
                      {/* PE: IV */}
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        {row.peIV?.toFixed(1) || '—'}
                      </td>
                      {/* PE: OI */}
                      <OICell value={row.peOIChange || 0} pct={peOIChangePct} side="PE" />
                      {/* PE: Volume */}
                      <VolumeCell value={row.peVolume} pct={peVolChgPct} />
                      {/* PE: Greeks */}
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-loss)' }}>{row.peTheta?.toFixed(2) || '—'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{row.peGamma?.toFixed(5) || '—'}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{row.peDelta?.toFixed(3) || '—'}</td>
                      {/* PE: Buildup */}
                      <td style={{ padding: '6px 10px' }}>
                        <BuildupBadge type={row.buildup?.pe || 'NEUTRAL'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BEP explanation */}
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: '24px' }}>
        <span>BEP (Break Even Price) = (CE LTP + PE LTP) / 2</span>
        <span>OI Change % calculated vs {timeframe}min ago snapshot</span>
        <span>Auto-refresh: every {timeframe} min</span>
      </div>
    </div>
  );
}
