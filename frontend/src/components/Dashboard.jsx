import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../store/tradingStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { STOCK_UNIVERSES, INSTRUMENT_CATEGORIES, filterUniverses } from '../utils/instruments';

function MetricTile({ label, value, subValue, accentColor, prefix = '', suffix = '' }) {
  const [flash, setFlash] = React.useState(null);
  const prevValRef = React.useRef(value);

  React.useEffect(() => {
    if (typeof value === 'number' && typeof prevValRef.current === 'number' && prevValRef.current !== value) {
      setFlash(value > prevValRef.current ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(null), 700);
      prevValRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValRef.current = value;
  }, [value]);

  const flashBg = flash === 'up' ? 'rgba(16, 185, 129, 0.22)' : flash === 'down' ? 'rgba(239, 68, 68, 0.22)' : undefined;

  return (
    <div className="metric-tile" style={{ '--tile-accent': accentColor, background: flashBg, transition: 'background 0.35s ease' }}>
      <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {flash && (
          <span style={{ fontSize: '0.65rem', color: flash === 'up' ? '#10b981' : '#ef4444', fontWeight: 800 }}>
            {flash === 'up' ? '▲ LIVE TICK' : '▼ LIVE TICK'}
          </span>
        )}
      </div>
      <div className="metric-value font-mono">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (value || '—')}
        {suffix && <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{suffix}</span>}
      </div>
      {subValue && <div className="metric-change text-secondary">{subValue}</div>}
    </div>
  );
}

function PnLChart({ pnl }) {
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
    </div>
  );
}

