import { useEffect, useState } from 'react';
import { useTradingStore } from '../store/tradingStore';
import StrikeSelectorModal from './StrikeSelectorModal';

const API_BASE = 'http://localhost:3001/api';

const INTERVAL_OPTIONS = [
  { label: '3 min', value: 3 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
];

export default function TrendingOI() {
  const { spot, atm } = useTradingStore();

  const currentSpot = spot || 24383.6;
  const currentAtm  = atm || Math.round(currentSpot / 50) * 50;

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [symbol, setSymbol] = useState('NIFTY');
  const [mode, setMode] = useState('live');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [expiryDate, setExpiryDate] = useState('04-Aug-2026');
  const [timeframe, setTimeframe] = useState(3);
  const [showGraphView, setShowGraphView] = useState(false);

  const [selectedStrikes, setSelectedStrikes] = useState([
    currentAtm - 150,
    currentAtm - 100,
    currentAtm - 50,
    currentAtm,
    currentAtm + 50,
    currentAtm + 100,
    currentAtm + 150,
    currentAtm + 200,
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const strikesStr = selectedStrikes.join(',');
      const params = new URLSearchParams({
        symbol,
        strikes: strikesStr,
        timeframe,
      });
      const res = await fetch(`${API_BASE}/trending-oi/analysis?${params}`).then(r => r.json());
      setData(res);
    } catch (err) {
      console.error('Fetch Trending OI analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 5000);
    return () => clearInterval(interval);
  }, [selectedStrikes, timeframe, symbol]);

  const rows = data?.rows || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Trending OI
        </h1>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>|</span>
        <span style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Options Analysis
        </span>
      </div>

      {/* 2. Controls Card matching OI Pulse Layout */}
      <div className="card" style={{ padding: '16px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Mode Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Mode</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', fontWeight: 600 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'live'}
                  onChange={() => setMode('live')}
                  style={{ accentColor: '#ef4444' }}
                />
                Live data
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'historical'}
                  onChange={() => setMode('historical')}
                  style={{ accentColor: '#3b82f6' }}
                />
                Historical data
              </label>
            </div>
          </div>

          {/* Underlying Symbol Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Name</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              <option value="NIFTY">NIFTY</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
            </select>
          </div>

          {/* Date Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Expiry Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Expiry Date</span>
            <select
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <option value="04-Aug-2026">04-Aug-2026</option>
              <option value="11-Aug-2026">11-Aug-2026</option>
            </select>
          </div>

          {/* Timeframe Interval Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Interval</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(parseInt(e.target.value))}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid #3b82f6',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons: Go & Change Strike Prices */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={fetchAnalysis}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 20px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(220,38,38,0.3)',
              }}
            >
              Go
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '6px',
                padding: '6px 16px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Change Strike Prices
            </button>
          </div>

          {/* Show Graph View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showGraphView}
                onChange={(e) => setShowGraphView(e.target.checked)}
              />
              Show Graph View
            </label>
          </div>
        </div>

        {/* Selected Strike Prices & Underlying Status Sub-bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Selected Strike Prices:</strong>{' '}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}>
              {selectedStrikes.join(', ')}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Underlying: <strong style={{ color: 'var(--color-text-primary)' }}>{symbol}</strong> at{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{currentSpot.toFixed(2)}</strong> as on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* 3. Trending OI Table matching OI Pulse exact layout */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)', fontSize: '0.74rem', color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: '0.02em' }}>
                <th style={{ padding: '12px 6px', width: '40px' }}>#</th>
                <th style={{ padding: '12px 10px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>LTP</th>
                <th style={{ padding: '12px 10px' }}>Day H/L Break</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Chng. In Call OI</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Chng. In Put OI</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Diff. in OI</th>
                <th style={{ padding: '12px 10px' }}>Direction of chng.</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Chng. In Direction</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Direction of chng. %</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Net PCR</th>
                <th style={{ padding: '12px 10px' }}>Day High/Low Diff. in OI</th>
                <th style={{ padding: '12px 10px' }}>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '40px', color: 'var(--color-text-muted)' }}>
                    {loading ? '⏳ Loading Trending OI analysis...' : 'No data available'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.82rem' }}>
                    
                    {/* # */}
                    <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{row.id}</td>

                    {/* Time */}
                    <td style={{ textAlign: 'left', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {row.time}
                    </td>

                    {/* LTP */}
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {row.ltp?.toFixed(2)}
                    </td>

                    {/* Day H/L Break */}
                    <td style={{ color: 'var(--color-text-muted)' }}>{row.dayHLBreak || '-'}</td>

                    {/* Chng. In Call OI */}
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {row.chngInCallOI?.toLocaleString('en-IN')}
                    </td>

                    {/* Chng. In Put OI */}
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {row.chngInPutOI?.toLocaleString('en-IN')}
                    </td>

                    {/* Diff. in OI */}
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: row.diffInOI < 0 ? '#ef4444' : '#10b981' }}>
                      {row.diffInOI?.toLocaleString('en-IN')}
                    </td>

                    {/* Direction of chng. (Green square button with ↑ or Red square button with ↓) */}
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '24px',
                        borderRadius: '4px',
                        background: row.dirOfChng === 'UP' ? '#10b981' : '#ef4444',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                      }}>
                        {row.dirOfChng === 'UP' ? '↑' : '↓'}
                      </span>
                    </td>

                    {/* Chng. In Direction */}
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: (row.chngInDirection || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                      {row.chngInDirection?.toLocaleString('en-IN')}
                    </td>

                    {/* Direction of chng. % */}
                    <td className="font-mono" style={{ textAlign: 'right', color: (row.dirOfChngPct || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {row.dirOfChngPct}%
                    </td>

                    {/* Net PCR */}
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {row.netPCR?.toFixed(2)}
                    </td>

                    {/* Day High/Low Diff. in OI */}
                    <td style={{ color: 'var(--color-text-muted)' }}>{row.dayHLDiffOI || '-'}</td>

                    {/* Sentiment (Pill Badge) */}
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: row.sentiment === 'Bullish' ? '#10b981' : '#dc2626',
                        color: 'white',
                      }}>
                        {row.sentiment}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strike Price Selection Modal */}
      <StrikeSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        atmStrike={currentAtm}
        selectedStrikes={selectedStrikes}
        onSelectStrikes={setSelectedStrikes}
      />
    </div>
  );
}
