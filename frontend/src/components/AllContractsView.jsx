import { useEffect, useState, useMemo } from 'react';
import { useTradingStore } from '../store/tradingStore';

const API_BASE = 'http://localhost:3001/api';

export default function AllContractsView() {
  const { spot, optionChain: storeChain, lastChainUpdate } = useTradingStore();

  const [symbol, setSymbol] = useState('NIFTY');
  const [instrumentType, setInstrumentType] = useState('Index Options');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [optionType, setOptionType] = useState('ALL');
  const [strikeFilter, setStrikeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [expiries, setExpiries] = useState(['04-Aug-2026', '11-Aug-2026', '18-Aug-2026', '25-Aug-2026', '01-Sep-2026']);
  const [contracts, setContracts] = useState([]);
  const [parameters, setParameters] = useState({
    tickSize: '0.05',
    volumeFreezeQuantity: '1,801',
    underlyingValue: spot || 24614.90,
  });
  const [loading, setLoading] = useState(false);

  // Default sorting state: Strike price ascending
  const [sortConfig, setSortConfig] = useState({ field: 'strike', dir: 'asc' });

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbol,
        expiry: selectedExpiry,
        optionType,
        strike: strikeFilter !== 'ALL' ? strikeFilter : '',
        instrumentType,
      });
      const res = await fetch(`${API_BASE}/market/all-contracts?${params}`).then(r => r.json());
      if (res.contracts) {
        setContracts(res.contracts);
        setParameters(res.parameters || {});
        if (res.expiries && res.expiries.length > 0) {
          setExpiries(res.expiries);
          if (!selectedExpiry) setSelectedExpiry(res.expiries[0]);
        }
      }
    } catch (err) {
      console.error('Fetch all contracts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    const timer = setInterval(() => {
      fetchContracts();
    }, 30000);
    return () => clearInterval(timer);
  }, [symbol, selectedExpiry, optionType, strikeFilter, instrumentType]);

  // Update underlying spot dynamically from Zustand store
  const liveSpot = spot || parameters.underlyingValue || 24614.90;

  // Realtime updates over WebSocket for option chain
  useEffect(() => {
    if (storeChain && storeChain.length > 0 && contracts.length > 0) {
      setContracts(prev => prev.map(c => {
        const found = storeChain.find(r => r.strike === c.strike);
        if (!found) return c;
        const isCE = c.option === 'CE';
        const ltp = isCE ? (found.ceLTP || c.last) : (found.peLTP || c.last);
        const prevClose = isCE ? (found.cePrev || c.prevClose) : (found.pePrev || c.prevClose);
        const change = parseFloat((ltp - prevClose).toFixed(2));
        const changePercent = prevClose > 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
        const volume = isCE ? (found.ceVolume || c.volume) : (found.peVolume || c.volume);
        const valueLakhs = parseFloat((((ltp || 10) * volume * 25) / 100000).toFixed(2));

        return {
          ...c,
          last: ltp,
          prevClose,
          change,
          changePercent,
          volume,
          valueLakhs,
        };
      }));
    }
  }, [storeChain, spot]);

  // Sort handler
  const handleSort = (field) => {
    let dir = 'asc';
    if (sortConfig.field === field && sortConfig.dir === 'asc') {
      dir = 'desc';
    }
    setSortConfig({ field, dir });
  };

  // Filter, Pair Pinning, and Ascending Sort
  const processedContracts = useMemo(() => {
    let list = [...contracts];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.strike.toString().includes(q) ||
        c.option.toLowerCase().includes(q) ||
        c.expiryDate.toLowerCase().includes(q)
      );
    }

    // Default sorting / custom sorting
    if (sortConfig.field === 'strike') {
      // Pin 09:16 AM CE Pairs on top when sorting by strike
      const pinnedPairs = list.filter(c => c.is0916CEPair && c.option === 'CE');
      const regularContracts = list.filter(c => !(c.is0916CEPair && c.option === 'CE'));

      pinnedPairs.sort((a, b) => sortConfig.dir === 'asc' ? a.strike - b.strike : b.strike - a.strike);
      regularContracts.sort((a, b) => sortConfig.dir === 'asc' ? a.strike - b.strike : b.strike - a.strike);

      return [...pinnedPairs, ...regularContracts];
    } else if (sortConfig.field) {
      list.sort((a, b) => {
        let valA = a[sortConfig.field];
        let valB = b[sortConfig.field];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB?.toString().toLowerCase() || '';
        }

        if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [contracts, searchQuery, sortConfig]);

  const allStrikesList = useMemo(() => {
    const set = new Set(contracts.map(c => c.strike));
    return Array.from(set).sort((a, b) => a - b);
  }, [contracts]);

  const handleClear = () => {
    setOptionType('ALL');
    setStrikeFilter('ALL');
    setSearchQuery('');
    if (expiries.length > 0) setSelectedExpiry(expiries[0]);
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return sortConfig.dir === 'asc'
      ? <span style={{ color: '#38bdf8', marginLeft: '4px', fontWeight: 800 }}>▲</span>
      : <span style={{ color: '#38bdf8', marginLeft: '4px', fontWeight: 800 }}>▼</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Page Header Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px' }}>
        <button style={{
          padding: '8px 20px',
          border: 'none',
          borderBottom: '3px solid #3b82f6',
          background: 'transparent',
          color: '#3b82f6',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}>
          All Contracts
        </button>
        <button style={{
          padding: '8px 20px',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}>
          Historical Data
        </button>
      </div>

      {/* Dual Top Banners: 09:16 AM IST and 09:17 AM IST Locked CE Pairs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* 09:16 AM CE Pair Banner */}
        {parameters.pair0916 && (
          <div style={{
            padding: '12px 18px',
            background: 'linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(59,130,246,0.12) 100%)',
            border: '1px solid rgba(234,179,8,0.4)',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fef08a' }}>
                ⭐ 09:16 AM IST LOCKED CE PAIR
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Strikes: <strong style={{ color: '#38bdf8' }}>{parameters.pair0916.strikeA} CE</strong> (₹{parameters.pair0916.openA}) & <strong style={{ color: '#38bdf8' }}>{parameters.pair0916.strikeB} CE</strong> (₹{parameters.pair0916.openB})
              </div>
            </div>
            <span style={{ background: 'rgba(234,179,8,0.2)', color: '#fef08a', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              09:16 AM IST
            </span>
          </div>
        )}

        {/* 09:17 AM CE Pair Banner */}
        {parameters.pair0917 && (
          <div style={{
            padding: '12px 18px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(16,185,129,0.12) 100%)',
            border: '1px solid rgba(168,85,247,0.4)',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e9d5ff' }}>
                ⭐ 09:17 AM IST LOCKED CE PAIR
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Strikes: <strong style={{ color: '#34d399' }}>{parameters.pair0917.strikeA} CE</strong> (₹{parameters.pair0917.openA}) & <strong style={{ color: '#34d399' }}>{parameters.pair0917.strikeB} CE</strong> (₹{parameters.pair0917.openB})
              </div>
            </div>
            <span style={{ background: 'rgba(168,85,247,0.2)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              09:17 AM IST
            </span>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
        Contract Parameters
      </h2>

      {/* 2. Top Parameter Banner Cards matching NSE India layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Tick Size : </span>
          <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>0.05</strong>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Volume Freeze Quantity : </span>
          <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>1,801</strong>
        </div>
        <div className="card" style={{ padding: '14px 18px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Underlying Value : </span>
          <strong className="font-mono" style={{ fontSize: '1.15rem', color: '#38bdf8', fontWeight: 800 }}>
            {liveSpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* 3. Filter Controls Bar matching NSE screenshot */}
      <div className="card" style={{ padding: '16px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Symbol Select */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
          </select>

          {/* Instrument Type Select */}
          <select
            value={instrumentType}
            onChange={(e) => setInstrumentType(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <option value="Index Options">Index Options</option>
            <option value="Index Futures">Index Futures</option>
          </select>

          {/* Expiry Date Select */}
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid #3b82f6',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            {expiries.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>

          {/* Option Type Select */}
          <select
            value={optionType}
            onChange={(e) => setOptionType(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <option value="ALL">Option Type ∨ (All)</option>
            <option value="CE">CE (Calls)</option>
            <option value="PE">PE (Puts)</option>
          </select>

          {/* Strike Price Select */}
          <select
            value={strikeFilter}
            onChange={(e) => setStrikeFilter(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <option value="ALL">Strike Price ∨ (All)</option>
            {allStrikesList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Search Filter Input */}
          <input
            type="text"
            placeholder="Search strike / option..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.82rem',
              width: '180px',
            }}
          />

          {/* Action Buttons */}
          <button
            onClick={fetchContracts}
            disabled={loading}
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
            {loading ? '⏳ Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* 4. Data Table matching NSE India exact columns and sortability */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{
                background: '#1e1b4b',
                color: '#f8fafc',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '2px solid rgba(255,255,255,0.1)',
              }}>
                <th style={{ padding: '10px 8px', width: '50px', textAlign: 'center' }}>TRADE INFO.</th>
                <th style={{ padding: '10px 10px', textAlign: 'left' }}>INSTRUMENT TYPE</th>
                
                <th onClick={() => handleSort('expiryDate')} style={{ padding: '10px 10px', cursor: 'pointer', userSelect: 'none' }}>
                  EXPIRY DATE {getSortIcon('expiryDate')}
                </th>
                <th onClick={() => handleSort('option')} style={{ padding: '10px 10px', cursor: 'pointer', userSelect: 'none' }}>
                  OPTION {getSortIcon('option')}
                </th>
                <th onClick={() => handleSort('strike')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  STRIKE {getSortIcon('strike')}
                </th>
                
                <th onClick={() => handleSort('open')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  OPEN {getSortIcon('open')}
                </th>
                <th onClick={() => handleSort('high')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  HIGH {getSortIcon('high')}
                </th>
                <th onClick={() => handleSort('low')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  LOW {getSortIcon('low')}
                </th>
                <th onClick={() => handleSort('close')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  CLOSE {getSortIcon('close')}
                </th>
                <th onClick={() => handleSort('prevClose')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  PREV. CLOSE {getSortIcon('prevClose')}
                </th>
                <th onClick={() => handleSort('last')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none', color: '#38bdf8' }}>
                  LAST {getSortIcon('last')}
                </th>
                <th onClick={() => handleSort('change')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  CHNG {getSortIcon('change')}
                </th>
                <th onClick={() => handleSort('changePercent')} style={{ padding: '10px 8px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  %CHNG {getSortIcon('changePercent')}
                </th>
                <th onClick={() => handleSort('volume')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  VOLUME (CONTRACTS) {getSortIcon('volume')}
                </th>
                <th onClick={() => handleSort('valueLakhs')} style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                  VALUE (₹ Lakhs) {getSortIcon('valueLakhs')}
                </th>
                
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>INTRADAY CHART</th>
              </tr>
            </thead>
            <tbody>
              {processedContracts.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {loading ? '⏳ Loading contracts data...' : 'No contracts available for the selected parameters.'}
                  </td>
                </tr>
              ) : (
                processedContracts.map((c) => {
                  const isPositive = c.change >= 0;
                  const chgColor = isPositive ? '#10b981' : '#ef4444';
                  const is16 = c.is0916CEPair && c.option === 'CE';
                  const is17 = c.is0917CEPair && c.option === 'CE';

                  return (
                    <tr key={c.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.82rem',
                      background: is16 ? 'rgba(234, 179, 8, 0.12)' : is17 ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                    }}>
                      
                      {/* Trade Info */}
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        {is16 ? (
                          <span style={{ background: '#eab308', color: '#000', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            ⭐ 09:16 CE Pair
                          </span>
                        ) : is17 ? (
                          <span style={{ background: '#a855f7', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            ⭐ 09:17 CE Pair
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}>i</span>
                        )}
                      </td>

                      {/* Instrument Type */}
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.instrumentType}</td>

                      {/* Expiry Date */}
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.expiryDate}</td>

                      {/* Option Type */}
                      <td style={{ fontWeight: 700, color: c.option === 'CE' ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                        {c.option}
                      </td>

                      {/* Strike Price */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {c.strike.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Open */}
                      <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {c.open.toFixed(2)}
                      </td>

                      {/* High */}
                      <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {c.high.toFixed(2)}
                      </td>

                      {/* Low */}
                      <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {c.low.toFixed(2)}
                      </td>

                      {/* Close */}
                      <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {c.close.toFixed(2)}
                      </td>

                      {/* Prev Close */}
                      <td className="font-mono" style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {c.prevClose.toFixed(2)}
                      </td>

                      {/* Last (LTP) */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {c.last.toFixed(2)}
                      </td>

                      {/* Chng */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: chgColor }}>
                        {isPositive ? '+' : ''}{c.change.toFixed(2)}
                      </td>

                      {/* %Chng */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700, color: chgColor }}>
                        {isPositive ? '+' : ''}{c.changePercent.toFixed(2)}
                      </td>

                      {/* Volume */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {c.volume.toLocaleString('en-IN')}
                      </td>

                      {/* Value (Lakhs) */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {c.valueLakhs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Intraday Chart */}
                      <td style={{ textAlign: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                        📊
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