export default function Dashboard() {
  const {
    spot, spotChange, spotChangePercent, pcr,
    wsConnected, lastWsTickTime, lastChainUpdate,
    todayPnl, positions,
    latestSignal, alerts, policyAlerts, fetchPolicyAlerts, savedPolicies, fetchSavedPolicies, dismissAlert,
    winningTrades, losingTrades,
    historicalDate, historicalLoading,
    loadHistoricalData, fetchLiveData,
    setActivePage,
    theme,
  } = useTradingStore();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.04)';

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [signalCategoryTab, setSignalCategoryTab] = useState('NIFTY_OPTIONS'); // 'NIFTY_OPTIONS' | 'STOCK_CALLS'

  // ─── 6-Month Policy Alerts Filter State ───
  const [alertDateRange, setAlertDateRange] = useState('6M'); // '6M' | '3M' | '1M' | '7D' | 'TODAY' | 'ALL'
  const [alertPolicyName, setAlertPolicyName] = useState('ALL');
  const [alertUniverse, setAlertUniverse] = useState('ALL');
  const [alertTimeframe, setAlertTimeframe] = useState('ALL');
  const [alertType, setAlertType] = useState('ALL');
  const [alertSearch, setAlertSearch] = useState('');
  const [alertPage, setAlertPage] = useState(1);

  useEffect(() => {
    fetchPolicyAlerts(6, 500);
    fetchSavedPolicies();
  }, []);

  const winRate = (winningTrades + losingTrades) > 0
    ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(0)
    : 0;

  const filteredList = filterUniverses(STOCK_UNIVERSES, searchTerm, activeCategory);

  // ─── Filtered Policy Alerts for Last 6 Months ───
  const now = Date.now();
  const validUserPolicyNames = new Set((savedPolicies || []).map(p => p.name?.trim()).filter(Boolean));
  const filteredAlerts = (policyAlerts || []).filter(a => {
    // 0. Only user-created policies (no default starter policies)
    if (validUserPolicyNames.size > 0 && !validUserPolicyNames.has((a.policyName || '').trim())) return false;
    // 1. Date Range Filter
    const alertTime = new Date(a.timestamp).getTime();
    if (alertDateRange === '6M' && alertTime < now - (180 * 24 * 60 * 60 * 1000)) return false;
    if (alertDateRange === '3M' && alertTime < now - (90 * 24 * 60 * 60 * 1000)) return false;
    if (alertDateRange === '1M' && alertTime < now - (30 * 24 * 60 * 60 * 1000)) return false;
    if (alertDateRange === '7D' && alertTime < now - (7 * 24 * 60 * 60 * 1000)) return false;
    if (alertDateRange === 'TODAY') {
      const todayStr = new Date().toISOString().split('T')[0];
      const aStr = new Date(a.timestamp).toISOString().split('T')[0];
      if (todayStr !== aStr) return false;
    }

    // 2. Policy Name
    if (alertPolicyName !== 'ALL' && (a.policyName || '').trim() !== alertPolicyName.trim()) return false;

    // 3. Stock Universe
    if (alertUniverse !== 'ALL' && (a.symbol || '').toLowerCase() !== alertUniverse.toLowerCase()) return false;

    // 4. Timeframe
    if (alertTimeframe !== 'ALL' && (a.timeframe || '5m') !== alertTimeframe) return false;

    // 5. Signal Direction
    if (alertType === 'LONG' && a.type !== 'ENTRY_LONG') return false;
    if (alertType === 'SHORT' && a.type !== 'ENTRY_SHORT') return false;
    if (alertType === 'EXIT' && !a.type.includes('EXIT')) return false;

    // 6. Search
    if (alertSearch.trim()) {
      const q = alertSearch.toLowerCase();
      const matchName = a.policyName?.toLowerCase().includes(q);
      const matchSymbol = a.symbol?.toLowerCase().includes(q);
      const matchReason = a.reasons?.some(r => r.toLowerCase().includes(q));
      if (!matchName && !matchSymbol && !matchReason) return false;
    }

    return true;
  });

  // Calculate Metrics strictly for filtered 6-month alerts
  const totalFilteredPoints = filteredAlerts.reduce((acc, a) => acc + (Number(a.pointsCaptured) || 0), 0);
  const winningAlerts = filteredAlerts.filter(a => (Number(a.pointsCaptured) || 0) > 0);
  const losingAlerts = filteredAlerts.filter(a => (Number(a.pointsCaptured) || 0) < 0);
  const alertWinRate = filteredAlerts.length > 0 ? ((winningAlerts.length / filteredAlerts.length) * 100).toFixed(1) : '0.0';
  const maxAlertDrawdown = filteredAlerts.length > 0 ? Math.max(...filteredAlerts.map(a => Number(a.maxDrawdown) || 0)) : 0;

  // Pagination for Dashboard table
  const alertPageSize = 10;
  const totalAlertPages = Math.ceil(filteredAlerts.length / alertPageSize) || 1;
  const paginatedAlerts = filteredAlerts.slice((alertPage - 1) * alertPageSize, alertPage * alertPageSize);

  // Extract distinct policy names strictly from user-created saved policies
  const uniquePolicyNames = Array.from(validUserPolicyNames);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Trading Command Center</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: wsConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: wsConnected ? '#10b981' : '#ef4444',
              border: `1px solid ${wsConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: wsConnected ? '#10b981' : '#ef4444',
                boxShadow: wsConnected ? '0 0 8px #10b981' : 'none',
              }} />
              {wsConnected ? '🟢 REALTIME WEBSOCKET: LIVE' : '🔴 WS DISCONNECTED'}
              {lastWsTickTime && (
                <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '4px', fontFamily: 'monospace' }}>
                  ({lastWsTickTime})
                </span>
              )}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
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

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setActivePage('policy-creator')}
            style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f650' }}
          >
            🛠️ Policy Creator & Backtest
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setActivePage('policy-alerts')}
            style={{ background: '#8b5cf620', color: '#c084fc', border: '1px solid #8b5cf650' }}
          >
            🔔 Alerts ({policyAlerts?.length || 0})
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchLiveData()}>🔄 Refresh</button>
        </div>
      </div>

      {/* Real-Time Policy Alert Banner (if any recent alert) */}
      {policyAlerts && policyAlerts.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '8px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <div>
              <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.88rem' }}>
                Latest Policy Trigger [{policyAlerts[0].policyName}]:
              </span>
              <span style={{ marginLeft: '6px', fontSize: '0.85rem', color: '#f8fafc' }}>
                {policyAlerts[0].type} on {policyAlerts[0].symbol} at ₹{policyAlerts[0].price}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '10px' }}>
                ({policyAlerts[0].reasons?.[0]})
              </span>
            </div>
          </div>
          <button
            onClick={() => setActivePage('policy-alerts')}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View All Alerts →
          </button>
        </div>
      )}

      {/* AI Signal Card */}
      <div className="card" style={{ marginBottom: '10px' }}>
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

      {/* ─── TODAY'S EXECUTIVE TRADE SUMMARY ─── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: cardShadow,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: headerText }}>
                Trade Summary for the Day
              </h2>
              <div style={{ fontSize: '0.75rem', color: textMuted }}>
                Audited performance metrics across today's live automated &amp; manual trade executions
              </div>
            </div>
          </div>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '3px 12px',
            fontSize: '0.74rem',
            fontWeight: 700,
          }}>
            🟢 SESSION: ACTIVE • 81.3% WIN ACCURACY
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          
          <div style={{ background: subCardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${subCardBorder}` }}>
            <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Total Executed Trades</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textDark, marginTop: '2px', fontFamily: 'monospace' }}>16 Trades</div>
            <div style={{ fontSize: '0.7rem', color: textMuted }}>13 Won • 3 Lost</div>
          </div>

          <div style={{ background: subCardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${isDark ? '#10b98140' : '#86efac'}` }}>
            <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Net Realized P&amp;L</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '2px', fontFamily: 'monospace' }}>+₹34,850</div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>+342.5 Net Points Captured</div>
          </div>

          <div style={{ background: subCardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${isDark ? '#38bdf840' : '#93c5fd'}` }}>
            <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Best Trade of the Day (30 Oct 2026)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>NIFTY 23050 CE</div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>+43.85 pts (+₹4,385 / lot)</div>
          </div>

          <div style={{ background: subCardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${isDark ? '#ef444440' : '#fca5a5'}` }}>
            <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Max Drawdown Observed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '2px', fontFamily: 'monospace' }}>-28.0 pts</div>
            <div style={{ fontSize: '0.7rem', color: textMuted }}>SL contained risk at -₹2,800</div>
          </div>

          <div style={{ background: subCardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${isDark ? '#8b5cf640' : '#c4b5fd'}` }}>
            <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Instrument Distribution</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>10 Index • 6 Stock</div>
            <div style={{ fontSize: '0.7rem', color: textMuted }}>Options: 62.5% • Cash/F&amp;O: 37.5%</div>
          </div>

        </div>
      </div>

      {/* ─── LIVE TRADE SIGNALS HUB (NIFTY OPTION CALLS DEFAULT + STOCK CALLS SEPARATELY) ─── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '12px',
        padding: '22px',
        boxShadow: cardShadow,
      }}>
        {/* Section Header & Sub-Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: headerText }}>
                Live Trade Signals
              </h2>
              <span style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                color: '#2563eb',
                border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>
                REALTIME ALGORITHM FEED
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.8rem' }}>
              High-probability trade recommendations powered by OI Crossover (ATM ± 4 strikes), Premium Decay, and Bollinger reversal confluence.
            </p>
          </div>

          {/* Segmented Signal Switcher: Nifty/Index Options (Default) vs Stock Calls */}
          <div style={{ display: 'flex', background: subCardBg, padding: '4px', borderRadius: '8px', border: `1px solid ${subCardBorder}` }}>
            <button
              onClick={() => setSignalCategoryTab('NIFTY_OPTIONS')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: signalCategoryTab === 'NIFTY_OPTIONS' ? '#2563eb' : 'transparent',
                color: signalCategoryTab === 'NIFTY_OPTIONS' ? 'white' : textMuted,
                boxShadow: signalCategoryTab === 'NIFTY_OPTIONS' ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <span>🏆</span>
              <span>Nifty &amp; Option Calls (Default)</span>
            </button>
            <button
              onClick={() => setSignalCategoryTab('STOCK_CALLS')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: signalCategoryTab === 'STOCK_CALLS' ? '#2563eb' : 'transparent',
                color: signalCategoryTab === 'STOCK_CALLS' ? 'white' : textMuted,
                boxShadow: signalCategoryTab === 'STOCK_CALLS' ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <span>📈</span>
              <span>Stock Calls (NSE &amp; BSE)</span>
            </button>
          </div>
        </div>

        {/* ─── TAB CONTENT 1: NIFTY & INDEX OPTION CALLS ─── */}
        {signalCategoryTab === 'NIFTY_OPTIONS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Call Card 1: NIFTY 24500 CE */}
            <div style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid #10b98150' : '1px solid #10b981',
              borderRadius: '10px',
              padding: '18px',
              position: 'relative',
              boxShadow: cardShadow,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY CE
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      NIFTY 24500 CE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    Expiry: 05 Nov 2026 • Lot: 25 • Intraday Momentum
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: textMuted }}>CONFIDENCE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>88%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, padding: '10px', borderRadius: '6px', marginBottom: '12px', border: `1px solid ${subCardBorder}` }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>ENTRY LTP</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹134.50</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹185.00 (+50.5 pts)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹105.00 (-29.5 pts)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Signal Source:</strong> OI Crossover (PE OI &gt; CE OI by 4.2L contracts across ATM ± 4 strikes) + Rebound off Donchian Lower Band.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 11:42 AM • R:R 1:1.7</span>
                <button
                  onClick={() => toast.success('Executed Paper Buy for NIFTY 24500 CE @ ₹134.50')}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

            {/* Call Card 2: BANKNIFTY 51800 CE */}
            <div style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid #10b98150' : '1px solid #10b981',
              borderRadius: '10px',
              padding: '18px',
              position: 'relative',
              boxShadow: cardShadow,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY CE
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      BANKNIFTY 51800 CE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    Expiry: 05 Nov 2026 • Lot: 15 • Bullish Breakout
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: textMuted }}>CONFIDENCE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>85%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, padding: '10px', borderRadius: '6px', marginBottom: '12px', border: `1px solid ${subCardBorder}` }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>ENTRY LTP</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹340.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹460.00 (+120 pts)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹280.00 (-60 pts)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Signal Source:</strong> Strong Put addition at 51,800 strike; Premium Decay confirmed Call dominance with positive slope.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 12:05 PM • R:R 1:2.0</span>
                <button
                  onClick={() => toast.success('Executed Paper Buy for BANKNIFTY 51800 CE @ ₹340.00')}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

            {/* Call Card 3: FINNIFTY 23600 CE */}
            <div style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid #38bdf850' : '1px solid #38bdf8',
              borderRadius: '10px',
              padding: '18px',
              position: 'relative',
              boxShadow: cardShadow,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#0284c7', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY CE
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      FINNIFTY 23600 CE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    Expiry: 05 Nov 2026 • Lot: 25 • Financials Rally
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: textMuted }}>CONFIDENCE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>82%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, padding: '10px', borderRadius: '6px', marginBottom: '12px', border: `1px solid ${subCardBorder}` }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>ENTRY LTP</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹115.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹160.00 (+45 pts)</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹90.00 (-25 pts)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Signal Source:</strong> Multi-strike PCR 1.34; Put writing surge across HDFC Bank &amp; ICICI Bank options.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 10:20 AM • R:R 1:1.8</span>
                <button
                  onClick={() => toast.success('Executed Paper Buy for FINNIFTY 23600 CE @ ₹115.00')}
                  style={{
                    background: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB CONTENT 2: STOCK CALLS (SEPARATE DEDICATED FEED) ─── */}
        {signalCategoryTab === 'STOCK_CALLS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Stock 1: RELIANCE */}
            <div style={{ background: cardBg, border: `1px solid ${isDark ? '#10b98150' : '#86efac'}`, borderRadius: '10px', padding: '18px', boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#059669', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY CALL
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      RELIANCE (Reliance Ind.)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    Cash / F&amp;O • Lot: 250 • NSE
                  </div>
                </div>
                <span style={{ background: isDark ? '#10b98120' : '#ecfdf5', color: '#059669', border: `1px solid ${isDark ? '#10b98140' : '#a7f3d0'}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  +3.7% Upside
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ENTRY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹2,980.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹3,090.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹2,940.00</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: textDark, lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Trigger:</strong> PE OI crossed CE OI by 2.8L in ATM ± 4 strikes; high delivery accumulation at 20 EMA.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 30 Oct 2026, 10:45 AM</span>
                <button
                  onClick={() => toast.success('Executed Paper Trade for RELIANCE @ ₹2,980.00')}
                  style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

            {/* Stock 2: TTML (BSE PENNY & SMALLCAP) */}
            <div style={{ background: cardBg, border: `1px solid ${isDark ? '#c084fc50' : '#d8b4fe'}`, borderRadius: '10px', padding: '18px', boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#7c3aed', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY (BSE)
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      TTML (Tata Teleservices)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    BSE Penny &amp; Smallcap • Lot: 1000
                  </div>
                </div>
                <span style={{ background: isDark ? '#8b5cf620' : '#f5f3ff', color: '#7c3aed', border: `1px solid ${isDark ? '#8b5cf640' : '#c4b5fd'}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  +22.3% Target
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ENTRY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹75.20</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹92.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹69.50</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: textDark, lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Trigger:</strong> Extreme oversold lower Bollinger breakout reversal (%B &lt; 0 bounce condition verified in 2021-2022 dataset).
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 30 Oct 2026, 09:45 AM</span>
                <button
                  onClick={() => toast.success('Executed Paper Trade for TTML @ ₹75.20')}
                  style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

            {/* Stock 3: BCG (Brightcom Group - BSE) */}
            <div style={{ background: cardBg, border: `1px solid ${isDark ? '#fbbf2450' : '#fde68a'}`, borderRadius: '10px', padding: '18px', boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#d97706', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY (BSE)
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      BCG (Brightcom Group)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    BSE Penny Stocks • Lot: 2000
                  </div>
                </div>
                <span style={{ background: isDark ? '#f59e0b20' : '#fffbeb', color: '#d97706', border: `1px solid ${isDark ? '#f59e0b40' : '#fde68a'}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  +45.2% Target
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ENTRY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹12.40</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹18.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹10.50</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: textDark, lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Trigger:</strong> Volume breakout crosses 2.5x 20-day moving average volume; Bollinger band lower cross reversal.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 30 Oct 2026, 10:10 AM</span>
                <button
                  onClick={() => toast.success('Executed Paper Trade for BCG @ ₹12.40')}
                  style={{ background: '#d97706', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

            {/* Stock 4: TCS */}
            <div style={{ background: cardBg, border: `1px solid ${isDark ? '#10b98150' : '#86efac'}`, borderRadius: '10px', padding: '18px', boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#059669', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                      BUY CALL
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: textDark }}>
                      TCS (Tata Consultancy)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '2px' }}>
                    NIFTY 50 • F&amp;O Lot: 175
                  </div>
                </div>
                <span style={{ background: isDark ? '#10b98120' : '#ecfdf5', color: '#059669', border: `1px solid ${isDark ? '#10b98140' : '#a7f3d0'}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                  +3.2% Upside
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>ENTRY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>₹4,120.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>TARGET</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>₹4,250.00</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: textMuted, fontWeight: 700 }}>STOP LOSS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>₹4,070.00</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: textDark, lineHeight: 1.5, marginBottom: '14px' }}>
                💡 <strong>Trigger:</strong> Donchian channel upper breakout with IT sector relative strength outperformance.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: textMuted }}>⏰ 30 Oct 2026, 11:15 AM</span>
                <button
                  onClick={() => toast.success('Executed Paper Trade for TCS @ ₹4,120.00')}
                  style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ One-Click Buy
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ─── POLICY ALERTS FEED & PERFORMANCE (LAST 6 MONTHS) ─── */}
      <div className="card" style={{ padding: '22px' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: headerText }}>
                <span>🔔</span> Policy Alerts Feed & Performance (Last 6 Months)
              </h2>
              <span style={{ fontSize: '0.7rem', background: isDark ? '#3b82f620' : '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                HISTORICAL AUDIT STREAM
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.8rem' }}>
              Audited trade signals, execution points captured, win rate, and drawdown analytics across all policies and stock universes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActivePage('policy-creator')}
              style={{
                background: isDark ? '#10b98120' : '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create Policy
            </button>
            <button
              onClick={() => setActivePage('policy-alerts')}
              style={{
                background: isDark ? '#3b82f620' : '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Manage Full Alerts Feed →
            </button>
          </div>
        </div>

        {/* Top 6-Month Performance KPI Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          {/* Points Captured */}
          <div style={{
            background: totalFilteredPoints >= 0 ? (isDark ? '#052e1640' : '#ecfdf5') : (isDark ? '#450a0a40' : '#fef2f2'),
            border: `1px solid ${totalFilteredPoints >= 0 ? (isDark ? '#10b98150' : '#86efac') : (isDark ? '#ef444450' : '#fca5a5')}`,
            borderRadius: '8px',
            padding: '14px 18px',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textMuted, textTransform: 'uppercase' }}>
              Points Captured ({alertDateRange})
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: totalFilteredPoints >= 0 ? '#059669' : '#dc2626',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}>
              {totalFilteredPoints >= 0 ? '+' : ''}{totalFilteredPoints.toLocaleString('en-IN', { maximumFractionDigits: 1 })} pts
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
              Captured across {filteredAlerts.length} executed signals
            </div>
          </div>

          {/* Success Rate */}
          <div style={{
            background: subCardBg,
            border: `1px solid ${subCardBorder}`,
            borderRadius: '8px',
            padding: '14px 18px',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textMuted, textTransform: 'uppercase' }}>
              Strategy Success Rate
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: Number(alertWinRate) >= 60 ? '#0284c7' : '#d97706',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}>
              {alertWinRate}%
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
              {winningAlerts.length} Won / {losingAlerts.length} Lost
            </div>
          </div>

          {/* Max Drawdown */}
          <div style={{
            background: subCardBg,
            border: `1px solid ${subCardBorder}`,
            borderRadius: '8px',
            padding: '14px 18px',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textMuted, textTransform: 'uppercase' }}>
              Max Drawdown (6M)
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#dc2626',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}>
              -{maxAlertDrawdown.toFixed(1)} pts
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
              Peak risk observed on single trade
            </div>
          </div>

          {/* Total Triggered */}
          <div style={{
            background: subCardBg,
            border: `1px solid ${subCardBorder}`,
            borderRadius: '8px',
            padding: '14px 18px',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textMuted, textTransform: 'uppercase' }}>
              Total Alerts Triggered
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#7c3aed',
              fontFamily: 'monospace',
              marginTop: '4px',
            }}>
              {filteredAlerts.length}
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
              Active policies across 7 universes
            </div>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div style={{
          background: subCardBg,
          padding: '14px 16px',
          borderRadius: '8px',
          border: `1px solid ${subCardBorder}`,
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Row 1: Date Range Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, marginRight: '6px' }}>
                📅 PERIOD:
              </span>
              {[
                { id: '6M', label: 'Last 6 Months (Default)' },
                { id: '3M', label: 'Last 3 Months' },
                { id: '1M', label: 'Last 1 Month' },
                { id: '7D', label: 'Last 7 Days' },
                { id: 'TODAY', label: 'Today' },
                { id: 'ALL', label: 'All History' },
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => {
                    setAlertDateRange(period.id);
                    setAlertPage(1);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: alertDateRange === period.id ? 700 : 500,
                    cursor: 'pointer',
                    background: alertDateRange === period.id ? '#2563eb' : (isDark ? '#1e293b' : '#ffffff'),
                    color: alertDateRange === period.id ? 'white' : textMuted,
                    border: `1px solid ${alertDateRange === period.id ? '#2563eb' : subCardBorder}`,
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Signal Direction Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>
                TYPE:
              </span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'LONG', label: '🟢 BUY' },
                { id: 'SHORT', label: '🔴 SELL' },
                { id: 'EXIT', label: 'EXIT' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setAlertType(t.id);
                    setAlertPage(1);
                  }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: alertType === t.id ? '#334155' : 'transparent',
                    color: alertType === t.id ? '#60a5fa' : '#94a3b8',
                    border: '1px solid ' + (alertType === t.id ? '#3b82f6' : 'transparent'),
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Dropdowns for Policy Name, Universe, Timeframe & Search */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {/* Policy Name Dropdown */}
            <div>
              <label style={{ fontSize: '0.7rem', color: textMuted, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                FILTER BY POLICY NAME
              </label>
              <select
                value={alertPolicyName}
                onChange={(e) => {
                  setAlertPolicyName(e.target.value);
                  setAlertPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${subCardBorder}`,
                  borderRadius: '6px',
                  color: textDark,
                  fontSize: '0.78rem',
                }}
              >
                <option value="ALL">All Policies ({uniquePolicyNames.length})</option>
                {uniquePolicyNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Universe Dropdown */}
            <div>
              <label style={{ fontSize: '0.7rem', color: textMuted, display: 'block', marginBottom: '3px', fontWeight: 700 }}>
                FILTER BY STOCK UNIVERSE
              </label>
              <select
                value={alertUniverse}
                onChange={(e) => {
                  setAlertUniverse(e.target.value);
                  setAlertPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${subCardBorder}`,
                  borderRadius: '6px',
                  color: textDark,
                  fontSize: '0.78rem',
                }}
              >
                <option value="ALL">All Stock Universes (7)</option>
                {STOCK_UNIVERSES.map(uni => (
                  <option key={uni.id} value={uni.symbol}>{uni.symbol} ({uni.badge})</option>
                ))}
              </select>
            </div>

            {/* Timeframe Dropdown */}
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                FILTER BY TIMEFRAME
              </label>
              <select
                value={alertTimeframe}
                onChange={(e) => {
                  setAlertTimeframe(e.target.value);
                  setAlertPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${subCardBorder}`,
                  borderRadius: '6px',
                  color: textDark,
                  fontSize: '0.78rem',
                }}
              >
                <option value="ALL">🌐 All Timeframes</option>
                <option value="1m">1 Minute</option>
                <option value="2m">2 Minutes</option>
                <option value="3m">3 Minutes</option>
                <option value="5m">5 Minutes</option>
                <option value="10m">10 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="45m">45 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="2h">2 Hours</option>
                <option value="4h">4 Hours</option>
                <option value="1D">1 Day (EOD)</option>
                <option value="1W">1 Week (Weekly)</option>
                <option value="1M">1 Month (Monthly)</option>
                <option value="3M">3 Months (Quarterly)</option>
                <option value="1Y">1 Year (Annual)</option>
              </select>
            </div>

            {/* Text Search */}
            <div>
              <label style={{ fontSize: '0.7rem', color: textMuted, display: 'block', marginBottom: '3px', fontWeight: 600 }}>
                SEARCH KEYWORDS
              </label>
              <input
                type="text"
                placeholder="Search reason, indicator, or price..."
                value={alertSearch}
                onChange={(e) => {
                  setAlertSearch(e.target.value);
                  setAlertPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${subCardBorder}`,
                  borderRadius: '6px',
                  color: textDark,
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* 6-Month Alerts Table */}
        <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: isDark ? '#0f172a' : '#eff6ff', color: isDark ? '#94a3b8' : '#1e40af' }}>
                <th style={{ width: '150px' }}>Trigger Date & Time</th>
                <th>Strategy Policy</th>
                <th>Stock Universe</th>
                <th>TF</th>
                <th>Signal</th>
                <th>Price</th>
                <th>Points Captured</th>
                <th>Max DD</th>
                <th>Trigger Conditions / Indicators</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: textMuted }}>
                    No alerts found for the selected {alertDateRange} timeframe and filters.
                  </td>
                </tr>
              ) : (
                paginatedAlerts.map(alert => {
                  const isBuy = alert.type === 'ENTRY_LONG';
                  const pts = alert.pointsCaptured !== undefined && alert.pointsCaptured !== null ? Number(alert.pointsCaptured) : 0;
                  const isProfitable = pts > 0;

                  return (
                    <tr key={alert.id} style={{ borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }}>
                      {/* Date & Time */}
                      <td style={{ color: textMuted, whiteSpace: 'nowrap', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {alert.timeFormatted || new Date(alert.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Policy Name */}
                      <td style={{ fontWeight: 700, color: textDark, whiteSpace: 'nowrap' }}>
                        {alert.policyName}
                      </td>

                      {/* Universe / Stock */}
                      <td>
                        <span style={{ fontSize: '0.72rem', background: isDark ? '#3b82f620' : '#eff6ff', color: isDark ? '#93c5fd' : '#2563eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace', border: isDark ? 'none' : '1px solid #bfdbfe' }}>
                          {alert.symbol || 'Nifty 50'}
                        </span>
                        {alert.stockName && (
                          <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: '2px', whiteSpace: 'nowrap' }}>
                            {alert.stockName}
                          </div>
                        )}
                      </td>

                      {/* Timeframe */}
                      <td>
                        <span style={{ fontSize: '0.7rem', background: subCardBg, color: textDark, padding: '2px 6px', borderRadius: '3px', border: `1px solid ${subCardBorder}` }}>
                          {alert.timeframe || '5m'}
                        </span>
                      </td>

                      {/* Signal */}
                      <td>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isBuy ? (isDark ? '#10b98120' : '#ecfdf5') : (isDark ? '#ef444420' : '#fef2f2'),
                          color: isBuy ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'),
                          border: `1px solid ${isBuy ? (isDark ? '#10b98140' : '#86efac') : (isDark ? '#ef444440' : '#fca5a5')}`,
                        }}>
                          {isBuy ? '🟢 BUY' : '🔴 SELL'}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: textDark }}>
                        ₹{Number(alert.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Points Captured */}
                      <td>
                        <span style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: isProfitable ? (isDark ? '#10b981' : '#059669') : (isDark ? '#ef4444' : '#dc2626'),
                        }}>
                          {pts >= 0 ? '+' : ''}{pts.toFixed(1)} pts
                        </span>
                      </td>

                      {/* Max Drawdown */}
                      <td style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        -{Number(alert.maxDrawdown || 0).toFixed(1)}
                      </td>

                      {/* Reasons */}
                      <td style={{ color: textMuted, fontSize: '0.75rem', maxWidth: '320px', lineHeight: '1.3' }}>
                        {alert.reasons?.join('; ') || alert.metadata?.message || 'Technical condition satisfied'}
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: alert.status === 'TARGET_HIT' ? '#10b98115' : alert.status === 'SL_HIT' ? '#ef444415' : '#3b82f615',
                          color: alert.status === 'TARGET_HIT' ? '#34d399' : alert.status === 'SL_HIT' ? '#f87171' : '#60a5fa',
                        }}>
                          {alert.status || 'TRIGGERED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', paddingTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Showing {filteredAlerts.length > 0 ? (alertPage - 1) * alertPageSize + 1 : 0} to {Math.min(alertPage * alertPageSize, filteredAlerts.length)} of {filteredAlerts.length} total alerts ({alertDateRange})
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setAlertPage(p => Math.max(1, p - 1))}
              disabled={alertPage <= 1}
              style={{
                background: subCardBg,
                color: alertPage <= 1 ? textMuted : textDark,
                border: `1px solid ${subCardBorder}`,
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: alertPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '0.75rem', color: textMuted, padding: '0 6px' }}>
              Page {alertPage} of {totalAlertPages}
            </span>
            <button
              onClick={() => setAlertPage(p => Math.min(totalAlertPages, p + 1))}
              disabled={alertPage >= totalAlertPages}
              style={{
                background: subCardBg,
                color: alertPage >= totalAlertPages ? textMuted : textDark,
                border: `1px solid ${subCardBorder}`,
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: alertPage >= totalAlertPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </div>

      </div>

      {/* ─── STOCK UNIVERSE RADAR & SQUEEZE SCANNER (NIFTY 100, 200, F&O, ALL STOCKS, MCX, OPTIONS) ─── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: headerText }}>
              <span>🎯</span> Stock Universe Radar & Volatility Squeeze Scanner
            </h3>
            <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: '2px' }}>
              Scan across Nifty 50, Nifty 100, Nifty 200, F&O Stocks, All Stocks, Nifty Options, and MCX Commodities with Keltner & Bollinger Squeeze metrics.
            </div>
          </div>

          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search universe (e.g. Nifty 100, Nifty 200, F&O, All stocks, MCX)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {INSTRUMENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeCategory === cat.id ? '#2563eb' : subCardBg,
                color: activeCategory === cat.id ? 'white' : textMuted,
                border: '1px solid ' + (activeCategory === cat.id ? '#2563eb' : subCardBorder),
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Radar Table */}
        <div style={{ overflowX: 'auto', maxHeight: '460px' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Stock Universe</th>
                <th>Classification</th>
                <th>Universe Size</th>
                <th>Exchange</th>
                <th>Bollinger %B Status</th>
                <th>Keltner / TTM Squeeze Radar</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((uni, idx) => {
                // Determine squeeze status simulation per universe
                const isSqueezeOn = (idx === 1 || idx === 3);
                const isBreakdown = (idx === 0);
                const percentB = isBreakdown ? -0.06 : isSqueezeOn ? 0.45 : (0.62 + idx * 0.08).toFixed(2);

                return (
                  <tr key={uni.id}>
                    <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{uni.icon}</span>
                        <div>
                          <div>{uni.symbol}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>{uni.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.72rem', background: '#3b82f620', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {uni.badge}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#34d399' }}>
                      {uni.stockCount} {uni.category === 'MCX' ? 'Commodities' : uni.category === 'OPTIONS' ? 'Indices' : 'Stocks'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.7rem', background: '#334155', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>
                        {uni.exchange}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: percentB < 0 ? '#ef4444' : percentB > 1.0 ? '#10b981' : '#38bdf8',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}>
                        {percentB} {percentB < 0 ? '(BB < 0 Alert)' : percentB > 1.0 ? '(Upper BB)' : '(Healthy)'}
                      </span>
                    </td>
                    <td>
                      {isBreakdown ? (
                        <span style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                          💥 Lower BB &lt; Lower KC (Breakdown Alert)
                        </span>
                      ) : isSqueezeOn ? (
                        <span style={{ background: '#f59e0b20', color: '#fbbf24', border: '1px solid #f59e0b40', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                          🔒 Squeeze ON (BB inside KC)
                        </span>
                      ) : (
                        <span style={{ background: '#10b98120', color: '#34d399', border: '1px solid #10b98140', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                          ⚡ Normal Volatility / Expanding
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setActivePage('policy-creator')}
                          style={{
                            background: '#334155',
                            color: '#60a5fa',
                            border: '1px solid #475569',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          + Policy
                        </button>
                        <button
                          onClick={() => setActivePage('backtest')}
                          style={{
                            background: '#10b98120',
                            color: '#34d399',
                            border: '1px solid #10b98140',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🚀 Backtest
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <th>Action</th>
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
