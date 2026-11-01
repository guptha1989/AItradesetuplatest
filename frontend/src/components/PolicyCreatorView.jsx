import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { STOCK_UNIVERSES, INSTRUMENT_CATEGORIES, filterUniverses } from '../utils/instruments';
import { ConditionRow } from './ConditionRow';
import { useTradingStore } from '../store/tradingStore';



export default function PolicyCreatorView() {
  const { theme } = useTradingStore();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.04)';

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbol, setSymbol] = useState('All Stocks');
  const [selectedUniverses, setSelectedUniverses] = useState(['All Stocks']);
  const [timeframe, setTimeframe] = useState('5m');
  const [targetPoints, setTargetPoints] = useState(50);
  const [stopLossPoints, setStopLossPoints] = useState(25);
  const [trailingSL, setTrailingSL] = useState(15);
  const [enabled, setEnabled] = useState(true);
  const [autoTrade, setAutoTrade] = useState(false);
  const [soundAlert, setSoundAlert] = useState(true);

  // Instrument Modal / Selector State
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [instCategory, setInstCategory] = useState('ALL');
  const [instSearch, setInstSearch] = useState('');

  const handleToggleUniverse = (uniSymbol) => {
    setSelectedUniverses(prev => {
      let next;
      if (prev.includes(uniSymbol)) {
        if (prev.length === 1) return prev; // keep at least 1
        next = prev.filter(s => s !== uniSymbol);
      } else {
        next = [...prev, uniSymbol];
      }
      setSymbol(next.join(', '));
      return next;
    });
  };

  // Conditions
  const [longConditions, setLongConditions] = useState([]);
  const [longLogic, setLongLogic] = useState('AND'); // 'AND' | 'OR'
  const [shortConditions, setShortConditions] = useState([]);
  const [shortLogic, setShortLogic] = useState('AND'); // 'AND' | 'OR'
  const [exitLongConditions, setExitLongConditions] = useState([]);
  const [exitLogic, setExitLogic] = useState('OR'); // 'OR' | 'AND'

  // Custom TradingView Script State
  const [tvEnabled, setTvEnabled] = useState(false);
  const [tvExpression, setTvExpression] = useState('ta.crossover(close, ta.ema(close, 20)) and ta.rsi(close, 14) > 50');
  const [tvWebhookSecret, setTvWebhookSecret] = useState('tv_secret_default');

  // Backtest State
  const [btActiveDatePreset, setBtActiveDatePreset] = useState('FULL2026');
  const [btFromDate, setBtFromDate] = useState('2026-01-01');
  const [btToDate, setBtToDate] = useState('2026-11-01');
  const [btInitialCap, setBtInitialCap] = useState(100000);
  const [btRunning, setBtRunning] = useState(false);
  const [btResult, setBtResult] = useState(null);

  const applyBtDatePreset = (preset) => {
    setBtActiveDatePreset(preset);
    const end = new Date();
    let start = new Date();
    if (preset === '1M') start.setMonth(end.getMonth() - 1);
    if (preset === '3M') start.setMonth(end.getMonth() - 3);
    if (preset === '6M') start.setMonth(end.getMonth() - 6);
    if (preset === '1Y') start.setFullYear(end.getFullYear() - 1);
    if (preset === '3Y') start.setFullYear(end.getFullYear() - 3);
    if (preset === '5Y') start.setFullYear(end.getFullYear() - 5);
    if (preset === 'YTD') start = new Date(end.getFullYear(), 0, 1);
    if (preset === 'FULL2026') {
      setBtFromDate('2026-01-01');
      setBtToDate('2026-11-01');
      return;
    }
    const fmt = (d) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };
    setBtFromDate(fmt(start));
    setBtToDate(fmt(end));
  };

  // Active Tab: 'BUILDER' | 'TV_SCRIPT' | 'BACKTEST'
  const [activeTab, setActiveTab] = useState('BUILDER');
  const [btSortCol, setBtSortCol] = useState('entryTime');
  const [btSortDir, setBtSortDir] = useState('desc');
  const [btSearch, setBtSearch] = useState('');
  const [btTypeFilter, setBtTypeFilter] = useState('ALL');

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

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson('http://localhost:3001/api/policies');
      if (res.policies) {
        setPolicies(res.policies);
        if (!selectedPolicyId && res.policies.length > 0) {
          loadPolicyToForm(res.policies[0]);
        }
      }
    } catch (e) {
      toast.error('Failed to load policies: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPolicyToForm = (pol) => {
    setSelectedPolicyId(pol.id);
    setName(pol.name || '');
    setDescription(pol.description || '');
    const rawUnis = Array.isArray(pol.universes) && pol.universes.length > 0
      ? pol.universes
      : (pol.symbol ? pol.symbol.split(',').map(s => s.trim()).filter(Boolean) : ['All Stocks']);
    setSelectedUniverses(rawUnis);
    setSymbol(rawUnis.join(', '));
    setTimeframe(pol.timeframe || '5m');
    setTargetPoints(pol.targetPoints || 50);
    setStopLossPoints(pol.stopLossPoints || 25);
    setTrailingSL(pol.trailingSL || 15);
    setEnabled(pol.enabled !== undefined ? pol.enabled : true);
    setAutoTrade(!!pol.autoTrade);
    setSoundAlert(pol.soundAlert !== undefined ? pol.soundAlert : true);

    setLongConditions(pol.entryConditions?.long || []);
    setLongLogic(pol.entryConditions?.longLogic || 'AND');
    setShortConditions(pol.entryConditions?.short || []);
    setShortLogic(pol.entryConditions?.shortLogic || 'AND');
    setExitLongConditions(pol.exitConditions?.long || []);
    setExitLogic(pol.exitConditions?.longLogic || pol.exitConditions?.logic || 'OR');

    if (pol.customTradingViewScript) {
      setTvEnabled(!!pol.customTradingViewScript.enabled);
      setTvExpression(pol.customTradingViewScript.expression || '');
      setTvWebhookSecret(pol.customTradingViewScript.webhookSecret || 'tv_secret_123');
    }
  };

  const handleNewPolicy = () => {
    setSelectedPolicyId(null);
    setName('New Custom Alert Policy');
    setDescription('Confluence strategy with multiple indicators');
    setSelectedUniverses(['All Stocks']);
    setSymbol('All Stocks');
    setTimeframe('5m');
    setTargetPoints(50);
    setStopLossPoints(25);
    setTrailingSL(15);
    setEnabled(true);
    setAutoTrade(false);
    setSoundAlert(true);
    setLongConditions([
      { indicator: 'BOLLINGER', comparator: 'LOWER_BB_BELOW_LOWER_KC' },
      { indicator: 'RSI', period: 14, comparator: 'GREATER_THAN', value: 50 },
      { indicator: 'VWAP', comparator: 'PRICE_ABOVE' },
    ]);
    setShortConditions([
      { indicator: 'BOLLINGER', comparator: 'LOWER_BB_BELOW_ZERO' },
      { indicator: 'RSI', period: 14, comparator: 'LESS_THAN', value: 50 },
      { indicator: 'VWAP', comparator: 'PRICE_BELOW' },
    ]);
    setExitLongConditions([
      { indicator: 'DONCHIAN', period: 20, band: 'MIDDLE', comparator: 'PRICE_BELOW' },
    ]);
    setLongLogic('AND');
    setShortLogic('AND');
    setExitLogic('OR');
    setTvEnabled(false);
    setBtResult(null);
    setActiveTab('BUILDER');
  };

  const handleSavePolicy = async () => {
    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    const payload = {
      id: selectedPolicyId,
      name,
      description,
      symbol: selectedUniverses.join(', '),
      universes: selectedUniverses,
      timeframe,
      targetPoints: Number(targetPoints),
      stopLossPoints: Number(stopLossPoints),
      trailingSL: Number(trailingSL),
      enabled,
      autoTrade,
      soundAlert,
      entryConditions: {
        long: longConditions,
        longLogic,
        short: shortConditions,
        shortLogic,
      },
      exitConditions: {
        long: exitLongConditions,
        longLogic: exitLogic,
        short: [],
        shortLogic: 'OR',
      },
      customTradingViewScript: {
        enabled: tvEnabled,
        expression: tvExpression,
        webhookSecret: tvWebhookSecret,
      },
    };

    try {
      const res = await safeFetchJson('http://localhost:3001/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        toast.success(`Policy "${name}" saved!`);
        fetchPolicies();
        setSelectedPolicyId(res.policy.id);
      } else {
        toast.error('Failed to save policy: ' + res.error);
      }
    } catch (e) {
      toast.error('Save error: ' + e.message);
    }
  };

  const handleDeletePolicy = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this policy?')) return;
    try {
      const res = await safeFetchJson(`http://localhost:3001/api/policies/${id}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('Policy deleted');
        fetchPolicies();
      }
    } catch (err) {
      toast.error('Delete error: ' + err.message);
    }
  };

  const handleRunBacktest = async () => {
    setBtRunning(true);
    setActiveTab('BACKTEST');
    const selectedUni = STOCK_UNIVERSES.find(u => u.symbol.toLowerCase() === symbol.toLowerCase() || u.name.toLowerCase() === symbol.toLowerCase());
    const lotSize = selectedUni?.stockCount || 50;

    const policyPayload = {
      name,
      symbol,
      timeframe,
      targetPoints: Number(targetPoints),
      stopLossPoints: Number(stopLossPoints),
      trailingSL: Number(trailingSL),
      entryConditions: { long: longConditions, longLogic, short: shortConditions, shortLogic },
      exitConditions: { long: exitLongConditions, longLogic: exitLogic, short: [], shortLogic: 'OR' },
      customTradingViewScript: { enabled: tvEnabled, expression: tvExpression },
    };

    try {
      const res = await safeFetchJson('http://localhost:3001/api/policies/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: policyPayload,
          symbol,
          fromDate: btFromDate,
          toDate: btToDate,
          initialCapital: Number(btInitialCap),
          timeframe,
          lotSize,
        }),
      });

      if (res.success) {
        setBtResult(res);
        toast.success(`Backtest completed! Evaluated ${res.summary.candlesEvaluated} candles.`);
      } else {
        toast.error('Backtest error: ' + res.error);
      }
    } catch (e) {
      toast.error('Backtest request failed: ' + e.message);
    } finally {
      setBtRunning(false);
    }
  };

  // Condition Helpers
  const addCondition = (type) => {
    const defaultItem = {
      left: type === 'LONG' ? 'BB_LOWER' : (type === 'SHORT' ? 'BB_UPPER' : 'PRICE_CLOSE'),
      comparator: type === 'LONG' ? 'IS_BELOW' : 'IS_ABOVE',
      rightType: 'VALUE',
      rightValue: 0,
      rightIndicator: 'KC_LOWER',
    };
    if (type === 'LONG') setLongConditions([...longConditions, defaultItem]);
    if (type === 'SHORT') setShortConditions([...shortConditions, defaultItem]);
    if (type === 'EXIT') setExitLongConditions([...exitLongConditions, defaultItem]);
  };

  const removeCondition = (type, index) => {
    if (type === 'LONG') setLongConditions(longConditions.filter((_, i) => i !== index));
    if (type === 'SHORT') setShortConditions(shortConditions.filter((_, i) => i !== index));
    if (type === 'EXIT') setExitLongConditions(exitLongConditions.filter((_, i) => i !== index));
  };

  const updateCondition = (type, index, field, value) => {
    const updater = (list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    };
    if (type === 'LONG') setLongConditions(updater(longConditions));
    if (type === 'SHORT') setShortConditions(updater(shortConditions));
    if (type === 'EXIT') setExitLongConditions(updater(exitLongConditions));
  };

  // Filtered Stock Universes
  const displayedUniverses = filterUniverses(STOCK_UNIVERSES, instSearch, instCategory);
  const currentUniverse = STOCK_UNIVERSES.find(u => u.symbol.toLowerCase() === (symbol || '').toLowerCase() || u.id === symbol || u.name.toLowerCase() === (symbol || '').toLowerCase()) || { symbol: symbol || 'Nifty 50', name: symbol || 'Nifty 50', icon: '🏆', badge: 'Large Cap' };

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', color: textDark }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: headerText }}>
            <span>🛠️</span> Policy Creator & Multi-Indicator Backtester
          </h1>
          <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.85rem' }}>
            Design alert policies with Bollinger vs Keltner Squeeze, Donchian, RSI, ADX, MACD, EMA, VWAP, Volume, OI & TradingView scripts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleNewPolicy}
            style={{
              background: isDark ? '#334155' : '#f1f5f9',
              color: textDark,
              border: `1px solid ${subCardBorder}`,
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Create New Policy
          </button>

          <button
            onClick={handleSavePolicy}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(5,150,105,0.3)',
            }}
          >
            💾 Save Policy
          </button>

          <button
            onClick={handleRunBacktest}
            disabled={btRunning}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            }}
          >
            {btRunning ? '⏳ Backtesting...' : '🚀 Run Backtest'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Drawer (Policies) + Right Panel (Editor / Backtest) */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Saved Policies */}
        <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${cardBorder}`, padding: '16px', boxShadow: cardShadow }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: textMuted, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Saved Policies ({policies.length})</span>
            {loading && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Refreshing...</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '720px', overflowY: 'auto' }}>
            {policies.map(pol => {
              const isSelected = selectedPolicyId === pol.id;
              return (
                <div
                  key={pol.id}
                  onClick={() => loadPolicyToForm(pol)}
                  style={{
                    background: isSelected ? (isDark ? '#334155' : '#eff6ff') : subCardBg,
                    border: `1px solid ${isSelected ? '#2563eb' : subCardBorder}`,
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#2563eb' : textDark }}>
                      {pol.name}
                    </div>
                    <button
                      onClick={(e) => handleDeletePolicy(pol.id, e)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                      title="Delete Policy"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '4px', lineHeight: '1.3' }}>
                    {pol.description || 'No description provided'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', background: isDark ? '#3b82f620' : '#eff6ff', color: '#2563eb', border: isDark ? 'none' : '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {pol.symbol || 'NIFTY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', background: isDark ? '#10b98120' : '#ecfdf5', color: '#059669', border: isDark ? 'none' : '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {pol.timeframe || '5m'}
                    </span>
                    {pol.customTradingViewScript?.enabled && (
                      <span style={{ fontSize: '0.65rem', background: isDark ? '#8b5cf620' : '#f5f3ff', color: '#7c3aed', border: isDark ? 'none' : '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        TradingView
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Policy Builder & Backtest Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '12px' }}>
            <button
              onClick={() => setActiveTab('BUILDER')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'BUILDER' ? '#2563eb' : subCardBg,
                color: activeTab === 'BUILDER' ? 'white' : textMuted,
                border: '1px solid ' + (activeTab === 'BUILDER' ? '#2563eb' : subCardBorder),
              }}
            >
              📊 Multi-Indicator Rules Matrix
            </button>

            <button
              onClick={() => setActiveTab('TV_SCRIPT')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'TV_SCRIPT' ? '#7c3aed' : subCardBg,
                color: activeTab === 'TV_SCRIPT' ? 'white' : textMuted,
                border: '1px solid ' + (activeTab === 'TV_SCRIPT' ? '#7c3aed' : subCardBorder),
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🌲 Custom TradingView Pine Inbuilder</span>
              {tvEnabled && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />}
            </button>

            <button
              onClick={() => setActiveTab('BACKTEST')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'BACKTEST' ? '#059669' : subCardBg,
                color: activeTab === 'BACKTEST' ? 'white' : textMuted,
                border: '1px solid ' + (activeTab === 'BACKTEST' ? '#059669' : subCardBorder),
              }}
            >
              🚀 Backtest Results & Analytics
            </button>
          </div>

          {/* Policy Meta Config */}
          <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Policy Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
                />
              </div>

              {/* Comprehensive Multi-Universe Selector */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Target Stock Universe (Multi-Select Supported)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                    {selectedUniverses.length} Universe{selectedUniverses.length > 1 ? 's' : ''} Active
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  background: '#0f172a',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  alignItems: 'center',
                  minHeight: '42px',
                }}>
                  {selectedUniverses.map(uId => {
                    const uni = STOCK_UNIVERSES.find(u => u.id === uId || u.symbol.toLowerCase() === uId.toLowerCase() || u.name.toLowerCase() === uId.toLowerCase()) || { symbol: uId, icon: '🎯' };
                    return (
                      <span
                        key={uId}
                        style={{
                          background: '#1e3a8a40',
                          border: '1px solid #3b82f6',
                          color: '#60a5fa',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{uni.icon || '🎯'}</span>
                        <span>{uni.symbol || uId}</span>
                        {selectedUniverses.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUniverse(uId);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontWeight: 800,
                              padding: '0 2px',
                              fontSize: '0.8rem',
                              lineHeight: 1,
                            }}
                            title="Remove universe"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowInstrumentModal(true)}
                    style={{
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: 'auto',
                    }}
                  >
                    <span>➕</span> Browse & Select Universes
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Timeframe</label>
                  {timeframe === 'ALL' && (
                    <span style={{ fontSize: '0.65rem', background: '#3b82f620', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Multi-TF Active
                    </span>
                  )}
                </div>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#0f172a',
                    border: '1px solid ' + (timeframe === 'ALL' ? '#3b82f6' : '#334155'),
                    borderRadius: '4px',
                    color: timeframe === 'ALL' ? '#60a5fa' : 'white',
                    fontSize: '0.85rem',
                    fontWeight: timeframe === 'ALL' ? 700 : 400,
                  }}
                >
                  <option value="ALL">🌐 All Timeframes (Multi-TF Scanning)</option>
                  <optgroup label="── Intraday Minutes ──">
                    <option value="1m">1 Minute</option>
                    <option value="2m">2 Minutes</option>
                    <option value="3m">3 Minutes</option>
                    <option value="5m">5 Minutes</option>
                    <option value="10m">10 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="45m">45 Minutes</option>
                  </optgroup>
                  <optgroup label="── Hourly & Daily ──">
                    <option value="1h">1 Hour</option>
                    <option value="2h">2 Hours</option>
                    <option value="4h">4 Hours</option>
                    <option value="1D">1 Day (EOD)</option>
                  </optgroup>
                  <optgroup label="── Weekly, Monthly & Yearly ──">
                    <option value="1W">1 Week (Weekly)</option>
                    <option value="1M">1 Month (Monthly)</option>
                    <option value="3M">3 Months (Quarterly)</option>
                    <option value="1Y">1 Year (Annual)</option>
                  </optgroup>
                  <optgroup label="── Custom ──">
                    <option value="CUSTOM">⚡ Custom Minutes...</option>
                  </optgroup>
                </select>

                {timeframe === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      placeholder="e.g. 7"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) setTimeframe(`${val}m`);
                      }}
                      style={{
                        width: '80px',
                        padding: '6px 8px',
                        background: '#0f172a',
                        border: '1px solid #8b5cf6',
                        borderRadius: '4px',
                        color: '#c084fc',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>Minutes per candle</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Target (Points)</label>
                <input
                  type="number"
                  value={targetPoints}
                  onChange={(e) => setTargetPoints(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Stop Loss (Points)</label>
                <input
                  type="number"
                  value={stopLossPoints}
                  onChange={(e) => setStopLossPoints(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Trailing SL (Points)</label>
                <input
                  type="number"
                  value={trailingSL}
                  onChange={(e) => setTrailingSL(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Strategy Description & Notes</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your strategy setup..."
                style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* TAB 1: BUILDER */}
          {activeTab === 'BUILDER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Long / Buy Entry Rules */}
              <div style={{ background: cardBg, padding: '18px', borderRadius: '8px', border: `1px solid ${isDark ? '#10b98150' : '#86efac'}`, boxShadow: cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🟢</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#059669' }}>Long (CE) Entry Conditions</span>
                    {/* Logic Switcher */}
                    <div style={{ display: 'flex', background: subCardBg, borderRadius: '4px', padding: '2px', border: `1px solid ${subCardBorder}` }}>
                      <button
                        type="button"
                        onClick={() => setLongLogic('AND')}
                        style={{
                          background: longLogic === 'AND' ? '#10b981' : 'transparent',
                          color: longLogic === 'AND' ? 'white' : '#94a3b8',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: longLogic === 'AND' ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        title="ALL conditions must match simultaneously (AND)"
                      >
                        AND (All Match)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLongLogic('OR')}
                        style={{
                          background: longLogic === 'OR' ? '#059669' : 'transparent',
                          color: longLogic === 'OR' ? 'white' : '#94a3b8',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: longLogic === 'OR' ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        title="ANY condition can trigger an entry (OR)"
                      >
                        OR (Any Match)
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => addCondition('LONG')}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Long Rule
                  </button>
                </div>

                {longConditions.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No long conditions specified. Click "+ Add Long Rule" above.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {longConditions.map((cond, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0' }}>
                            <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                            <span
                              onClick={() => setLongLogic(longLogic === 'AND' ? 'OR' : 'AND')}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 9px',
                                borderRadius: '10px',
                                background: longLogic === 'AND' ? '#065f46' : '#92400e',
                                color: longLogic === 'AND' ? '#a7f3d0' : '#fde68a',
                                border: `1px solid ${longLogic === 'AND' ? '#10b981' : '#f59e0b'}`,
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              title="Click to toggle between AND / OR logic"
                            >
                              {longLogic} ⮂
                            </span>
                            <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                          </div>
                        )}
                        <ConditionRow
                          index={i}
                          condition={cond}
                          onChange={(f, v) => updateCondition('LONG', i, f, v)}
                          onRemove={() => removeCondition('LONG', i)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Short / Sell Entry Rules */}
              <div style={{ background: cardBg, padding: '18px', borderRadius: '8px', border: `1px solid ${isDark ? '#ef444450' : '#fca5a5'}`, boxShadow: cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔴</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#dc2626' }}>Short (PE) Entry Conditions</span>
                    {/* Logic Switcher */}
                    <div style={{ display: 'flex', background: subCardBg, borderRadius: '4px', padding: '2px', border: `1px solid ${subCardBorder}` }}>
                      <button
                        type="button"
                        onClick={() => setShortLogic('AND')}
                        style={{
                          background: shortLogic === 'AND' ? '#dc2626' : 'transparent',
                          color: shortLogic === 'AND' ? 'white' : textMuted,
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: shortLogic === 'AND' ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        title="ALL conditions must match simultaneously (AND)"
                      >
                        AND (All Match)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShortLogic('OR')}
                        style={{
                          background: shortLogic === 'OR' ? '#991b1b' : 'transparent',
                          color: shortLogic === 'OR' ? 'white' : textMuted,
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: shortLogic === 'OR' ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        title="ANY condition can trigger an entry (OR)"
                      >
                        OR (Any Match)
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => addCondition('SHORT')}
                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Short Rule
                  </button>
                </div>

                {shortConditions.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: textMuted, fontStyle: 'italic' }}>No short conditions specified. Click "+ Add Short Rule" above.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {shortConditions.map((cond, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0' }}>
                            <div style={{ height: '1px', flex: 1, background: subCardBorder }} />
                            <span
                              onClick={() => setShortLogic(shortLogic === 'AND' ? 'OR' : 'AND')}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 9px',
                                borderRadius: '10px',
                                background: shortLogic === 'AND' ? (isDark ? '#7f1d1d' : '#fef2f2') : (isDark ? '#92400e' : '#fffbeb'),
                                color: shortLogic === 'AND' ? '#dc2626' : '#d97706',
                                border: `1px solid ${shortLogic === 'AND' ? '#dc2626' : '#d97706'}`,
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              title="Click to toggle between AND / OR logic"
                            >
                              {shortLogic} ⮂
                            </span>
                            <div style={{ height: '1px', flex: 1, background: subCardBorder }} />
                          </div>
                        )}
                        <ConditionRow
                          index={i}
                          condition={cond}
                          onChange={(f, v) => updateCondition('SHORT', i, f, v)}
                          onRemove={() => removeCondition('SHORT', i)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Exit Rules */}
              <div style={{ background: cardBg, padding: '18px', borderRadius: '8px', border: `1px solid ${isDark ? '#f59e0b50' : '#fde68a'}`, boxShadow: cardShadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🟡</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#d97706' }}>Custom Indicator Exit Rules</span>
                    {/* Logic Switcher */}
                    <div style={{ display: 'flex', background: subCardBg, borderRadius: '4px', padding: '2px', border: `1px solid ${subCardBorder}` }}>
                      <button
                        type="button"
                        onClick={() => setExitLogic('OR')}
                        style={{
                          background: exitLogic === 'OR' ? '#f59e0b' : 'transparent',
                          color: exitLogic === 'OR' ? 'black' : '#94a3b8',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: exitLogic === 'OR' ? 800 : 500,
                          cursor: 'pointer',
                        }}
                        title="ANY condition triggers exit (OR)"
                      >
                        OR (Any Can Exit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExitLogic('AND')}
                        style={{
                          background: exitLogic === 'AND' ? '#d97706' : 'transparent',
                          color: exitLogic === 'AND' ? 'white' : '#94a3b8',
                          border: 'none',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: exitLogic === 'AND' ? 700 : 500,
                          cursor: 'pointer',
                        }}
                        title="ALL conditions must match to exit (AND)"
                      >
                        AND (All Match)
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => addCondition('EXIT')}
                    style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Exit Rule
                  </button>
                </div>

                {exitLongConditions.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Standard Target Points & Stop Loss will be used. Click above to add dynamic indicator exits.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {exitLongConditions.map((cond, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0' }}>
                            <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                            <span
                              onClick={() => setExitLogic(exitLogic === 'OR' ? 'AND' : 'OR')}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 9px',
                                borderRadius: '10px',
                                background: exitLogic === 'OR' ? '#92400e' : '#1e3a8a',
                                color: exitLogic === 'OR' ? '#fde68a' : '#bfdbfe',
                                border: `1px solid ${exitLogic === 'OR' ? '#f59e0b' : '#3b82f6'}`,
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              title="Click to toggle between OR / AND logic"
                            >
                              {exitLogic} ⮂
                            </span>
                            <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                          </div>
                        )}
                        <ConditionRow
                          index={i}
                          condition={cond}
                          isExit={true}
                          onChange={(f, v) => updateCondition('EXIT', i, f, v)}
                          onRemove={() => removeCondition('EXIT', i)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TRADINGVIEW PINE SCRIPT INBUILDER */}
          {activeTab === 'TV_SCRIPT' && (
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #8b5cf650' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🌲</span> Inbuild Custom TradingView Script & Webhooks
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Evaluate Pine-Script expressions directly inside our engine, or listen for incoming TradingView alert webhooks.
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={tvEnabled}
                    onChange={(e) => setTvEnabled(e.target.checked)}
                  />
                  Enable Inbuilt TV Script Evaluator
                </label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Custom Pine Script Condition Expression:
                </label>
                <textarea
                  rows={4}
                  value={tvExpression}
                  onChange={(e) => setTvExpression(e.target.value)}
                  placeholder="e.g. ta.crossover(close, ta.ema(close, 20)) and ta.rsi(close, 14) > 50 and ta.bb_lower_below_kc_lower()"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                  }}
                />
              </div>

              {/* Supported Functions Quick Reference */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  SUPPORTED TRADINGVIEW PINE EXPRESSIONS & VARIABLES:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                  <div><code>ta.bb_lower_below_kc_lower()</code></div>
                  <div><code>ta.bb_lower_below_zero()</code></div>
                  <div><code>ta.squeeze_on()</code> / <code>ta.squeeze_fired()</code></div>
                  <div><code>ta.keltner_upper(20, 1.5)</code> / <code>ta.keltner_lower()</code></div>
                  <div><code>ta.crossover(a, b)</code> / <code>ta.crossunder(a, b)</code></div>
                  <div><code>ta.ema(close, 20)</code> / <code>ta.sma(volume, 20)</code></div>
                  <div><code>ta.rsi(close, 14)</code> / <code>ta.adx(14)</code></div>
                  <div><code>ta.donchian_upper(20)</code> / <code>ta.donchian_lower(20)</code></div>
                  <div><code>ta.bb_upper(20, 2)</code> / <code>ta.bb_lower(20, 2)</code></div>
                  <div><code>ta.vwap()</code> / <code>ta.macd_hist(12, 26, 9)</code></div>
                </div>
              </div>

              {/* Webhook Configuration Section */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  🔗 TradingView Alert Webhook Dispatcher
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
                  When creating an alert on tradingview.com, enable Webhook URL and paste:
                </div>

                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontSize: '0.8rem' }}>
                    http://localhost:3001/api/policies/webhook
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:3001/api/policies/webhook');
                      toast.success('Webhook URL copied!');
                    }}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKTEST RESULTS */}
          {activeTab === 'BACKTEST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Backtest Config Bar with Historical Period Presets */}
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏱️</span> Test Data Period Presets:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: '1M', label: '1 Month' },
                      { id: '3M', label: '3 Months' },
                      { id: '6M', label: '6 Months' },
                      { id: '1Y', label: '1 Year' },
                      { id: '3Y', label: '3 Years' },
                      { id: '5Y', label: '5 Years' },
                      { id: 'FULL2026', label: '2026 Full' },
                      { id: 'YTD', label: 'YTD' },
                    ].map(p => {
                      const isActive = btActiveDatePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyBtDatePreset(p.id)}
                          style={{
                            background: isActive ? '#0284c7' : '#0f172a',
                            color: isActive ? '#ffffff' : '#cbd5e1',
                            border: isActive ? '1px solid #38bdf8' : '1px solid #475569',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isActive ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none',
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>From Date</label>
                    <input
                      type="date"
                      value={btFromDate}
                      onChange={(e) => {
                        setBtFromDate(e.target.value);
                        setBtActiveDatePreset('');
                      }}
                      style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>To Date</label>
                    <input
                      type="date"
                      value={btToDate}
                      onChange={(e) => {
                        setBtToDate(e.target.value);
                        setBtActiveDatePreset('');
                      }}
                      style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Initial Capital (₹)</label>
                    <input
                      type="number"
                      value={btInitialCap}
                      onChange={(e) => setBtInitialCap(e.target.value)}
                      style={{ width: '130px', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={handleRunBacktest}
                    disabled={btRunning}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {btRunning ? 'Running Backtest...' : '⚡ Re-Run Backtest'}
                  </button>
                </div>
              </div>
            </div>

              {/* Backtest Results Display */}
              {btResult ? (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Net Profit</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: btResult.summary.netProfit >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                        {btResult.summary.netProfit >= 0 ? '+' : ''}₹{btResult.summary.netProfit.toLocaleString('en-IN')}
                        <span style={{ fontSize: '0.8rem', marginLeft: '6px', color: btResult.summary.returnPct >= 0 ? '#34d399' : '#f87171' }}>
                          ({btResult.summary.returnPct}%)
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Win Rate</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                        {btResult.summary.winRate}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        {btResult.summary.winningTrades} W / {btResult.summary.losingTrades} L ({btResult.summary.totalTrades} total)
                      </div>
                    </div>

                    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Profit Factor</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                        {btResult.summary.profitFactor}
                      </div>
                    </div>

                    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Max Drawdown</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>
                        {btResult.summary.maxDrawdownPct}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        -₹{btResult.summary.maxDrawdown.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Candles Tested</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
                        {btResult.summary.candlesEvaluated}
                      </div>
                    </div>
                  </div>

                  {/* Equity Curve SVG Chart */}
                  <div style={{ background: '#1e293b', padding: '18px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                      📈 Account Equity Curve ({symbol})
                    </div>
                    {btResult.equityCurve && btResult.equityCurve.length > 1 ? (
                      <EquityCurveChart points={btResult.equityCurve} />
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No trade events occurred during this sample period.</div>
                    )}
                  </div>

                  {/* Trades Log Table with Sort & Filter */}
                  <div style={{ background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                        📋 Trade Execution Log ({btResult.trades.length} trades)
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {['ALL', 'WIN', 'LOSS'].map(f => (
                            <button
                              key={f}
                              onClick={() => setBtTypeFilter(f)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: btTypeFilter === f ? '#3b82f6' : '#0f172a',
                                color: btTypeFilter === f ? 'white' : '#94a3b8',
                                border: '1px solid ' + (btTypeFilter === f ? '#3b82f6' : '#334155'),
                              }}
                            >
                              {f === 'ALL' && 'All'}
                              {f === 'WIN' && '🟢 Win'}
                              {f === 'LOSS' && '🔴 Loss'}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="🔍 Filter stock, reason..."
                          value={btSearch}
                          onChange={(e) => setBtSearch(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '0.75rem',
                            outline: 'none',
                            width: '160px',
                          }}
                        />
                      </div>
                    </div>

                    {btResult.trades.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Zero trades triggered. Try loosening entry conditions or widening the test date range.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'stock') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('stock'); setBtSortDir('asc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Stock / Instrument {btSortCol === 'stock' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'type') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('type'); setBtSortDir('asc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Type {btSortCol === 'type' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'entryTime') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('entryTime'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Exact Trigger Time {btSortCol === 'entryTime' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'entryPrice') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('entryPrice'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Entry Price {btSortCol === 'entryPrice' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'exitTime') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('exitTime'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Exit Time {btSortCol === 'exitTime' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'exitPrice') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('exitPrice'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Exit Price {btSortCol === 'exitPrice' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'points') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('points'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                Points {btSortCol === 'points' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th
                                onClick={() => {
                                  if (btSortCol === 'pnl') setBtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                  else { setBtSortCol('pnl'); setBtSortDir('desc'); }
                                }}
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                P&L (₹) {btSortCol === 'pnl' ? (btSortDir === 'asc' ? '▲' : '▼') : '↕'}
                              </th>
                              <th style={{ padding: '8px' }}>Exit Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {btResult.trades
                              .filter(t => {
                                if (btTypeFilter === 'WIN' && t.pnl <= 0) return false;
                                if (btTypeFilter === 'LOSS' && t.pnl >= 0) return false;
                                if (btSearch.trim()) {
                                  const q = btSearch.trim().toLowerCase();
                                  const sMatch = (t.stock || '').toLowerCase().includes(q) || (t.stockName || '').toLowerCase().includes(q);
                                  const rMatch = (t.exitReason || '').toLowerCase().includes(q);
                                  if (!sMatch && !rMatch) return false;
                                }
                                return true;
                              })
                              .sort((a, b) => {
                                let vA = a[btSortCol];
                                let vB = b[btSortCol];
                                if (btSortCol === 'entryTime') {
                                  vA = a.entryTimeMs || new Date(a.entryTime || a.entryDate || 0).getTime();
                                  vB = b.entryTimeMs || new Date(b.entryTime || b.entryDate || 0).getTime();
                                }
                                if (vA === undefined || vA === null) vA = 0;
                                if (vB === undefined || vB === null) vB = 0;
                                if (typeof vA === 'string') return btSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
                                return btSortDir === 'asc' ? (vA - vB) : (vB - vA);
                              })
                              .map((t, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #243044' }}>
                                <td style={{ padding: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      background: '#334155',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      color: '#38bdf8',
                                      fontFamily: 'monospace',
                                      fontSize: '0.78rem',
                                    }}>
                                      {t.stock || symbol}
                                    </span>
                                    {t.stockName && (
                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {t.stockName}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '8px', fontWeight: 700, color: t.type === 'LONG' ? '#34d399' : '#f87171' }}>
                                  {t.type}
                                </td>
                                <td style={{ padding: '8px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: '#fbbf24', marginRight: '4px' }}>⏰</span>
                                  {t.entryTime || t.entryDate}
                                </td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>₹{t.entryPrice}</td>
                                <td style={{ padding: '8px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{t.exitTime || t.exitDate}</td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>₹{t.exitPrice}</td>
                                <td style={{ padding: '8px', fontWeight: 600, color: t.points >= 0 ? '#34d399' : '#f87171' }}>
                                  {t.points >= 0 ? '+' : ''}{t.points}
                                </td>
                                <td style={{ padding: '8px', fontWeight: 700, color: t.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                  {t.pnl >= 0 ? '+' : ''}₹{t.pnl?.toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '8px', color: '#94a3b8' }}>{t.exitReason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚡</div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>Backtest Ready</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Click "Re-Run Backtest" above to simulate this policy against historical market candles.</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ─── STOCK UNIVERSE SELECTOR MODAL (NIFTY 50, 100, 200, F&O, ALL STOCKS, OPTIONS, MCX) ─── */}
      {showInstrumentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '12px',
            maxWidth: '820px',
            width: '100%',
            padding: '24px',
            color: '#f8fafc',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Select Stock Universe
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  Select stock universe basket: Nifty 50, Nifty 100, Nifty 200, F&O Stocks, All Stocks, Nifty Options, or MCX Commodities.
                </div>
              </div>
              <button
                onClick={() => setShowInstrumentModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {INSTRUMENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setInstCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: instCategory === cat.id ? '#3b82f6' : '#0f172a',
                    color: instCategory === cat.id ? 'white' : '#94a3b8',
                    border: '1px solid ' + (instCategory === cat.id ? '#3b82f6' : '#334155'),
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search universe (e.g. Nifty 100, Nifty 200, F&O, All stocks, MCX)..."
                value={instSearch}
                onChange={(e) => setInstSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Universe Cards Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '12px',
              paddingRight: '4px',
            }}>
              {displayedUniverses.map(uni => {
                const isSelected = selectedUniverses.includes(uni.symbol) || selectedUniverses.includes(uni.id) || selectedUniverses.some(s => s.toLowerCase() === uni.symbol.toLowerCase());
                return (
                  <div
                    key={uni.id}
                    onClick={() => {
                      handleToggleUniverse(uni.symbol);
                    }}
                    style={{
                      background: isSelected ? '#1e3a8a35' : '#0f172a',
                      border: `1.5px solid ${isSelected ? '#38bdf8' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#38bdf8' : '#64748b'}`,
                            background: isSelected ? '#0284c7' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'white',
                            fontWeight: 900
                          }}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <span style={{ fontSize: '1.25rem' }}>{uni.icon}</span>
                          <span style={{ fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc', fontSize: '1rem' }}>
                            {uni.symbol}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', background: isSelected ? '#38bdf825' : '#3b82f620', color: isSelected ? '#38bdf8' : '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {uni.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '8px' }}>
                        {uni.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                        📊 {uni.stockCount} {uni.category === 'MCX' ? 'Commodities' : uni.category === 'OPTIONS' ? 'Indices' : 'Stocks'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: isSelected ? '#38bdf8' : '#64748b', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', fontWeight: isSelected ? 700 : 400 }}>
                        {isSelected ? '✓ SELECTED' : uni.exchange}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                ✓ {selectedUniverses.length} Universe{selectedUniverses.length > 1 ? 's' : ''} Selected: {selectedUniverses.join(', ')}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowInstrumentModal(false)}
                  style={{
                    background: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  ✓ Confirm Selection ({selectedUniverses.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Sub-Component: Equity Curve Chart SVG ────────────────────────────────────

function EquityCurveChart({ points }) {
  const width = 800;
  const height = 180;
  const padding = 30;

  const capitals = points.map(p => p.capital);
  const minCap = Math.min(...capitals);
  const maxCap = Math.max(...capitals);
  const capRange = (maxCap - minCap) || 1;

  const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - ((val - minCap) / capRange) * (height - 2 * padding);

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.capital);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const startVal = points[0]?.capital || 0;
  const endVal = points[points.length - 1]?.capital || 0;
  const strokeColor = endVal >= startVal ? '#10b981' : '#ef4444';

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '200px' }}>
        <line x1={padding} y1={getY(startVal)} x2={width - padding} y2={getY(startVal)} stroke="#334155" strokeDasharray="4 4" />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" />
        <circle cx={getX(0)} cy={getY(startVal)} r="4" fill="#3b82f6" />
        <circle cx={getX(points.length - 1)} cy={getY(endVal)} r="5" fill={strokeColor} />

        <text x={padding} y={height - 8} fill="#94a3b8" fontSize="11" fontFamily="monospace">
          ₹{minCap.toLocaleString('en-IN')}
        </text>
        <text x={width - padding} y={16} fill="#94a3b8" fontSize="11" textAnchor="end" fontFamily="monospace">
          ₹{maxCap.toLocaleString('en-IN')}
        </text>
      </svg>
    </div>
  );
}
