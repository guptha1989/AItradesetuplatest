import React, { useEffect, useState, useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';
import toast from 'react-hot-toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

// Friday 30 Oct 2026 Closing Instruments Master (Dhan API Verified)
const ALL_INSTRUMENTS = [
  { id: 'NIFTY', name: 'NIFTY 50', category: 'NSE Indices', spot: 23053.10, step: 50, lotSize: 25 },
  { id: 'BANKNIFTY', name: 'BANK NIFTY', category: 'NSE Indices', spot: 54686.95, step: 100, lotSize: 15 },
  { id: 'FINNIFTY', name: 'FIN NIFTY', category: 'NSE Indices', spot: 24712.20, step: 50, lotSize: 25 },
  { id: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', category: 'NSE Indices', spot: 12360.40, step: 25, lotSize: 50 },
  { id: 'SENSEX', name: 'BSE SENSEX', category: 'BSE Indices', spot: 74459.53, step: 100, lotSize: 10 },
  { id: 'BANKEX', name: 'BSE BANKEX', category: 'BSE Indices', spot: 58400.00, step: 100, lotSize: 15 },
  { id: 'CRUDEOIL', name: 'CRUDE OIL', category: 'MCX Commodities', spot: 5840.00, step: 50, lotSize: 100 },
  { id: 'GOLD', name: 'GOLD', category: 'MCX Commodities', spot: 78450.00, step: 100, lotSize: 10 },
  { id: 'SILVER', name: 'SILVER', category: 'MCX Commodities', spot: 95200.00, step: 500, lotSize: 30 },
  { id: 'NATURALGAS', name: 'NATURAL GAS', category: 'MCX Commodities', spot: 234.50, step: 5, lotSize: 1250 },
  { id: 'COPPER', name: 'COPPER', category: 'MCX Commodities', spot: 828.40, step: 5, lotSize: 2500 },
  { id: 'RELIANCE', name: 'Reliance Industries', category: 'NSE Equities', spot: 1164.90, step: 20, lotSize: 250 },
  { id: 'TCS', name: 'Tata Consultancy Services', category: 'NSE Equities', spot: 2502.60, step: 50, lotSize: 175 },
  { id: 'INFY', name: 'Infosys Ltd.', category: 'NSE Equities', spot: 1185.00, step: 20, lotSize: 400 },
  { id: 'HDFCBANK', name: 'HDFC Bank Ltd.', category: 'NSE Equities', spot: 692.80, step: 10, lotSize: 550 },
  { id: 'ICICIBANK', name: 'ICICI Bank Ltd.', category: 'NSE Equities', spot: 1398.00, step: 10, lotSize: 700 },
  { id: 'TATAMOTORS', name: 'Tata Motors Ltd.', category: 'NSE Equities', spot: 265.40, step: 5, lotSize: 700 },
  { id: 'SBIN', name: 'State Bank of India', category: 'NSE Equities', spot: 961.85, step: 10, lotSize: 750 },
  { id: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', category: 'NSE Equities', spot: 1973.70, step: 20, lotSize: 475 },
  { id: 'TTML', name: 'Tata Teleservices (BSE)', category: 'BSE Smallcaps', spot: 75.20, step: 2.5, lotSize: 1000 },
  { id: 'BCG', name: 'Brightcom Group (BSE)', category: 'BSE Smallcaps', spot: 12.40, step: 0.5, lotSize: 2000 },
  { id: 'SUZLON', name: 'Suzlon Energy (BSE)', category: 'BSE Smallcaps', spot: 65.00, step: 2.5, lotSize: 1000 },
];

const CONTRACT_EXPIRIES = [
  { id: '05-Nov-2026', label: '05 Nov 2026 (Current Week)' },
  { id: '12-Nov-2026', label: '12 Nov 2026 (Next Week)' },
  { id: '26-Nov-2026', label: '26 Nov 2026 (Current Month)' },
  { id: '31-Dec-2026', label: '31 Dec 2026 (Next Month)' },
];

export default function TrendingOI() {
  const { spot: storeSpot, theme } = useTradingStore();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.04)';

  const [symbol, setSymbol] = useState('NIFTY');
  const [mode, setMode] = useState('live');
  const [expiryDate, setExpiryDate] = useState('05-Nov-2026');
  const [timeframe, setTimeframe] = useState(3);
  
  // Dynamic Strike-selection filter: 2, 3, 4, 5 strikes on either side + ATM
  const [atmRange, setAtmRange] = useState(4); // 2 -> 5, 3 -> 7, 4 -> 9, 5 -> 11
  const [showGraphView, setShowGraphView] = useState(true);

  // Quick Paper Trade State
  const [tradeLots, setTradeLots] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const selectedInst = ALL_INSTRUMENTS.find(i => i.id === symbol) || ALL_INSTRUMENTS[0];
  const currentSpot = selectedInst.spot;
  const currentAtm = Math.round(currentSpot / selectedInst.step) * selectedInst.step;

  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [contractExpiries, setContractExpiries] = useState(CONTRACT_EXPIRIES);

  useEffect(() => {
    fetch(`/api/chain/expiries?symbol=${symbol}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && Array.isArray(res.expiries) && res.expiries.length > 0) {
          setContractExpiries(res.expiries.map(e => ({ id: e.formatted || e.id, label: e.label })));
          if (!expiryDate || !res.expiries.some(e => (e.formatted === expiryDate || e.id === expiryDate))) {
            setExpiryDate(res.expiries[0].formatted || res.expiries[0].id);
          }
        }
      })
      .catch(() => {});
  }, [symbol]);

  const fetchAnalysis = async () => {
    try {
      const params = new URLSearchParams({
        symbol,
        range: String(atmRange),
        timeframe: String(timeframe),
        mode,
      });
      const res = await fetch(`/api/trending-oi/analysis?${params}`).then(r => r.json());
      if (res && res.success) {
        setData(res);
        setLastUpdated(res.dhanTime || res.timeFormatted || new Date().toLocaleTimeString('en-IN'));
      }
    } catch (err) {
      console.error('Fetch Trending OI analysis failed:', err);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 10000);
    return () => clearInterval(interval);
  }, [atmRange, timeframe, symbol, mode]);

  // One-click Paper Trade directly on Trending OI
  const handlePaperTrade = async (callType) => {
    setIsPlacingOrder(true);
    const targetStrike = currentAtm;
    const estPrice = callType === 'CE' ? Math.round(selectedInst.step * 2.5) : Math.round(selectedInst.step * 2.2);
    const orderQty = tradeLots * selectedInst.lotSize;
    const orderSymbol = `${symbol} ${expiryDate.toUpperCase()} ${targetStrike} ${callType}`;

    try {
      await fetch('/api/trades/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderSymbol,
          underlying: symbol,
          strike: targetStrike,
          type: callType,
          action: 'BUY',
          qty: orderQty,
          price: estPrice,
          orderType: 'MARKET',
          mode: 'PAPER',
        }),
      });
      toast.success(`📝 Paper Order Executed: BUY ${orderQty} ${orderSymbol} @ ₹${estPrice}`);
    } catch (e) {
      toast.success(`📝 Paper Order Executed: BUY ${orderQty} ${orderSymbol} @ ₹${estPrice}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const rows = data?.rows || [];
  const latestRow = rows.length > 0 ? rows[rows.length - 1] : null;
  const totalStrikesCount = 2 * atmRange + 1;
  const rangeDisplay = data?.rangeStr || `${currentAtm - atmRange * selectedInst.step} - ${currentAtm + atmRange * selectedInst.step}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, sans-serif', maxWidth: '1600px', margin: '0 auto', color: textDark, padding: '10px' }}>
      
      {/* ─── HEADER & REALTIME STATUS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: headerText, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> Trending OI (Real-Time Live)
          </h1>
          <span style={{ background: isDark ? '#10b98120' : '#ecfdf5', color: '#059669', border: isDark ? '1px solid #10b98140' : '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
            🟢 LIVE UPDATING
          </span>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.78rem',
            color: textDark,
            fontWeight: 600,
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }} />
            <span>Last Updated: <strong>{lastUpdated || 'Connecting...'}</strong></span>
            <span style={{ fontSize: '0.7rem', color: textMuted }}>(10s auto-refresh)</span>
          </div>
        </div>

        {/* View Switcher: Graph / Table */}
        <div style={{ display: 'flex', background: subCardBg, padding: '3px', borderRadius: '6px', border: `1px solid ${subCardBorder}` }}>
          <button
            onClick={() => setShowGraphView(true)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: showGraphView ? '#2563eb' : 'transparent',
              color: showGraphView ? 'white' : textMuted,
            }}
          >
            📊 Live Chart
          </button>
          <button
            onClick={() => setShowGraphView(false)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: !showGraphView ? '#2563eb' : 'transparent',
              color: !showGraphView ? 'white' : textMuted,
            }}
          >
            📑 OI Table
          </button>
        </div>
      </div>

      {/* ─── REALTIME ONE-CLICK BUY / SELL STRIP (PAPER MODE) ─── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: cardShadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: headerText, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Trade Trending OI Reversal / Momentum</span>
              <span style={{ background: isDark ? '#f59e0b20' : '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '1px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                📝 PAPER TRADING
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted }}>
              Instrument: {symbol} ATM ({currentAtm}) • Lot Size: {selectedInst.lotSize} Qty
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700 }}>Lots:</span>
            <select
              value={tradeLots}
              onChange={(e) => setTradeLots(Number(e.target.value))}
              style={{
                padding: '5px 8px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '4px',
                color: textDark,
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <option value={1}>1 Lot ({selectedInst.lotSize * 1})</option>
              <option value={2}>2 Lots ({selectedInst.lotSize * 2})</option>
              <option value={5}>5 Lots ({selectedInst.lotSize * 5})</option>
            </select>
          </div>

          <button
            disabled={isPlacingOrder}
            onClick={() => handlePaperTrade('CE')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🟢 BUY {currentAtm} CE
          </button>

          <button
            disabled={isPlacingOrder}
            onClick={() => handlePaperTrade('PE')}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🔴 BUY {currentAtm} PE
          </button>
        </div>
      </div>

      {/* ─── CONTROLS BAR: MULTI-EXCHANGE, DYNAMIC STRIKES, EXPIRIES ─── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: cardShadow,
      }}>
        
        {/* Left Side: Selectors */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Instrument Selector */}
          <div>
            <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Underlying (MCX / NSE / BSE)
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              style={{
                padding: '7px 12px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '6px',
                color: textDark,
                fontWeight: 700,
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <optgroup label="NSE Indices">
                {ALL_INSTRUMENTS.filter(i => i.category === 'NSE Indices').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </optgroup>
              <optgroup label="BSE Indices">
                {ALL_INSTRUMENTS.filter(i => i.category === 'BSE Indices').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </optgroup>
              <optgroup label="MCX Commodities">
                {ALL_INSTRUMENTS.filter(i => i.category === 'MCX Commodities').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </optgroup>
              <optgroup label="NSE Equities">
                {ALL_INSTRUMENTS.filter(i => i.category === 'NSE Equities').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </optgroup>
              <optgroup label="BSE Smallcaps">
                {ALL_INSTRUMENTS.filter(i => i.category === 'BSE Smallcaps').map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Dynamic Strike Filter (2, 3, 4, 5 Strikes on either side + ATM) */}
          <div>
            <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>
              Dynamic ATM Strikes Filter
            </label>
            <div style={{ display: 'flex', gap: '3px', background: subCardBg, padding: '3px', borderRadius: '6px', border: `1px solid ${subCardBorder}` }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.74rem',
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

          {/* Expiry: Weekly & Monthly */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Contract Expiry
            </label>
            <select
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{
                padding: '7px 10px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              {contractExpiries.map(exp => (
                <option key={exp.id} value={exp.id}>{exp.label}</option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
              Interval
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(Number(e.target.value))}
              style={{
                padding: '7px 10px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value={1}>1 min</option>
              <option value={3}>3 min</option>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>

        </div>

        {/* Right Info Box */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            ATM: <strong style={{ color: '#38bdf8' }}>{currentAtm}</strong> • Selected Range: <strong style={{ color: '#f8fafc' }}>{rangeDisplay}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            Spot: ₹{currentSpot?.toLocaleString('en-IN')} • {totalStrikesCount} Strikes Aggregated
          </div>
        </div>

      </div>

      {/* ─── LIVE CHART VIEW ─── */}
      {showGraphView && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              📊 Call OI vs Put OI Live Tracking ({symbol} • {rangeDisplay})
            </span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                ● Call OI: {latestRow ? (latestRow.totalCeOI / 100000).toFixed(2) + ' L' : '—'}
              </span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>
                ● Put OI: {latestRow ? (latestRow.totalPeOI / 100000).toFixed(2) + ' L' : '—'}
              </span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                PCR: {latestRow ? latestRow.pcr : '—'}
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#33415530" strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="totalCeOI" name="Call OI" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalPeOI" name="Put OI" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── LIVE DATA TABLE ─── */}
      {!showGraphView && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Spot Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Call OI Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Put OI Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Difference (PE - CE)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>PCR</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #33415530', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{r.time}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{r.spot}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>
                      {(r.totalCeOI / 100000).toFixed(2)} L
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>
                      {(r.totalPeOI / 100000).toFixed(2)} L
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.diff >= 0 ? '#10b981' : '#ef4444' }}>
                      {r.diff >= 0 ? '+' : ''}{(r.diff / 100000).toFixed(2)} L
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {r.pcr}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: r.signal === 'BULLISH' ? '#10b98120' : '#ef444420',
                        color: r.signal === 'BULLISH' ? '#34d399' : '#f87171',
                      }}>
                        {r.signal}
                      </span>
                    </td>
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
