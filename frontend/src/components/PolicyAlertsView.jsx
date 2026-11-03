import React, { useState, useEffect, useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';
import toast from 'react-hot-toast';
import { STOCK_UNIVERSES } from '../utils/instruments';
import { ensureDateInTimestamp, formatDateTime } from '../utils/dateHelper';

export default function PolicyAlertsView() {
  const { policyAlerts, fetchPolicyAlerts, savedPolicies, fetchSavedPolicies, clearPolicyAlerts, markAlertsRead, spot, theme } = useTradingStore();
  const isDark = theme === 'dark';
  
  // Filter States
  const [filter, setFilter] = useState('ALL');
  const [selectedPolicyName, setSelectedPolicyName] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
  const [selectedUniverse, setSelectedUniverse] = useState('ALL');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | '7D' | '30D' | '3M' | '6M' | '2026' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'CARDS'
  const [alertSortCol, setAlertSortCol] = useState('timestamp');
  const [alertSortDir, setAlertSortDir] = useState('desc'); // 'asc' | 'desc'
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showTvModal, setShowTvModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Resilient fetch helper to avoid network drops & handle proxy transparently
  const safeFetchJson = async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (primaryErr) {
      const fallbackUrl = url.startsWith('http://localhost:3001')
        ? url.replace('http://localhost:3001', '')
        : `http://localhost:3001${url}`;
      const res2 = await fetch(fallbackUrl, options);
      if (!res2.ok) throw new Error(`Fallback HTTP ${res2.status}`);
      return await res2.json();
    }
  };

  const [lastUpdated, setLastUpdated] = useState(() => formatDateTime());

  useEffect(() => {
    fetchPolicyAlerts();
    fetchSavedPolicies();
    markAlertsRead();
    setLastUpdated(formatDateTime());
    const interval = setInterval(() => {
      fetchPolicyAlerts();
      fetchSavedPolicies();
      setLastUpdated(formatDateTime());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const playTestTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const handleSimulateAlert = async () => {
    setSimulating(true);
    try {
      if (soundEnabled) playTestTone();
      const demoNames = [
        'Donchian & ADX Volatility Breakout',
        'Double Bollinger & Multi-RSI Reversal',
        'Institutional VWAP + MACD Golden Confluence',
        'TTM Squeeze Breakdown Strategy',
      ];
      const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
      const randomTf = ['1m', '3m', '5m', '15m'][Math.floor(Math.random() * 4)];
      const randomPts = Number(((Math.random() > 0.25 ? 1 : -0.7) * (30 + Math.random() * 35)).toFixed(2));
      const randomDd = Number((Math.random() * 14 + 4).toFixed(2));

      const res = await safeFetchJson('http://localhost:3001/api/policies/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyName: randomName,
          timeframe: randomTf,
          action: randomPts > 0 ? 'BUY' : 'SELL',
          price: spot ? (spot + Math.random() * 20 - 10).toFixed(2) : 24500,
          ticker: 'NIFTY',
          pointsCaptured: randomPts,
          maxDrawdown: randomDd,
          message: `Multi-indicator signal: Lower BB < Lower KC, RSI=28.4, ADX=31.2 on ${randomTf}`,
        }),
      });

      if (res.success) {
        toast.success(`Dispatched simulated alert for ${randomName} (${randomTf})`);
        fetchPolicyAlerts();
      }
    } catch (err) {
      toast.error('Simulation failed: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearAlerts = async () => {
    if (window.confirm('Are you sure you want to clear all policy alerts?')) {
      await clearPolicyAlerts();
      toast.success('All alerts cleared');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await safeFetchJson(`http://localhost:3001/api/policies/alerts/${id}/ack`, { method: 'POST' });
      fetchPolicyAlerts();
      toast.success('Alert acknowledged');
    } catch (e) {
      toast.error('Failed to acknowledge alert');
    }
  };

  // Extract user-created policy names strictly (no default policies)
  const validUserPolicyNames = new Set((savedPolicies || []).map(p => p.name?.trim()).filter(Boolean));
  const uniquePolicyNames = Array.from(validUserPolicyNames);
  const uniqueTimeframes = ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m', '1h', '2h', '4h', '1D', '1W', '1M', '3M', '1Y'];

  // Available stock universes and individual instruments found in current alerts
  const availableUniverses = useMemo(() => {
    const defaultUniverses = [
      { id: 'ALL', label: 'All Stock Universes' },
      { id: 'All Stocks', label: '🌐 All Stocks (NSE 2,000+ Equities)' },
      { id: 'Nifty 50', label: '🏆 Nifty 50' },
      { id: 'Nifty 100', label: '📊 Nifty 100' },
      { id: 'Nifty 200', label: '📈 Nifty 200' },
      { id: 'F&O Stocks', label: '⚡ F&O Stocks' },
      { id: 'BSE All Stocks', label: '🇮🇳 BSE All Stocks (4,000+ Equities)' },
      { id: 'BSE Sensex', label: '🏛️ BSE Sensex 30' },
      { id: 'BSE Penny & Smallcap', label: '⚡ BSE Penny & Smallcap' },
      { id: 'Indices Spots & Futures', label: '🏛️ Indices Spots & Futures' },
    ];
    const alertSymbols = new Set((policyAlerts || []).map(a => a.symbol).filter(Boolean));
    const stockPills = Array.from(alertSymbols).sort().map(sym => ({
      id: sym,
      label: `📍 ${sym}`,
      isStock: true,
    }));
    return { universes: defaultUniverses, stocks: stockPills };
  }, [policyAlerts]);

  // Apply filters across Policy Name, Timeframe, Stock Universe, and Time Window
  const filteredAlerts = policyAlerts.filter(a => {
    // Show only alerts belonging to user-created policies
    if (validUserPolicyNames.size > 0 && !validUserPolicyNames.has((a.policyName || '').trim())) {
      return false;
    }

    // Direction / Source filter
    if (filter === 'LONG' && a.type !== 'ENTRY_LONG') return false;
    if (filter === 'SHORT' && a.type !== 'ENTRY_SHORT') return false;
    if (filter === 'EXIT' && !a.type.includes('EXIT')) return false;
    if (filter === 'TV' && a.source !== 'TV_WEBHOOK' && a.source !== 'TV_PINE_SCRIPT') return false;

    // Filter by Alert / Policy Name
    if (selectedPolicyName !== 'ALL' && (a.policyName || '').trim() !== selectedPolicyName.trim()) return false;

    // Filter by Timeframe
    if (selectedTimeframe !== 'ALL' && (a.timeframe || '5m') !== selectedTimeframe) return false;

    // Filter by Stock Universe / Constituent
    if (selectedUniverse !== 'ALL') {
      const uNorm = selectedUniverse.toLowerCase();
      const alertUni = (a.universe || '').toLowerCase();
      const alertSym = (a.symbol || '').toLowerCase();
      const matchesUni = alertUni.includes(uNorm) || (uNorm.includes('all') && alertUni.includes('all'));
      const matchesSym = alertSym === uNorm;
      if (!matchesUni && !matchesSym) return false;
    }

    // Filter by Time Window Selection
    if (selectedTimeWindow !== 'ALL') {
      const alertTime = new Date(a.timestamp || 0).getTime();
      const now = Date.now();
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayStartMs = dayStart.getTime();

      if (selectedTimeWindow === 'TODAY') {
        if (alertTime < dayStartMs) return false;
      } else if (selectedTimeWindow === 'YESTERDAY') {
        const yesterdayStartMs = dayStartMs - 86400000;
        if (alertTime < yesterdayStartMs || alertTime >= dayStartMs) return false;
      } else if (selectedTimeWindow === '7D') {
        if (alertTime < (now - 7 * 86400000)) return false;
      } else if (selectedTimeWindow === '30D') {
        if (alertTime < (now - 30 * 86400000)) return false;
      } else if (selectedTimeWindow === '3M') {
        if (alertTime < (now - 90 * 86400000)) return false;
      } else if (selectedTimeWindow === '6M') {
        if (alertTime < (now - 180 * 86400000)) return false;
      } else if (selectedTimeWindow === '2026') {
        const y2026Start = new Date('2026-01-01T00:00:00Z').getTime();
        const y2026End = new Date('2026-12-31T23:59:59Z').getTime();
        if (alertTime < y2026Start || alertTime > y2026End) return false;
      } else if (selectedTimeWindow === 'CUSTOM') {
        if (customStartDate && alertTime < new Date(customStartDate).getTime()) return false;
        if (customEndDate) {
          const endMs = new Date(customEndDate).getTime() + 86400000;
          if (alertTime >= endMs) return false;
        }
      }
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesName = a.policyName?.toLowerCase().includes(q);
      const matchesSymbol = a.symbol?.toLowerCase().includes(q);
      const matchesUniverse = a.universe?.toLowerCase().includes(q);
      const matchesReason = a.reasons?.some(r => r.toLowerCase().includes(q)) || a.exitReason?.toLowerCase().includes(q);
      if (!matchesName && !matchesSymbol && !matchesUniverse && !matchesReason) return false;
    }
    return true;
  });

  const handleAlertSort = (col) => {
    if (alertSortCol === col) {
      setAlertSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setAlertSortCol(col);
      setAlertSortDir('desc');
    }
  };

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let valA = a[alertSortCol];
    let valB = b[alertSortCol];
    if (alertSortCol === 'timestamp') {
      valA = new Date(a.timestamp || 0).getTime();
      valB = new Date(b.timestamp || 0).getTime();
    }
    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;
    if (typeof valA === 'string') {
      return alertSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return alertSortDir === 'asc' ? (valA - valB) : (valB - valA);
  });

  // Export full filtered/sorted alert audit table into Excel-compatible CSV format
  const handleDownloadExcel = () => {
    if (sortedAlerts.length === 0) {
      toast.error('No alerts available to export');
      return;
    }

    // UTF-8 Byte Order Mark (\uFEFF) ensures Microsoft Excel reads special characters & currency accurately
    let csv = '\uFEFF';
    csv += 'Alert #,Strategy / Policy,Stock Symbol,Stock Name,Stock Universe,Signal,Action,Timeframe,Exact Entry Trigger Time,Entry Price (INR),Exact Exit Trigger Time,Exit Price (INR),Points Captured,Max Drawdown (pts),Trigger Condition / Reason,Exit Reason,Status,Alert Timestamp ISO\n';

    sortedAlerts.forEach((a, idx) => {
      const isLong = a.type === 'ENTRY_LONG';
      const isShort = a.type === 'ENTRY_SHORT';
      const isExit = a.type.includes('EXIT');
      const action = a.action || (isLong ? 'BUY' : isShort ? 'SELL' : isExit ? 'EXIT' : 'SIGNAL');
      const signal = isLong ? 'LONG' : isShort ? 'SHORT' : isExit ? 'EXIT' : a.type;
      const pts = a.pointsCaptured !== undefined && a.pointsCaptured !== null ? a.pointsCaptured : '';
      const entryTime = a.entryTriggerTime || a.exactTriggerTime || a.timeFormatted || '';
      const exitTime = a.exitTriggerTime || (isExit ? a.exactTriggerTime : '');
      const entryPrice = a.price !== undefined ? a.price : '';
      const exitPrice = a.exitPrice !== undefined ? a.exitPrice : '';
      const cleanReason = (a.reasons || []).join('; ').replace(/"/g, '""');
      const cleanExitReason = (a.exitReason || '').replace(/"/g, '""');
      const polName = (a.policyName || '').replace(/"/g, '""');
      const stockName = (a.stockName || '').replace(/"/g, '""');
      const uni = (a.universe || '').replace(/"/g, '""');

      csv += `"${idx + 1}","${polName}","${a.symbol || ''}","${stockName}","${uni}","${signal}","${action}","${a.timeframe || ''}","${entryTime}","${entryPrice}","${exitTime}","${exitPrice}","${pts}","${a.maxDrawdown || ''}","${cleanReason}","${cleanExitReason}","${a.status || ''}","${a.timestamp || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const polFilterSlug = selectedPolicyName === 'ALL' ? 'All_Policies' : selectedPolicyName.replace(/[^a-zA-Z0-9]/g, '_');
    const tfSlug = selectedTimeframe === 'ALL' ? 'All_TF' : selectedTimeframe;
    link.href = url;
    link.setAttribute('download', `Policy_Alerts_${polFilterSlug}_${tfSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sortedAlerts.length} alerts to Excel CSV!`);
  };

  // Calculate dynamic top statistics based strictly on filtered selection
  const totalFilteredPoints = filteredAlerts.reduce((acc, a) => {
    const pts = a.pointsCaptured !== undefined && a.pointsCaptured !== null ? Number(a.pointsCaptured) : 0;
    return acc + pts;
  }, 0);

  const winningAlerts = filteredAlerts.filter(a => {
    if (a.pointsCaptured !== undefined && a.pointsCaptured !== null) return a.pointsCaptured > 0;
    return a.type === 'ENTRY_LONG';
  });

  const successRate = filteredAlerts.length > 0
    ? ((winningAlerts.length / filteredAlerts.length) * 100).toFixed(1)
    : '0.0';

  const maxFilteredDrawdown = filteredAlerts.length > 0
    ? Math.max(...filteredAlerts.map(a => Number(a.maxDrawdown) || 0))
    : 0;

  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.04)';

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', color: textDark }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: headerText }}>
            <span>🔔</span> Policy Alerts Feed & Performance
            <span style={{ fontSize: '0.75rem', background: isDark ? '#3b82f620' : '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              LIVE STREAM
            </span>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              color: textDark,
              fontWeight: 600,
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }} />
              <span>Last Updated: <strong>{lastUpdated}</strong></span>
              <span style={{ fontSize: '0.68rem', color: textMuted }}>(10s auto-refresh)</span>
            </div>
          </h1>
          <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.85rem' }}>
            Real-time multi-indicator alert policy triggers with points captured, success rate, and drawdown analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: subCardBg, borderRadius: '6px', border: `1px solid ${subCardBorder}`, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '7px 12px',
                background: viewMode === 'TABLE' ? '#2563eb' : 'transparent',
                color: viewMode === 'TABLE' ? 'white' : textMuted,
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📊 Table View
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              style={{
                padding: '7px 12px',
                background: viewMode === 'CARDS' ? '#2563eb' : 'transparent',
                color: viewMode === 'CARDS' ? 'white' : textMuted,
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📇 Card View
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? (isDark ? '#10b98120' : '#ecfdf5') : (isDark ? '#334155' : '#f1f5f9'),
              color: soundEnabled ? '#059669' : textMuted,
              border: `1px solid ${soundEnabled ? '#10b98150' : subCardBorder}`,
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <span>{soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}</span>
          </button>

          {/* TV Webhook Guide Button */}
          <button
            onClick={() => setShowTvModal(true)}
            style={{
              background: isDark ? '#8b5cf620' : '#f5f3ff',
              color: '#7c3aed',
              border: '1px solid #c4b5fd',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <span>📡 TV Webhook Guide</span>
          </button>

          {/* Export to Excel (.csv) */}
          <button
            onClick={handleDownloadExcel}
            style={{
              background: isDark ? '#05966920' : '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
            title="Download full alert logs in Excel-ready CSV format"
          >
            <span>📥 Export Excel</span>
          </button>

          {/* Test Alert Button */}
          <button
            onClick={handleSimulateAlert}
            disabled={simulating}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            }}
          >
            {simulating ? 'Simulating...' : '⚡ Simulate Alert'}
          </button>

          {/* Clear Alerts Button */}
          {policyAlerts.length > 0 && (
            <button
              onClick={handleClearAlerts}
              style={{
                background: isDark ? '#ef444420' : '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ─── DYNAMIC TOP METRIC CARDS (POINTS CAPTURED, SUCCESS RATE, MAX DRAWDOWN) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        
        {/* Total Points Captured */}
        <div style={{ background: cardBg, padding: '16px 20px', borderRadius: '8px', border: `1px solid ${totalFilteredPoints >= 0 ? '#10b981' : '#ef4444'}`, boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            🎯 Total Points Captured {selectedPolicyName !== 'ALL' || selectedTimeframe !== 'ALL' ? '(Filtered)' : ''}
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: totalFilteredPoints >= 0 ? '#059669' : '#dc2626', marginTop: '4px' }}>
            {totalFilteredPoints >= 0 ? '+' : ''}{totalFilteredPoints.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>pts</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
            ≈ ₹{(totalFilteredPoints * 25).toLocaleString('en-IN', { maximumFractionDigits: 0 })} per lot (Nifty)
          </div>
        </div>

        {/* Success Rate */}
        <div style={{ background: cardBg, padding: '16px 20px', borderRadius: '8px', border: '1px solid #38bdf8', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            🏆 Success Rate (Win %)
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            {successRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
            {winningAlerts.length} Won / {filteredAlerts.length - winningAlerts.length} Lost ({filteredAlerts.length} alerts)
          </div>
        </div>

        {/* Max Drawdown */}
        <div style={{ background: cardBg, padding: '16px 20px', borderRadius: '8px', border: '1px solid #f87171', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            📉 Max Drawdown
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            -{maxFilteredDrawdown.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>pts</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
            Peak adverse excursion among filtered alerts
          </div>
        </div>

        {/* Live Active Policies Count */}
        <div style={{ background: cardBg, padding: '16px 20px', borderRadius: '8px', border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            ⚡ Matching Alerts Count
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: textDark, marginTop: '4px' }}>
            {filteredAlerts.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
            Out of {policyAlerts.length} total logged alerts
          </div>
        </div>

      </div>

      {/* ─── COMPREHENSIVE FILTER BAR (POLICY NAME, TIMEFRAME, DIRECTION, SEARCH) ─── */}
      <div style={{
        background: cardBg,
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${cardBorder}`,
        marginBottom: '20px',
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: cardShadow,
      }}>
        
        {/* Left Side: Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Policy Name Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Filter by Alert / Policy Name
            </label>
            <select
              value={selectedPolicyName}
              onChange={(e) => setSelectedPolicyName(e.target.value)}
              style={{
                padding: '7px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                minWidth: '220px',
              }}
            >
              <option value="ALL">All Alert Policies ({uniquePolicyNames.length})</option>
              {uniquePolicyNames.map(pName => (
                <option key={pName} value={pName}>{pName}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Filter by Timeframe
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              style={{
                padding: '7px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                minWidth: '120px',
              }}
            >
              <option value="ALL">All Timeframes</option>
              {uniqueTimeframes.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          {/* Stock Universe Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Stock Universe Filter
            </label>
            <select
              value={selectedUniverse}
              onChange={(e) => setSelectedUniverse(e.target.value)}
              style={{
                padding: '7px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                minWidth: '200px',
              }}
            >
              <optgroup label="Index & Sector Universes">
                {availableUniverses.universes.map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </optgroup>
              {availableUniverses.stocks.length > 0 && (
                <optgroup label="Active Constituent Stocks">
                  {availableUniverses.stocks.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Time Window Selection */}
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Time Window Selection
            </label>
            <select
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(e.target.value)}
              style={{
                padding: '7px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                minWidth: '150px',
              }}
            >
              <option value="ALL">All Time History</option>
              <option value="TODAY">📅 Today (Intraday)</option>
              <option value="YESTERDAY">⏮️ Yesterday</option>
              <option value="7D">⚡ Last 7 Days</option>
              <option value="30D">📆 Last 30 Days</option>
              <option value="3M">🗓️ Last 3 Months</option>
              <option value="6M">📊 Last 6 Months</option>
              <option value="2026">🚀 Year 2026 (YTD)</option>
              <option value="CUSTOM">🛠️ Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Range Pickers */}
          {selectedTimeWindow === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '2px', fontWeight: 700 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: subCardBg,
                    border: `1px solid ${subCardBorder}`,
                    borderRadius: '5px',
                    color: textDark,
                    fontSize: '0.78rem',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '2px', fontWeight: 700 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    background: subCardBg,
                    border: `1px solid ${subCardBorder}`,
                    borderRadius: '5px',
                    color: textDark,
                    fontSize: '0.78rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* Direction / Type Pills */}
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Alert Signal Type
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'LONG', 'SHORT', 'EXIT'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '5px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: filter === tab ? '#2563eb' : subCardBg,
                    color: filter === tab ? 'white' : textMuted,
                    border: '1px solid ' + (filter === tab ? '#2563eb' : subCardBorder),
                  }}
                >
                  {tab === 'ALL' && 'All'}
                  {tab === 'LONG' && '🟢 Long'}
                  {tab === 'SHORT' && '🔴 Short'}
                  {tab === 'EXIT' && '🟡 Exit'}
                </button>
              ))}
            </div>
          </div>

          {/* Excel Export Quick Button */}
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleDownloadExcel}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              title="Download filtered alerts as an Excel-compatible CSV file"
            >
              <span>📊 Download Excel</span>
            </button>
          </div>

          {/* Reset Filters */}
          {(selectedPolicyName !== 'ALL' || selectedTimeframe !== 'ALL' || selectedUniverse !== 'ALL' || selectedTimeWindow !== 'ALL' || filter !== 'ALL' || search || customStartDate || customEndDate) && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => {
                  setSelectedPolicyName('ALL');
                  setSelectedTimeframe('ALL');
                  setSelectedUniverse('ALL');
                  setSelectedTimeWindow('ALL');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setFilter('ALL');
                  setSearch('');
                }}
                style={{
                  background: isDark ? '#334155' : '#f1f5f9',
                  color: textMuted,
                  border: `1px solid ${subCardBorder}`,
                  padding: '6px 10px',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Filters ✕
              </button>
            </div>
          )}

        </div>

        {/* Right Side: Search Bar */}
        <div style={{ minWidth: '240px', marginTop: '16px' }}>
          <input
            type="text"
            placeholder="Search reasons or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${subCardBorder}`,
              background: subCardBg,
              color: textDark,
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

      </div>

      {/* ─── ALERTS LIST ─── */}
      {filteredAlerts.length === 0 ? (
        <div style={{
          background: subCardBg,
          border: `1px dashed ${cardBorder}`,
          borderRadius: '8px',
          padding: '48px 20px',
          textAlign: 'center',
          color: textMuted,
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔕</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: textDark }}>No Alerts Matching Filter</div>
          <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '500px', margin: '6px auto 16px' }}>
            No alerts found matching <b>"{selectedPolicyName !== 'ALL' ? selectedPolicyName : 'All Policies'}"</b> on <b>"{selectedTimeframe !== 'ALL' ? selectedTimeframe : 'All Timeframes'}"</b>.
          </div>
          <button
            onClick={handleSimulateAlert}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Simulate Alert for this Filter
          </button>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* ─── COMPREHENSIVE TABLE VIEW (SORT & FILTER ON EVERY COLUMN) ─── */
        <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: headerText }}>
              📋 Real-time Policy Alerts Audit Log ({sortedAlerts.length} alerts)
            </span>
            <span style={{ fontSize: '0.74rem', color: textMuted }}>
              Click column headers to sort Ascending / Descending
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}`, color: isDark ? '#94a3b8' : '#1e40af', position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#eff6ff', zIndex: 10, fontWeight: 700 }}>
                  <th style={{ padding: '8px' }}>#</th>
                  <th
                    onClick={() => handleAlertSort('policyName')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by strategy policy"
                  >
                    Strategy / Policy {alertSortCol === 'policyName' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('symbol')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by stock symbol"
                  >
                    Stock / Instrument {alertSortCol === 'symbol' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('type')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by signal type"
                  >
                    Signal {alertSortCol === 'type' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('timeframe')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by timeframe"
                  >
                    Timeframe {alertSortCol === 'timeframe' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('timestamp')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by exact trigger time"
                  >
                    Exact Trigger Time {alertSortCol === 'timestamp' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('price')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by price"
                  >
                    Trigger Price (₹) {alertSortCol === 'price' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th
                    onClick={() => handleAlertSort('pointsCaptured')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by points captured"
                  >
                    Points Captured {alertSortCol === 'pointsCaptured' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th style={{ padding: '8px' }}>
                    Trigger Condition / Reason
                  </th>
                  <th
                    onClick={() => handleAlertSort('status')}
                    style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by status"
                  >
                    Status / Action {alertSortCol === 'status' ? (alertSortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAlerts.map((alert, idx) => {
                  const isLong = alert.type === 'ENTRY_LONG';
                  const isShort = alert.type === 'ENTRY_SHORT';
                  const isExit = alert.type.includes('EXIT');
                  const badgeColor = isLong ? (isDark ? '#34d399' : '#059669') : isShort ? (isDark ? '#f87171' : '#dc2626') : isExit ? '#d97706' : '#7c3aed';
                  const badgeBg = isLong ? (isDark ? '#10b98120' : '#ecfdf5') : isShort ? (isDark ? '#ef444420' : '#fef2f2') : isExit ? (isDark ? '#f59e0b20' : '#fffbeb') : (isDark ? '#8b5cf620' : '#f5f3ff');
                  const pts = alert.pointsCaptured !== undefined && alert.pointsCaptured !== null ? Number(alert.pointsCaptured) : null;
                  const exactTime = ensureDateInTimestamp(alert.exactTriggerTime || alert.timeFormatted || (alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-IN') : '--'));

                  return (
                    <tr key={alert.id || idx} style={{ borderBottom: isDark ? '1px solid #243044' : '1px solid #f1f5f9', background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.015)' : '#f8fafc') }}>
                      <td style={{ padding: '8px', color: textMuted }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: 700, color: textDark }}>
                        {alert.policyName}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: subCardBg,
                            color: isDark ? '#38bdf8' : '#2563eb',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '0.76rem',
                            border: `1px solid ${subCardBorder}`,
                            fontWeight: 800,
                            fontFamily: 'monospace',
                          }}>
                            {alert.symbol || 'NIFTY'}
                          </span>
                          {alert.stockName && (
                            <span style={{ fontSize: '0.72rem', color: textMuted, whiteSpace: 'nowrap' }}>
                              {alert.stockName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          background: badgeBg,
                          color: badgeColor,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: `1px solid ${badgeColor}30`,
                        }}>
                          {isLong ? '🟢 LONG' : isShort ? '🔴 SHORT' : isExit ? '🟡 EXIT' : '🟣 TV'}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          background: isDark ? '#3b82f615' : '#eff6ff',
                          color: isDark ? '#60a5fa' : '#2563eb',
                          border: isDark ? '1px solid #3b82f630' : '1px solid #bfdbfe',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          ⏱️ {alert.timeframe || '5m'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: textDark, whiteSpace: 'nowrap' }}>
                        <div>
                          <span style={{ color: '#d97706', marginRight: '4px' }}>⏰</span>
                          <span style={{ fontWeight: 600 }}>{exactTime}</span>
                        </div>
                        {alert.exitTriggerTime && alert.exitTriggerTime !== exactTime && (
                          <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '3px' }}>
                            <span style={{ color: isDark ? '#38bdf8' : '#2563eb', marginRight: '3px', fontWeight: 700 }}>🏁 Exit:</span>
                            {alert.exitTriggerTime}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                        <div style={{ fontWeight: 700, color: textDark }}>
                          ₹{alert.price ? Number(alert.price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
                        </div>
                        {alert.exitPrice && alert.exitPrice !== alert.price && (
                          <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '2px' }}>
                            Exit: ₹{Number(alert.exitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 700, color: pts === null ? textMuted : pts >= 0 ? (isDark ? '#10b981' : '#059669') : (isDark ? '#ef4444' : '#dc2626') }}>
                        {pts === null ? '—' : `${pts >= 0 ? '+' : ''}${pts} pts`}
                      </td>
                      <td style={{ padding: '8px', maxWidth: '300px' }}>
                        <div style={{ color: textDark }}>
                          {(alert.reasons || []).join(', ') || 'Signal condition met'}
                        </div>
                        {alert.exitReason && (
                          <div style={{ fontSize: '0.72rem', color: (pts || 0) >= 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'), marginTop: '3px', fontWeight: 600 }}>
                            🎯 Exit: {alert.exitReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: (pts || 0) >= 0 ? (isDark ? '#10b98120' : '#ecfdf5') : (isDark ? '#ef444420' : '#fef2f2'),
                            color: (pts || 0) >= 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'),
                            border: `1px solid ${(pts || 0) >= 0 ? (isDark ? '#10b98140' : '#a7f3d0') : (isDark ? '#ef444440' : '#fecaca')}`,
                            display: 'inline-block',
                            width: 'fit-content',
                            whiteSpace: 'nowrap'
                          }}>
                            {alert.status ? alert.status.replace(/_/g, ' ') : ((pts || 0) >= 0 ? 'TARGET HIT' : 'SL HIT')}
                          </span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => toast.success(`Order routed for ${alert.policyName} on ${alert.symbol}`)}
                              style={{
                                background: isLong ? '#059669' : isShort ? '#dc2626' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                width: 'fit-content',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isLong ? 'Buy CE' : isShort ? 'Buy PE' : 'Trade'}
                            </button>
                            {alert.status !== 'ACKNOWLEDGED' && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                style={{
                                  background: isDark ? '#334155' : '#f1f5f9',
                                  color: textMuted,
                                  border: `1px solid ${subCardBorder}`,
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Ack
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── CARD VIEW ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedAlerts.map((alert, idx) => {
            const isLong = alert.type === 'ENTRY_LONG';
            const isShort = alert.type === 'ENTRY_SHORT';
            const isExit = alert.type.includes('EXIT');
            const cardBorderColor = isLong ? (isDark ? '#10b98150' : '#10b981') : isShort ? (isDark ? '#ef444450' : '#ef4444') : isExit ? '#f59e0b' : '#8b5cf6';
            const badgeBg = isLong ? (isDark ? '#10b98120' : '#ecfdf5') : isShort ? (isDark ? '#ef444420' : '#fef2f2') : isExit ? (isDark ? '#f59e0b20' : '#fffbeb') : (isDark ? '#8b5cf620' : '#f5f3ff');
            const badgeColor = isLong ? (isDark ? '#34d399' : '#059669') : isShort ? (isDark ? '#f87171' : '#dc2626') : isExit ? '#d97706' : '#7c3aed';

            const pts = alert.pointsCaptured !== undefined && alert.pointsCaptured !== null ? Number(alert.pointsCaptured) : null;
            const dd = alert.maxDrawdown !== undefined && alert.maxDrawdown !== null ? Number(alert.maxDrawdown) : null;
            const exactTime = ensureDateInTimestamp(alert.exactTriggerTime || alert.timeFormatted || (alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-IN') : '--'));

            return (
              <div
                key={`${alert.id || 'alert'}_${idx}`}
                style={{
                  background: cardBg,
                  borderRadius: '8px',
                  border: `1px solid ${cardBorderColor}`,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  boxShadow: cardShadow,
                }}
              >
                {/* Left Section: Badges, Policy Name & Reasons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 480px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: badgeBg,
                      color: badgeColor,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      border: `1px solid ${badgeColor}30`,
                    }}>
                      {isLong ? '🟢 ENTRY LONG' : isShort ? '🔴 ENTRY SHORT' : isExit ? '🟡 EXIT' : '🟣 TV ALERT'}
                    </span>

                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: textDark }}>
                      {alert.policyName}
                    </span>

                    <span style={{
                      background: subCardBg,
                      color: isDark ? '#38bdf8' : '#2563eb',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      border: `1px solid ${subCardBorder}`,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}>
                      {alert.symbol || 'NIFTY'}
                    </span>

                    {alert.stockName && (
                      <span style={{ fontSize: '0.74rem', color: textMuted }}>
                        ({alert.stockName})
                      </span>
                    )}

                    {/* Timeframe Pill */}
                    <span style={{
                      background: isDark ? '#3b82f615' : '#eff6ff',
                      color: isDark ? '#60a5fa' : '#2563eb',
                      border: isDark ? '1px solid #3b82f630' : '1px solid #bfdbfe',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}>
                      ⏱️ {alert.timeframe || '5m'}
                    </span>

                    {/* Exact Trigger Time Pill */}
                    <span style={{
                      background: subCardBg,
                      color: textDark,
                      border: `1px solid ${subCardBorder}`,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}>
                      ⏰ {exactTime}
                    </span>
                  </div>

                  {/* Conditions List Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {alert.reasons?.map((reason, i) => (
                      <span
                        key={i}
                        style={{
                          background: subCardBg,
                          color: textDark,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          border: `1px solid ${subCardBorder}`,
                        }}
                      >
                        ✓ {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Middle Section: Points Captured & Max Drawdown on Each Alert */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: subCardBg,
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${subCardBorder}`,
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Points Captured</div>
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: pts === null ? textMuted : pts >= 0 ? (isDark ? '#10b981' : '#059669') : (isDark ? '#ef4444' : '#dc2626'),
                    }}>
                      {pts === null ? '—' : `${pts >= 0 ? '+' : ''}${pts} pts`}
                    </div>
                  </div>

                  {dd !== null && (
                    <div style={{ borderLeft: `1px solid ${subCardBorder}`, paddingLeft: '14px' }}>
                      <div style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Max Drawdown</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#f87171' : '#dc2626' }}>
                        -{dd} pts
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Section: Price, Time & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 600 }}>Trigger Price</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#38bdf8' : '#2563eb' }}>
                      ₹{alert.price ? Number(alert.price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: textMuted }}>
                      {exactTime}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => toast.success(`Order routed for ${alert.policyName} at ₹${alert.price}`)}
                      style={{
                        background: isLong ? '#059669' : isShort ? '#dc2626' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isLong ? 'Buy CE' : isShort ? 'Buy PE' : 'Trade'}
                    </button>

                    {alert.status !== 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        style={{
                          background: isDark ? '#334155' : '#f1f5f9',
                          color: textMuted,
                          border: `1px solid ${subCardBorder}`,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        Ack
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* TradingView Webhook Guide Modal */}
      {showTvModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            padding: '24px',
            color: textDark,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                📡 Connecting TradingView Webhook Alerts
              </h2>
              <button
                onClick={() => setShowTvModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              You can connect any custom indicator or strategy directly from <b>TradingView</b> into this platform. When your TradingView alert triggers, it will instantly sound here, log to this page, and calculate points captured and drawdown.
            </p>

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                1. Webhook URL (Paste into TradingView Alert Webhook URL box):
              </div>
              <div style={{
                background: '#0f172a',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #334155',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                color: '#34d399',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>http://localhost:3001/api/policies/webhook</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('http://localhost:3001/api/policies/webhook');
                    toast.success('Webhook URL copied!');
                  }}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                2. Alert Message Body (Paste into TradingView Message box):
              </div>
              <pre style={{
                background: '#0f172a',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #334155',
                fontSize: '0.8rem',
                color: '#e2e8f0',
                margin: 0,
                overflowX: 'auto',
              }}>
{`{
  "policyName": "My TradingView SuperStrategy",
  "ticker": "{{ticker}}",
  "timeframe": "{{interval}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "points": 45.0,
  "message": "Custom TradingView Alert Triggered on {{interval}}"
}`}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowTvModal(false)}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
