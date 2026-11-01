import React, { useState, useEffect, useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';
import toast from 'react-hot-toast';

export default function OICrossoverView() {
  const { wsConnected, theme } = useTradingStore();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.04)';

  const [mode, setMode] = useState('LIVE'); // 'LIVE' | 'HISTORICAL'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Filters
  const [crossoverFilter, setCrossoverFilter] = useState('ALL'); // 'ALL' | 'BULL' | 'BEAR'
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [crossFilter, setCrossFilter] = useState('ANY'); // 'ANY' | 'MIN_5' | 'MIN_10' | 'MIN_15'
  const [search, setSearch] = useState('');
  const [atmRange, setAtmRange] = useState(4); // 2 -> 5 strikes, 3 -> 7 strikes, 4 -> 9 strikes, 5 -> 11 strikes
  
  // Sorting
  const [sortCol, setSortCol] = useState('crossCount');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  
  // Modal / Detail state for 9 strikes inspection
  const [selectedStockDetail, setSelectedStockDetail] = useState(null);

  // Fetch OI Crossover data from backend with proxy and timeout protection
  const fetchData = async () => {
    try {
      const queryParams = `sector=${sectorFilter}&crossover=${crossoverFilter}&range=${atmRange}&mode=${mode.toLowerCase()}`;
      
      let res = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch(`/api/oi-crossover?${queryParams}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (resp.ok) res = await resp.json();
      } catch (e) {}

      if (!res || !res.success) {
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 2500);
          const resp2 = await fetch(`http://localhost:3001/api/oi-crossover?${queryParams}`, { signal: controller2.signal });
          clearTimeout(timeoutId2);
          if (resp2.ok) res = await resp2.json();
        } catch (e) {}
      }

      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setData(res.data);
        setLastUpdated(res.timeFormatted || new Date().toLocaleTimeString('en-IN'));
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [mode, sectorFilter, crossoverFilter, atmRange]);

  // Filtered & Sorted list
  const filteredData = useMemo(() => {
    let result = [...data];

    // Crossover Filter (Bull: PE > CE; Bear: CE > PE)
    if (crossoverFilter === 'BULL') {
      result = result.filter(d => d.crossover === 'BULL');
    } else if (crossoverFilter === 'BEAR') {
      result = result.filter(d => d.crossover === 'BEAR');
    }

    // Cross Count Filter
    if (crossFilter === 'MIN_5') result = result.filter(d => d.crossCount >= 5);
    else if (crossFilter === 'MIN_10') result = result.filter(d => d.crossCount >= 10);
    else if (crossFilter === 'MIN_15') result = result.filter(d => d.crossCount >= 15);

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(d => 
        (d.symbol && d.symbol.toLowerCase().includes(q)) || 
        (d.name && d.name.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'callOI') { valA = a.callOIRaw; valB = b.callOIRaw; }
      else if (sortCol === 'putOI') { valA = a.putOIRaw; valB = b.putOIRaw; }
      else if (sortCol === 'pcr') { valA = Number(a.pcr) || 0; valB = Number(b.pcr) || 0; }
      else if (sortCol === 'crossCount') { valA = Number(a.crossCount) || 0; valB = Number(b.crossCount) || 0; }
      else if (sortCol === 'callOIChg') { valA = a.callOIChg || 0; valB = b.callOIChg || 0; }
      else if (sortCol === 'putOIChg') { valA = a.putOIChg || 0; valB = b.putOIChg || 0; }

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA - valB) : (valB - valA);
    });

    return result;
  }, [data, crossoverFilter, crossFilter, search, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    let csv = '\uFEFF';
    csv += 'Symbol,Company Name,Crossover Signal,Call OI,Put OI,PCR,Call OI Chg,Put OI Chg,Crossover Time,Cross Count,Realtime ATM,Strikes Range (ATM ± 4)\n';
    
    filteredData.forEach(d => {
      csv += `"${d.symbol}","${(d.name || '').replace(/"/g, '""')}","${d.crossover}","${d.callOILabel}","${d.putOILabel}","${d.pcr}","${d.callOIChgLabel}","${d.putOIChgLabel}","${d.crossoverTime}","${d.crossCount}","${d.atm}","${d.strikesRange}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OI_Crossover_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredData.length} symbols to CSV!`);
  };

  const totalBulls = data.filter(d => d.crossover === 'BULL').length;
  const totalBears = data.filter(d => d.crossover === 'BEAR').length;
  const avgPcr = data.length > 0 ? (data.reduce((acc, d) => acc + (d.pcr || 1), 0) / data.length).toFixed(2) : '1.00';

  return (
    <div style={{ padding: '24px', maxWidth: '1750px', margin: '0 auto', color: textDark }}>
      
      {/* ─── HEADER BAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>⚡</span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: headerText }}>
              OI Crossover
            </h1>
            <span style={{
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
              color: '#2563eb',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              ATM ± 4 STRIKES • REAL-TIME
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.84rem' }}>
            Live intraday Put-Call Open Interest crossover tracking across all NSE & BSE stocks and indices. Buy when PE OI crosses over CE OI; Sell when CE OI crosses over PE OI.
          </p>
        </div>

        {/* Top Actions: Live Timestamp & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            color: textDark,
            boxShadow: cardShadow,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }} />
            <span style={{ fontWeight: 600 }}>{lastUpdated || 'Connecting...'}</span>
          </div>

          <button
            onClick={handleExportCSV}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* ─── SUMMARY SCORECARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: cardBg, border: `1px solid ${isDark ? '#10b98140' : '#86efac'}`, padding: '14px 18px', borderRadius: '10px', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>🟢 Bullish Crossovers (Buy)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {totalBulls} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textMuted }}>stocks (PE &gt; CE)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted }}>Put writers dominant in ATM ± 4 strikes</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${isDark ? '#ef444440' : '#fca5a5'}`, padding: '14px 18px', borderRadius: '10px', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>🔴 Bearish Crossovers (Sell)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {totalBears} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textMuted }}>stocks (CE &gt; PE)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted }}>Call writers dominant in ATM ± 4 strikes</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${isDark ? '#38bdf840' : '#93c5fd'}`, padding: '14px 18px', borderRadius: '10px', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>📊 Market Average PCR</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            {avgPcr}
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted }}>Across all {data.length} tracked equities</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${isDark ? '#8b5cf640' : '#d8b4fe'}`, padding: '14px 18px', borderRadius: '10px', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>🎯 Active Universe Coverage</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
            {filteredData.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textMuted }}>/ {data.length} Total</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: textMuted }}>NSE Equities, BSE 4000+, Indices & F&O</div>
        </div>
      </div>

      {/* ─── FILTER CONTROLS BAR (MATCHING IMAGE 1) ─── */}
      <div style={{
        background: cardBg,
        padding: '16px 20px',
        borderRadius: '10px',
        border: `1px solid ${cardBorder}`,
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: cardShadow,
      }}>
        {/* Left Side: Mode & Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Mode: Live / Historical */}
          <div style={{ display: 'flex', background: subCardBg, padding: '3px', borderRadius: '6px', border: `1px solid ${subCardBorder}` }}>
            <button
              onClick={() => setMode('LIVE')}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: mode === 'LIVE' ? '#2563eb' : 'transparent',
                color: mode === 'LIVE' ? 'white' : textMuted,
              }}
            >
              Live
            </button>
            <button
              onClick={() => setMode('HISTORICAL')}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: mode === 'HISTORICAL' ? '#2563eb' : 'transparent',
                color: mode === 'HISTORICAL' ? 'white' : textMuted,
              }}
            >
              Historical
            </button>
          </div>

          {/* Dynamic ATM Strikes Filter (IMAGE 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 600 }}>
              Dynamic ATM Strikes Filter
            </span>
            <div style={{
              display: 'flex',
              background: subCardBg,
              padding: '3px',
              borderRadius: '6px',
              border: `1px solid ${subCardBorder}`,
              gap: '3px',
            }}>
              {[
                { num: 2, label: '±2 (5 strikes)' },
                { num: 3, label: '±3 (7 strikes)' },
                { num: 4, label: '±4 (9 strikes)' },
                { num: 5, label: '±5 (11 strikes)' },
              ].map(({ num, label }) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAtmRange(num)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: atmRange === num ? '#2563eb' : 'transparent',
                    color: atmRange === num ? 'white' : textMuted,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Crossover Filter */}
          <select
            value={crossoverFilter}
            onChange={(e) => setCrossoverFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: subCardBg,
              border: `1px solid ${subCardBorder}`,
              borderRadius: '6px',
              color: textDark,
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Crossovers</option>
            <option value="BULL">🟢 Bullish Only (PE &gt; CE - Buy)</option>
            <option value="BEAR">🔴 Bearish Only (CE &gt; PE - Sell)</option>
          </select>

          {/* Any Cross Filter */}
          <select
            value={crossFilter}
            onChange={(e) => setCrossFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: subCardBg,
              border: `1px solid ${subCardBorder}`,
              borderRadius: '6px',
              color: textDark,
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ANY">Any Cross</option>
            <option value="MIN_5">Cross Count &ge; 5</option>
            <option value="MIN_10">Cross Count &ge; 10</option>
            <option value="MIN_15">Cross Count &ge; 15</option>
          </select>

          {/* Sector / Universe Filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: subCardBg,
              border: `1px solid ${subCardBorder}`,
              borderRadius: '6px',
              color: isDark ? '#60a5fa' : '#2563eb',
              fontWeight: 600,
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Sector: All Universes</option>
            <option value="NIFTY_50">🏆 Nifty 50</option>
            <option value="FNO_STOCKS">⚡ F&amp;O Stocks</option>
            <option value="BSE_ALL">🇮🇳 BSE All Stocks</option>
            <option value="BSE_SENSEX">🏛️ BSE Sensex 30</option>
            <option value="BSE_PENNY_SMALLCAP">⚡ BSE Smallcap &amp; Penny</option>
            <option value="INDICES">🏛️ Major Indices</option>
          </select>

          {/* Reset Filters */}
          {(crossoverFilter !== 'ALL' || sectorFilter !== 'ALL' || crossFilter !== 'ANY' || search) && (
            <button
              onClick={() => {
                setCrossoverFilter('ALL');
                setSectorFilter('ALL');
                setCrossFilter('ANY');
                setSearch('');
              }}
              style={{
                background: subCardBg,
                color: textMuted,
                border: `1px solid ${subCardBorder}`,
                padding: '6px 10px',
                borderRadius: '5px',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Reset Filters ✕
            </button>
          )}
        </div>

        {/* Right Side: Search Symbol Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textMuted }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search symbol (e.g. HCLTECH, TCS, INFY)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
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

      {/* ─── DATA TABLE (MATCHING IMAGE 1) ─── */}
      <div style={{ background: cardBg, borderRadius: '10px', border: `1px solid ${cardBorder}`, overflow: 'hidden', boxShadow: cardShadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: isDark ? '#0f172a' : '#eff6ff', color: isDark ? '#94a3b8' : '#1e40af', borderBottom: `1px solid ${cardBorder}`, userSelect: 'none' }}>
                <th onClick={() => handleSort('symbol')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600 }}>
                  Symbol {sortCol === 'symbol' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('crossover')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}>
                  Crossover {sortCol === 'crossover' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('callOI')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'right' }}>
                  Call OI {sortCol === 'callOI' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('putOI')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'right' }}>
                  Put OI {sortCol === 'putOI' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('pcr')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'right' }}>
                  PCR {sortCol === 'pcr' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('callOIChg')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'right' }}>
                  Call OI Chg {sortCol === 'callOIChg' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('putOIChg')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'right' }}>
                  Put OI Chg {sortCol === 'putOIChg' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('crossoverTime')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}>
                  Crossover Time {sortCol === 'crossoverTime' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th onClick={() => handleSort('crossCount')} style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}>
                  Cross Count {sortCol === 'crossCount' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                  ATM ± 4 Strikes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🔄 Calculating Realtime ATM &amp; OI Crossovers...</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Selecting ATM (Least |CE - PE| difference) + 4 and - 4 strikes across NSE &amp; BSE universe</div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No instruments match the selected crossover filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const isBull = row.crossover === 'BULL';
                  return (
                    <tr
                      key={row.symbol}
                      style={{
                        borderBottom: `1px solid ${cardBorder}`,
                        background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.01)' : '#f8fafc'),
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(59, 130, 246, 0.06)' : '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.01)' : '#f8fafc')}
                    >
                      {/* Symbol */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: subCardBg,
                            border: `1px solid ${subCardBorder}`,
                            color: isDark ? '#38bdf8' : '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                          }}>
                            {row.symbol}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: textDark, fontWeight: 600 }}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Crossover Badge (BULL / BEAR) */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 14px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          background: isBull ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2'),
                          color: isBull ? '#059669' : '#dc2626',
                          border: `1px solid ${isBull ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0') : (isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca')}`,
                        }}>
                          {isBull ? 'BULL' : 'BEAR'}
                        </span>
                      </td>

                      {/* Call OI */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: textDark }}>
                        {row.callOILabel}
                      </td>

                      {/* Put OI */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: textDark }}>
                        {row.putOILabel}
                      </td>

                      {/* PCR */}
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: row.pcr >= 1 ? '#059669' : '#dc2626',
                      }}>
                        {row.pcr?.toFixed(2)}
                      </td>

                      {/* Call OI Chg */}
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: row.callOIChg >= 0 ? '#059669' : '#dc2626',
                        fontWeight: 600,
                      }}>
                        {row.callOIChgLabel}
                      </td>

                      {/* Put OI Chg */}
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: row.putOIChg >= 0 ? '#059669' : '#dc2626',
                        fontWeight: 600,
                      }}>
                        {row.putOIChgLabel}
                      </td>

                      {/* Crossover Time */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: textMuted, fontSize: '0.8rem' }}>
                        ⏰ {row.crossoverTime}
                      </td>

                      {/* Cross Count */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: textDark, fontFamily: 'monospace' }}>
                        {row.crossCount}
                      </td>

                      {/* Inspect 9 strikes button */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedStockDetail(row)}
                          style={{
                            background: subCardBg,
                            color: isDark ? '#60a5fa' : '#2563eb',
                            border: `1px solid ${subCardBorder}`,
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Inspect the 9 strikes around realtime ATM"
                        >
                          ATM: {row.atm} ({row.strikesRange})
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: 9-STRIKES DETAIL & REALTIME ATM AUDIT ─── */}
      {selectedStockDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          padding: '20px',
        }}>
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            color: textDark,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: headerText, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> {selectedStockDetail.symbol} — {selectedStockDetail.name}
                </h3>
                <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.8rem' }}>
                  Realtime ATM Selection: <strong>{selectedStockDetail.atm}</strong> (Minimal |CE - PE| Difference: ₹{selectedStockDetail.atmDiff}) • 9 Strikes Tracked
                </p>
              </div>
              <button
                onClick={() => setSelectedStockDetail(null)}
                style={{
                  background: subCardBg,
                  color: textMuted,
                  border: `1px solid ${subCardBorder}`,
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: subCardBg, border: `1px solid ${subCardBorder}`, padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div>Signal: <strong style={{ color: selectedStockDetail.crossover === 'BULL' ? '#059669' : '#dc2626' }}>{selectedStockDetail.crossover} ({selectedStockDetail.crossoverAction})</strong></div>
              <div>Call OI Total: <strong>{selectedStockDetail.callOILabel}</strong></div>
              <div>Put OI Total: <strong>{selectedStockDetail.putOILabel}</strong></div>
              <div>PCR: <strong>{selectedStockDetail.pcr}</strong></div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#eff6ff', borderBottom: `1px solid ${cardBorder}`, color: isDark ? '#94a3b8' : '#1e40af' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Strike</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>CE LTP</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>PE LTP</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Call OI</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Put OI</th>
                </tr>
              </thead>
              <tbody>
                {(selectedStockDetail.strikes || []).map((s) => (
                  <tr
                    key={s.strike}
                    style={{
                      borderBottom: `1px solid ${cardBorder}`,
                      background: s.isATM ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: s.isATM ? 800 : 500, color: s.isATM ? '#2563eb' : textDark }}>
                      {s.strike} {s.isATM ? '⭐ ATM' : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.72rem', color: textMuted }}>
                      {s.strike === selectedStockDetail.atm ? 'ATM (Least |CE-PE|)' : s.strike < selectedStockDetail.atm ? 'ATM - Strike' : 'ATM + Strike'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: textDark }}>₹{s.ceLTP}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: textDark }}>₹{s.peLTP}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#0284c7' }}>{s.callOI?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{s.putOI?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

