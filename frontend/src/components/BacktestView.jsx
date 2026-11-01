import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../store/tradingStore';
import toast from 'react-hot-toast';
import { STOCK_UNIVERSES, INSTRUMENT_CATEGORIES, filterUniverses } from '../utils/instruments';
import { ConditionRow } from './ConditionRow';

export default function BacktestView() {
  const { theme } = useTradingStore();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const subCardBg = isDark ? '#0f172a' : '#f8fafc';
  const subCardBorder = isDark ? '#334155' : '#cbd5e1';
  const textDark = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#475569';
  const headerText = isDark ? '#ffffff' : '#1e40af';
  const cardShadow = isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.04)';

  const [policies, setPolicies] = useState([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Policy Header Details (Editable)
  const [policyName, setPolicyName] = useState('Custom Alert Policy');
  const [policyDescription, setPolicyDescription] = useState('');

  // Target Universe
  const [symbol, setSymbol] = useState('All Stocks');
  const [showInstModal, setShowInstModal] = useState(false);
  const [instCategory, setInstCategory] = useState('ALL');
  const [instSearch, setInstSearch] = useState('');

  // Timeframe & Custom Timeframe
  const [timeframeMode, setTimeframeMode] = useState('PRESET'); // 'PRESET' | 'CUSTOM'
  const [presetTimeframe, setPresetTimeframe] = useState('5m');
  const [customMinutes, setCustomMinutes] = useState(7);

  // Dates & Risk
  const [activeDatePreset, setActiveDatePreset] = useState('FULL2026');
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-11-01');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [lotSize, setLotSize] = useState(25);
  const [targetPoints, setTargetPoints] = useState(250);
  const [stopLossPoints, setStopLossPoints] = useState(50);
  const [trailingSL, setTrailingSL] = useState(15);

  // Strategy Rules & Indicators Matrix (Full in-backtest editor)
  const [showRulesEditor, setShowRulesEditor] = useState(true);
  const [longConditions, setLongConditions] = useState([
    { indicator: 'BOLLINGER', comparator: 'LOWER_BB_BELOW_ZERO' },
  ]);
  const [longLogic, setLongLogic] = useState('AND'); // 'AND' | 'OR'
  const [shortConditions, setShortConditions] = useState([]);
  const [shortLogic, setShortLogic] = useState('AND'); // 'AND' | 'OR'
  const [exitConditions, setExitConditions] = useState([]);
  const [exitLogic, setExitLogic] = useState('OR'); // 'OR' | 'AND'

  // Custom TradingView Pine Inbuilder
  const [tvEnabled, setTvEnabled] = useState(false);
  const [tvExpression, setTvExpression] = useState('close > ta.ema(close, 20) and ta.rsi(close, 14) > 50');
  const [tvWebhookSecret, setTvWebhookSecret] = useState('tv_secret_default');

  // Execution & Results
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [tradeFilter, setTradeFilter] = useState('ALL');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('ALL'); // 'ALL' | 'LONG' | 'SHORT'
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeSortCol, setTradeSortCol] = useState('entryTime');
  const [tradeSortDir, setTradeSortDir] = useState('desc'); // 'asc' | 'desc'
  const [selectedUniverses, setSelectedUniverses] = useState(['All Stocks']);

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
    setLoadingPolicies(true);
    try {
      const res = await safeFetchJson('http://localhost:3001/api/policies');
      if (res.policies && res.policies.length > 0) {
        setPolicies(res.policies);
        if (!selectedPolicyId || !res.policies.some(p => p.id === selectedPolicyId)) {
          setSelectedPolicyId(res.policies[0].id);
          applyPolicyDefaults(res.policies[0]);
        }
      }
    } catch (e) {
      toast.error('Failed to load policies: ' + e.message);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const applyPolicyDefaults = (pol) => {
    if (!pol) return;
    setPolicyName(pol.name || 'Custom Alert Policy');
    setPolicyDescription(pol.description || '');
    if (pol.targetPoints !== undefined) setTargetPoints(pol.targetPoints);
    if (pol.stopLossPoints !== undefined) setStopLossPoints(pol.stopLossPoints);
    if (pol.trailingSL !== undefined) setTrailingSL(pol.trailingSL);
    if (pol.symbol) {
      setSymbol(pol.symbol);
      const parsed = pol.symbol.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedUniverses(parsed.length ? parsed : [pol.symbol]);
    }
    if (pol.timeframe) {
      if (pol.timeframe.endsWith('m') && !['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'].includes(pol.timeframe)) {
        setTimeframeMode('CUSTOM');
        setCustomMinutes(parseInt(pol.timeframe, 10) || 7);
      } else {
        setTimeframeMode('PRESET');
        setPresetTimeframe(pol.timeframe);
      }
    }
    if (pol.entryConditions) {
      setLongConditions(pol.entryConditions.long || []);
      setLongLogic(pol.entryConditions.longLogic || 'AND');
      setShortConditions(pol.entryConditions.short || []);
      setShortLogic(pol.entryConditions.shortLogic || 'AND');
    }
    if (pol.exitConditions) {
      setExitConditions(pol.exitConditions.long || []);
      setExitLogic(pol.exitConditions.longLogic || pol.exitConditions.logic || 'OR');
    }
    if (pol.customTradingViewScript) {
      setTvEnabled(!!pol.customTradingViewScript.enabled);
      setTvExpression(pol.customTradingViewScript.expression || '');
      setTvWebhookSecret(pol.customTradingViewScript.webhookSecret || 'tv_secret_default');
    }
  };

  const handlePolicyChange = (id) => {
    setSelectedPolicyId(id);
    const pol = policies.find(p => p.id === id);
    if (pol) applyPolicyDefaults(pol);
  };

  const handleCreateNewPolicy = () => {
    setSelectedPolicyId('');
    setPolicyName('New Custom Alert Strategy');
    setPolicyDescription('Custom multi-indicator rules');
    setSymbol('All Stocks');
    setSelectedUniverses(['All Stocks']);
    setTargetPoints(200);
    setStopLossPoints(40);
    setTrailingSL(15);
    setLongConditions([
      { indicator: 'BOLLINGER', comparator: 'LOWER_BB_BELOW_ZERO' },
    ]);
    setLongLogic('AND');
    setShortConditions([]);
    setShortLogic('AND');
    setExitConditions([]);
    setExitLogic('OR');
    setTvEnabled(false);
    toast.success('Ready to create new strategy! Edit options and click "Save Policy Changes".');
  };

  const toggleUniverseSelection = (uniName) => {
    setSelectedUniverses(prev => {
      const exists = prev.some(s => s.toLowerCase() === uniName.toLowerCase());
      if (exists) {
        if (prev.length === 1) {
          toast.info('At least one universe must be selected');
          return prev;
        }
        const updated = prev.filter(s => s.toLowerCase() !== uniName.toLowerCase());
        setSymbol(updated.join(', '));
        return updated;
      } else {
        const updated = [...prev, uniName];
        setSymbol(updated.join(', '));
        return updated;
      }
    });
  };

  const handleTradeSort = (col) => {
    if (tradeSortCol === col) {
      setTradeSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTradeSortCol(col);
      setTradeSortDir('desc');
    }
  };

  const getActiveTimeframe = () => {
    return timeframeMode === 'CUSTOM' ? `${customMinutes}m` : presetTimeframe;
  };

  const applyDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const end = new Date();
    let start = new Date();
    if (preset === '7D') start.setDate(end.getDate() - 7);
    if (preset === '1M') start.setMonth(end.getMonth() - 1);
    if (preset === '3M') start.setMonth(end.getMonth() - 3);
    if (preset === '6M') start.setMonth(end.getMonth() - 6);
    if (preset === '1Y') start.setFullYear(end.getFullYear() - 1);
    if (preset === '3Y') start.setFullYear(end.getFullYear() - 3);
    if (preset === '5Y') start.setFullYear(end.getFullYear() - 5);
    if (preset === 'YTD') start = new Date(end.getFullYear(), 0, 1);
    if (preset === 'FULL2026') {
      setFromDate('2026-01-01');
      setToDate('2026-11-01');
      return;
    }
    const fmt = (d) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };
    setFromDate(fmt(start));
    setToDate(fmt(end));
  };

  // Condition Matrix Handlers
  const addCondition = (type) => {
    const defaultItem = { indicator: 'BOLLINGER', comparator: 'LOWER_BB_BELOW_ZERO' };
    if (type === 'LONG') setLongConditions([...longConditions, defaultItem]);
    if (type === 'SHORT') setShortConditions([...shortConditions, defaultItem]);
    if (type === 'EXIT') setExitConditions([...exitConditions, defaultItem]);
  };

  const removeCondition = (type, index) => {
    if (type === 'LONG') setLongConditions(longConditions.filter((_, i) => i !== index));
    if (type === 'SHORT') setShortConditions(shortConditions.filter((_, i) => i !== index));
    if (type === 'EXIT') setExitConditions(exitConditions.filter((_, i) => i !== index));
  };

  const updateCondition = (type, index, field, value) => {
    const updater = (list) => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    };
    if (type === 'LONG') setLongConditions(updater(longConditions));
    if (type === 'SHORT') setShortConditions(updater(shortConditions));
    if (type === 'EXIT') setExitConditions(updater(exitConditions));
  };

  // Save Policy Changes Directly to Backend
  const handleSavePolicy = async () => {
    if (!policyName.trim()) {
      toast.error('Policy name is required');
      return;
    }
    setSavingPolicy(true);
    const effectiveTf = getActiveTimeframe();

    const payload = {
      id: selectedPolicyId || undefined,
      name: policyName.trim(),
      description: policyDescription,
      symbol,
      timeframe: effectiveTf,
      targetPoints: Number(targetPoints),
      stopLossPoints: Number(stopLossPoints),
      trailingSL: Number(trailingSL),
      enabled: true,
      entryConditions: {
        long: longConditions,
        longLogic,
        short: shortConditions,
        shortLogic,
      },
      exitConditions: {
        long: exitConditions,
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
        toast.success(`Policy "${policyName}" saved successfully!`);
        await fetchPolicies();
        if (res.policy?.id) setSelectedPolicyId(res.policy.id);
      } else {
        toast.error('Failed to save policy: ' + res.error);
      }
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleRunBacktest = async () => {
    setRunning(true);
    const effectiveTf = getActiveTimeframe();
    const effectiveSymbol = selectedUniverses.length > 0 ? selectedUniverses.join(', ') : (symbol || 'All Stocks');

    const policyPayload = {
      name: policyName.trim() || 'Custom Strategy',
      symbol: effectiveSymbol,
      symbols: selectedUniverses,
      timeframe: effectiveTf,
      targetPoints: Number(targetPoints),
      stopLossPoints: Number(stopLossPoints),
      trailingSL: Number(trailingSL),
      entryConditions: {
        long: longConditions,
        longLogic,
        short: shortConditions,
        shortLogic,
      },
      exitConditions: {
        long: exitConditions,
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
      const res = await safeFetchJson('http://localhost:3001/api/policies/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: policyPayload,
          symbol: effectiveSymbol,
          symbols: selectedUniverses,
          fromDate,
          toDate,
          initialCapital: Number(initialCapital),
          timeframe: effectiveTf,
          lotSize: Number(lotSize),
        }),
      });

      if (res.success) {
        setResult(res);
        toast.success(`Backtest complete! Simulated ${res.trades ? res.trades.length : 0} constituent trades.`);
      } else {
        toast.error('Backtest error: ' + (res.error || 'Unknown error'));
      }
    } catch (e) {
      toast.error('Backtest request failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  // ─── Download Report Feature (CSV & JSON) ───────────────────────────────────

  const downloadCSVReport = () => {
    if (!result) return;
    const { summary, trades } = result;

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header & Summary Section
    csvContent += `EXECUTIVE BACKTEST REPORT\n`;
    csvContent += `Strategy Name,${policyName}\n`;
    csvContent += `Instrument Universe,${summary.symbol}\n`;
    csvContent += `Constituent Instruments Tested,${summary.constituentsCount || 20}\n`;
    csvContent += `Timeframe,${summary.timeframe}\n`;
    csvContent += `Test Period,${summary.fromDate} to ${summary.toDate}\n`;
    csvContent += `Candles Evaluated,${summary.candlesEvaluated}\n`;
    csvContent += `Initial Capital,INR ${summary.initialCapital}\n`;
    csvContent += `Ending Capital,INR ${summary.endingCapital}\n`;
    csvContent += `Net Profit,INR ${summary.netProfit} (${summary.returnPct}%)\n`;
    csvContent += `Win Rate,${summary.winRate}%\n`;
    csvContent += `Profit Factor,${summary.profitFactor}\n`;
    csvContent += `Max Drawdown,${summary.maxDrawdownPct}% (INR ${summary.maxDrawdown})\n`;
    csvContent += `Total Trades,${summary.totalTrades} (Won: ${summary.winningTrades} / Lost: ${summary.losingTrades})\n\n`;

    // Trade Log Section
    csvContent += `Trade #,Stock Symbol,Stock Name,Type,Exact Trigger Time,Entry Price,Exit Time,Exit Price,Points,PnL (INR),Exit Reason,Capital After\n`;
    trades.forEach((t, i) => {
      csvContent += `${i + 1},${t.stock || summary.symbol},"${t.stockName || ''}",${t.type},"${t.entryTime || t.entryDate}",${t.entryPrice},"${t.exitTime || t.exitDate}",${t.exitPrice},${t.points},${t.pnl},"${t.exitReason}",${t.capitalAfter}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Backtest_Report_${summary.symbol}_${getActiveTimeframe()}_${summary.fromDate}_to_${summary.toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report downloaded successfully!');
  };

  const downloadJSONReport = () => {
    if (!result) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `Backtest_Audit_${symbol}_${getActiveTimeframe()}_${fromDate}_to_${toDate}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('JSON Audit report downloaded!');
  };

  // Stock Universe lookups
  const displayedUniverses = filterUniverses(STOCK_UNIVERSES, instSearch, instCategory);
  
  const selectedUniverseObjects = selectedUniverses.map(uSym => {
    return STOCK_UNIVERSES.find(u => u.symbol.toLowerCase() === uSym.toLowerCase() || u.name.toLowerCase() === uSym.toLowerCase() || u.id === uSym) || { symbol: uSym, name: uSym, icon: '🎯', badge: 'Active', stockCount: 20 };
  });
  const totalConstituentCount = selectedUniverseObjects.reduce((acc, u) => acc + (u.stockCount || 20), 0);
  const primaryUniverse = selectedUniverseObjects[0] || { symbol: 'All Stocks', name: 'All Stocks', icon: '🌐', badge: 'Universe' };

  let filteredTrades = result ? result.trades.filter(t => {
    if (tradeFilter === 'WIN' && t.pnl <= 0) return false;
    if (tradeFilter === 'LOSS' && t.pnl >= 0) return false;
    if (tradeTypeFilter === 'LONG' && t.type !== 'LONG') return false;
    if (tradeTypeFilter === 'SHORT' && t.type !== 'SHORT') return false;
    if (tradeSearch.trim()) {
      const q = tradeSearch.trim().toLowerCase();
      const stockMatch = (t.stock || '').toLowerCase().includes(q) || (t.stockName || '').toLowerCase().includes(q);
      const reasonMatch = (t.exitReason || '').toLowerCase().includes(q);
      const timeMatch = (t.entryTime || '').toLowerCase().includes(q) || (t.exitTime || '').toLowerCase().includes(q);
      if (!stockMatch && !reasonMatch && !timeMatch) return false;
    }
    return true;
  }) : [];

  // Sort trades according to user selection
  filteredTrades.sort((a, b) => {
    let valA = a[tradeSortCol];
    let valB = b[tradeSortCol];
    if (tradeSortCol === 'entryTime') {
      valA = a.entryTimeMs || new Date(a.entryTime || a.entryDate || 0).getTime();
      valB = b.entryTimeMs || new Date(b.entryTime || b.entryDate || 0).getTime();
    } else if (tradeSortCol === 'exitTime') {
      valA = new Date(a.exitTime || a.exitDate || 0).getTime();
      valB = new Date(b.exitTime || b.exitDate || 0).getTime();
    }
    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;
    if (typeof valA === 'string') {
      return tradeSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return tradeSortDir === 'asc' ? (valA - valB) : (valB - valA);
  });

  const totalRulesCount = longConditions.length + shortConditions.length + exitConditions.length + (tvEnabled ? 1 : 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', color: textDark }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: headerText }}>
            <span>🧪</span> Strategy Backtest Hub
          </h1>
          <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '0.85rem' }}>
            Simulate alert policies across standard and custom timeframes, analyze win rates, max drawdown, and download full audit reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCreateNewPolicy}
            style={{
              background: subCardBg,
              color: textDark,
              border: `1px solid ${subCardBorder}`,
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ➕ New Policy
          </button>

          <button
            onClick={handleSavePolicy}
            disabled={savingPolicy}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {savingPolicy ? 'Saving...' : '💾 Save Policy'}
          </button>

          {result && (
            <>
              <button
                onClick={downloadCSVReport}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📥 Download CSV Report</span>
              </button>

              <button
                onClick={downloadJSONReport}
                style={{
                  background: subCardBg,
                  color: textDark,
                  border: `1px solid ${subCardBorder}`,
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Export JSON
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── CONFIGURATION CONTROL PANEL ─── */}
      <div style={{
        background: cardBg,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${cardBorder}`,
        marginBottom: '20px',
        boxShadow: cardShadow,
      }}>
        
        {/* ROW 1: Policy Selection & Name, Universe, Timeframe, Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-start' }}>
          
          {/* Policy Selector & Editable Name */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700 }}>Select Alert Policy</label>
              {loadingPolicies && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>Loading...</span>}
            </div>
            <select
              value={selectedPolicyId}
              onChange={(e) => handlePolicyChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: subCardBg,
                border: `1px solid ${isDark ? '#3b82f6' : '#93c5fd'}`,
                borderRadius: '4px',
                color: isDark ? '#60a5fa' : '#2563eb',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="">➕ [Custom Untracked Strategy]</option>
            </select>

            <input
              type="text"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="Edit strategy name..."
              style={{
                width: '100%',
                padding: '6px 10px',
                background: subCardBg,
                border: `1px solid ${subCardBorder}`,
                borderRadius: '4px',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
              title="Edit policy name directly"
            />
          </div>

          {/* Universe Multi-Selector (Interactive Pills + Dropdown + Modal Browser) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700 }}>
                Target Stock Universe <span style={{ color: isDark ? '#38bdf8' : '#2563eb', fontWeight: 700 }}>({selectedUniverses.length} selected)</span>
              </label>
              <button
                onClick={() => setShowInstModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#60a5fa' : '#2563eb',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                🔍 Browse All (Multi-Select)
              </button>
            </div>

            {/* Selected Universe Badges */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginBottom: '6px',
              minHeight: '28px',
            }}>
              {selectedUniverses.map(uName => {
                const uObj = STOCK_UNIVERSES.find(x => x.symbol.toLowerCase() === uName.toLowerCase() || x.name.toLowerCase() === uName.toLowerCase()) || { symbol: uName, icon: '🎯' };
                return (
                  <span
                    key={uName}
                    style={{
                      background: isDark ? '#1e3a8a40' : '#eff6ff',
                      border: `1px solid ${isDark ? '#3b82f6' : '#bfdbfe'}`,
                      color: isDark ? '#93c5fd' : '#1d4ed8',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>{uObj.icon}</span>
                    <span>{uName}</span>
                    {selectedUniverses.length > 1 && (
                      <span
                        onClick={() => toggleUniverseSelection(uName)}
                        title="Remove universe"
                        style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 800, marginLeft: '2px' }}
                      >
                        ✕
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Toggle / Add Universe Dropdown */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleUniverseSelection(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '7px 8px',
                background: subCardBg,
                border: `1px solid ${isDark ? '#3b82f6' : '#bfdbfe'}`,
                borderRadius: '4px',
                color: isDark ? '#38bdf8' : '#2563eb',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <option value="">➕ Add / Toggle Universe or Stock...</option>
              <optgroup label="── 🏛️ Benchmark Indices Spots & Futures ──">
                <option value="Indices Spots & Futures">🏛️ Indices Spots & Futures (Nifty, BankNifty, FinNifty, Midcap, Sensex)</option>
                <option value="Indices Spots">🎯 Indices Cash Spots (Nifty, BankNifty, Sensex Spot)</option>
                <option value="Indices Futures">⚡ Indices Futures (Nifty FUT, BankNifty FUT, Sensex FUT)</option>
              </optgroup>
              <optgroup label="── 🌐 NSE Cash Equities ──">
                <option value="All Stocks">🌐 All Stocks (NSE 2,000+ Equities)</option>
                <option value="Nifty 50">🏆 Nifty 50 (Bluechip)</option>
                <option value="Nifty 100">🚀 Nifty 100 (Large & Midcap)</option>
                <option value="Nifty 200">📈 Nifty 200 (Broad Market)</option>
                <option value="F&O Stocks">⚡ F&O Stocks (NSE Derivatives)</option>
              </optgroup>
              <optgroup label="── 🇮🇳 BSE Cash & Penny Stocks ──">
                <option value="BSE All Stocks">🇮🇳 BSE All Stocks (BSE 4,000+ Equities)</option>
                <option value="BSE Sensex">🏛️ BSE Sensex 30</option>
                <option value="BSE Penny & Smallcap">⚡ BSE Penny & Smallcap (TTML, BCG, Suzlon)</option>
                <option value="TTML">🚀 TTML (Tata Teleservices Maharashtra)</option>
                <option value="BCG">💎 BCG (Brightcom Group)</option>
              </optgroup>
              <optgroup label="── 🎯 Derivatives & Commodities ──">
                <option value="Nifty Options">🎯 Nifty Options & Indices</option>
                <option value="MCX Commodities">🔥 MCX Commodities (Crude, Gold)</option>
              </optgroup>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.85rem' }}>{primaryUniverse.icon || '🎯'}</span>
                <span style={{ fontSize: '0.74rem', color: textMuted }}>
                  Total: <strong style={{ color: '#059669' }}>{totalConstituentCount} instruments</strong>
                </span>
              </div>
              {selectedUniverses.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUniverses(['All Stocks']);
                    setSymbol('All Stocks');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: textMuted,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Reset to All Stocks
                </button>
              )}
            </div>
          </div>

          {/* Timeframe & Custom Timeframe Mode */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 700 }}>Timeframe</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setTimeframeMode('PRESET')}
                  style={{
                    background: timeframeMode === 'PRESET' ? '#2563eb' : 'transparent',
                    border: 'none',
                    color: timeframeMode === 'PRESET' ? 'white' : textMuted,
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Standard
                </button>
                <button
                  onClick={() => setTimeframeMode('CUSTOM')}
                  style={{
                    background: timeframeMode === 'CUSTOM' ? '#7c3aed' : 'transparent',
                    border: 'none',
                    color: timeframeMode === 'CUSTOM' ? 'white' : textMuted,
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Custom Min
                </button>
              </div>
            </div>

            {timeframeMode === 'PRESET' ? (
              <select
                value={presetTimeframe}
                onChange={(e) => setPresetTimeframe(e.target.value)}
                style={{ width: '100%', padding: '8px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
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
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value)))}
                  style={{ width: '80px', padding: '8px', background: subCardBg, border: '1px solid #7c3aed', borderRadius: '4px', color: '#7c3aed', fontSize: '0.85rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.8rem', color: '#7c3aed' }}>Minutes per bar</span>
              </div>
            )}
          </div>

          {/* Test Data Period Presets (Data Set Collection) */}
          <div style={{ minWidth: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: isDark ? '#38bdf8' : '#2563eb', fontWeight: 700 }}>
                ⏱️ Test Data Period Presets
              </label>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                {fromDate} → {toDate}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              background: subCardBg,
              padding: '6px 8px',
              borderRadius: '6px',
              border: `1px solid ${subCardBorder}`,
              alignItems: 'center',
            }}>
              {[
                { id: '1M', label: '1 Month' },
                { id: '3M', label: '3 Months' },
                { id: '6M', label: '6 Months' },
                { id: '1Y', label: '1 Year' },
                { id: '3Y', label: '3 Years' },
                { id: '5Y', label: '5 Years' },
                { id: 'FULL2026', label: '2026' },
                { id: 'YTD', label: 'YTD' },
              ].map(p => {
                const isActive = activeDatePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id)}
                    style={{
                      background: isActive ? '#2563eb' : cardBg,
                      color: isActive ? '#ffffff' : textMuted,
                      border: isActive ? '1px solid #2563eb' : `1px solid ${subCardBorder}`,
                      padding: '5px 9px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 0 10px rgba(37, 99, 235, 0.35)' : 'none',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ROW 2: Capital, Lot Size, Target, Stop Loss, Trailing SL & Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginTop: '16px', borderTop: `1px solid ${cardBorder}`, paddingTop: '16px' }}>
          
          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Initial Capital (₹)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Lot Size (Qty)</label>
            <input
              type="number"
              value={lotSize}
              onChange={(e) => setLotSize(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Target (Points)</label>
            <input
              type="number"
              value={targetPoints}
              onChange={(e) => setTargetPoints(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Stop Loss (Points)</label>
            <input
              type="number"
              value={stopLossPoints}
              onChange={(e) => setStopLossPoints(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: textMuted, display: 'block', marginBottom: '4px', fontWeight: 700 }}>Trailing SL (Points)</label>
            <input
              type="number"
              value={trailingSL}
              onChange={(e) => setTrailingSL(Number(e.target.value))}
              style={{ width: '100%', padding: '7px 10px', background: subCardBg, border: `1px solid ${subCardBorder}`, borderRadius: '4px', color: textDark, fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button
              onClick={() => setShowRulesEditor(!showRulesEditor)}
              style={{
                flex: 1,
                background: showRulesEditor ? '#1e3a8a50' : '#1e293b',
                color: showRulesEditor ? '#60a5fa' : '#cbd5e1',
                border: `1px solid ${showRulesEditor ? '#3b82f6' : '#475569'}`,
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Expand/Collapse Strategy Rules and Indicator Matrix"
            >
              ⚙️ {showRulesEditor ? 'Hide Rules Matrix' : `Edit Rules (${totalRulesCount})`}
            </button>

            <button
              onClick={handleRunBacktest}
              disabled={running}
              style={{
                flex: 1.4,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {running ? '⏳ Simulating Bars...' : '⚡ Run Backtest'}
            </button>
          </div>
        </div>

        {/* ─── EXPANDABLE MULTI-INDICATOR RULES & CONDITIONS MATRIX ─── */}
        {showRulesEditor && (
          <div style={{
            marginTop: '20px',
            borderTop: '1px solid #334155',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  Multi-Indicator Strategy Rules Matrix & Indicators
                </span>
                <span style={{ fontSize: '0.75rem', background: '#3b82f620', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px' }}>
                  {longConditions.length} Long • {shortConditions.length} Short • {exitConditions.length} Exit
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSavePolicy}
                  disabled={savingPolicy}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {savingPolicy ? 'Saving...' : '💾 Save Changes to Policy'}
                </button>
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                Strategy Description & Setup Notes
              </label>
              <input
                type="text"
                value={policyDescription}
                onChange={(e) => setPolicyDescription(e.target.value)}
                placeholder="e.g. Extreme Bollinger breakdown (%B < 0) on constituent stocks..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            {/* Long (CE) Conditions */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #10b98140' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34d399' }}>
                    🟢 Long (CE) Entry Rules
                  </span>
                  {/* Logic Switcher: AND vs OR */}
                  <div style={{ display: 'flex', background: '#1e293b', borderRadius: '4px', padding: '2px', border: '1px solid #334155' }}>
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
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Add Long Rule
                </button>
              </div>

              {longConditions.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No long entry rules specified.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        condition={cond}
                        onChange={(field, val) => updateCondition('LONG', i, field, val)}
                        onRemove={() => removeCondition('LONG', i)}
                      />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Short (PE) Conditions */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #ef444440' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f87171' }}>
                    🔴 Short (PE) Entry Rules
                  </span>
                  {/* Logic Switcher: AND vs OR */}
                  <div style={{ display: 'flex', background: '#1e293b', borderRadius: '4px', padding: '2px', border: '1px solid #334155' }}>
                    <button
                      type="button"
                      onClick={() => setShortLogic('AND')}
                      style={{
                        background: shortLogic === 'AND' ? '#ef4444' : 'transparent',
                        color: shortLogic === 'AND' ? 'white' : '#94a3b8',
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
                        background: shortLogic === 'OR' ? '#b91c1c' : 'transparent',
                        color: shortLogic === 'OR' ? 'white' : '#94a3b8',
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
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Add Short Rule
                </button>
              </div>

              {shortConditions.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No short entry rules specified. Click "+ Add Short Rule" to add PE entry criteria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {shortConditions.map((cond, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '2px 0' }}>
                          <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                          <span
                            onClick={() => setShortLogic(shortLogic === 'AND' ? 'OR' : 'AND')}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 9px',
                              borderRadius: '10px',
                              background: shortLogic === 'AND' ? '#7f1d1d' : '#92400e',
                              color: shortLogic === 'AND' ? '#fecaca' : '#fde68a',
                              border: `1px solid ${shortLogic === 'AND' ? '#ef4444' : '#f59e0b'}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                            title="Click to toggle between AND / OR logic"
                          >
                            {shortLogic} ⮂
                          </span>
                          <div style={{ height: '1px', flex: 1, background: '#334155' }} />
                        </div>
                      )}
                      <ConditionRow
                        condition={cond}
                        onChange={(field, val) => updateCondition('SHORT', i, field, val)}
                        onRemove={() => removeCondition('SHORT', i)}
                      />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Exit Conditions */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #f59e0b40' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fbbf24' }}>
                    🟡 Indicator Exit Conditions
                  </span>
                  {/* Logic Switcher: OR vs AND */}
                  <div style={{ display: 'flex', background: '#1e293b', borderRadius: '4px', padding: '2px', border: '1px solid #334155' }}>
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
                  style={{ background: '#f59e0b', color: 'black', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  + Add Exit Rule
                </button>
              </div>

              {exitConditions.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Exits default strictly to Target Points (+{targetPoints}) and Stop Loss (-{stopLossPoints}).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {exitConditions.map((cond, i) => (
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
                        condition={cond}
                        isExit={true}
                        onChange={(field, val) => updateCondition('EXIT', i, field, val)}
                        onRemove={() => removeCondition('EXIT', i)}
                      />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Custom TradingView Pine Inbuilder */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #8b5cf640' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="tv_toggle_bt"
                    checked={tvEnabled}
                    onChange={(e) => setTvEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="tv_toggle_bt" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c084fc', cursor: 'pointer' }}>
                    🌲 Custom TradingView Pine Script Inbuilder
                  </label>
                </div>
                {tvEnabled && (
                  <span style={{ fontSize: '0.72rem', background: '#8b5cf620', color: '#c084fc', padding: '2px 8px', borderRadius: '4px' }}>
                    Pine Script Active
                  </span>
                )}
              </div>

              {tvEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <textarea
                    rows={2}
                    value={tvExpression}
                    onChange={(e) => setTvExpression(e.target.value)}
                    placeholder="e.g. close > ta.ema(close, 20) and ta.rsi(close, 14) > 50 and volume > ta.sma(volume, 20) * 1.5"
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#1e293b',
                      border: '1px solid #8b5cf6',
                      borderRadius: '4px',
                      color: '#a78bfa',
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Supported functions: <code>close, open, high, low, volume, ta.rsi(period), ta.ema(period), ta.sma(period), ta.bb_lower(), ta.donchian_upper()</code>.
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ─── RESULTS DASHBOARD ─── */}
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Executive Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: `1px solid ${result.summary.netProfit >= 0 ? '#10b981' : '#ef4444'}`, boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Net Profit</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: result.summary.netProfit >= 0 ? '#059669' : '#dc2626', marginTop: '4px' }}>
                {result.summary.netProfit >= 0 ? '+' : ''}₹{result.summary.netProfit.toLocaleString('en-IN')}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: '6px' }}>
                  ({result.summary.returnPct}%)
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                End Capital: ₹{result.summary.endingCapital.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: '1px solid #38bdf8', boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Win Rate (Success %)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                {result.summary.winRate}%
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                {result.summary.winningTrades} W / {result.summary.losingTrades} L ({result.summary.totalTrades} total)
              </div>
            </div>

            <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: '1px solid #f59e0b', boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Profit Factor</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                {result.summary.profitFactor}
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                Gross Wins vs Losses
              </div>
            </div>

            <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: '1px solid #ef4444', boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Max Drawdown</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                {result.summary.maxDrawdownPct}%
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                -₹{result.summary.maxDrawdown.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ background: cardBg, padding: '16px', borderRadius: '8px', border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.72rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Bars Tested ({getActiveTimeframe()})</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
                {result.summary.candlesEvaluated}
              </div>
              <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '2px' }}>
                {result.summary.fromDate} to {result.summary.toDate}
              </div>
            </div>
          </div>

          {/* Equity Curve SVG */}
          {result.equityCurve && result.equityCurve.length > 1 && (
            <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${cardBorder}`, padding: '16px', boxShadow: cardShadow }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: headerText, marginBottom: '8px' }}>
                📈 Portfolio Equity Curve Progression
              </div>
              <EquityCurveSVG points={result.equityCurve} />
            </div>
          )}

          {/* Trades Log Table with Constituent Stock & Exact Trigger Time */}
          <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${cardBorder}`, padding: '16px', boxShadow: cardShadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: headerText }}>
                📋 Detailed Trade Execution Log ({filteredTrades.length} trades)
                <span style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 400, marginLeft: '6px' }}>
                  Simulated on constituent stocks of {result.summary.symbol}
                </span>
              </div>

              {/* Comprehensive Filter Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['ALL', 'WIN', 'LOSS'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTradeFilter(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: tradeFilter === t ? '#2563eb' : subCardBg,
                        color: tradeFilter === t ? 'white' : textMuted,
                        border: '1px solid ' + (tradeFilter === t ? '#2563eb' : subCardBorder),
                      }}
                    >
                      {t === 'ALL' && `All (${result.trades.length})`}
                      {t === 'WIN' && `🟢 Win (${result.trades.filter(x => x.pnl > 0).length})`}
                      {t === 'LOSS' && `🔴 Loss (${result.trades.filter(x => x.pnl < 0).length})`}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { id: 'ALL', label: 'All Types' },
                    { id: 'LONG', label: 'Long' },
                    { id: 'SHORT', label: 'Short' },
                  ].map(dt => (
                    <button
                      key={dt.id}
                      onClick={() => setTradeTypeFilter(dt.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: tradeTypeFilter === dt.id ? '#7c3aed' : subCardBg,
                        color: tradeTypeFilter === dt.id ? 'white' : textMuted,
                        border: '1px solid ' + (tradeTypeFilter === dt.id ? '#7c3aed' : subCardBorder),
                      }}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="🔍 Search stock, date, reason..."
                  value={tradeSearch}
                  onChange={(e) => setTradeSearch(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${subCardBorder}`,
                    background: subCardBg,
                    color: textDark,
                    fontSize: '0.75rem',
                    outline: 'none',
                    width: '180px',
                  }}
                />

                {(tradeFilter !== 'ALL' || tradeTypeFilter !== 'ALL' || tradeSearch) && (
                  <button
                    onClick={() => {
                      setTradeFilter('ALL');
                      setTradeTypeFilter('ALL');
                      setTradeSearch('');
                    }}
                    style={{
                      background: subCardBg,
                      color: textMuted,
                      border: `1px solid ${subCardBorder}`,
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                  >
                    Reset ✕
                  </button>
                )}
              </div>
            </div>

            {filteredTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: textMuted, fontSize: '0.85rem' }}>
                No trades match this filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '450px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${cardBorder}`, color: isDark ? '#94a3b8' : '#1e40af', position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#eff6ff', zIndex: 10, fontWeight: 700 }}>
                      <th style={{ padding: '8px' }}>#</th>
                      <th
                        onClick={() => handleTradeSort('stock')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by stock"
                      >
                        Stock / Instrument {tradeSortCol === 'stock' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('type')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by type"
                      >
                        Type {tradeSortCol === 'type' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('entryTime')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by exact trigger time"
                      >
                        Exact Trigger Time {tradeSortCol === 'entryTime' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('entryPrice')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by entry price"
                      >
                        Entry (₹) {tradeSortCol === 'entryPrice' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('exitTime')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by exit time"
                      >
                        Exit Time {tradeSortCol === 'exitTime' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('exitPrice')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by exit price"
                      >
                        Exit (₹) {tradeSortCol === 'exitPrice' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('points')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by points"
                      >
                        Points {tradeSortCol === 'points' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('pnl')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by PnL"
                      >
                        P&L (₹) {tradeSortCol === 'pnl' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('exitReason')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by exit reason"
                      >
                        Exit Reason {tradeSortCol === 'exitReason' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => handleTradeSort('capitalAfter')}
                        style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by ending balance"
                      >
                        Balance After {tradeSortCol === 'capitalAfter' ? (tradeSortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((tr, idx) => (
                      <tr key={tr.id || idx} style={{ borderBottom: `1px solid ${cardBorder}`, background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.015)' : '#f8fafc') }}>
                        <td style={{ padding: '8px', color: textMuted }}>{idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              background: subCardBg,
                              border: `1px solid ${subCardBorder}`,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              color: isDark ? '#38bdf8' : '#2563eb',
                              fontFamily: 'monospace',
                              fontSize: '0.78rem',
                            }}>
                              {tr.stock || symbol}
                            </span>
                            {tr.stockName && (
                              <span style={{ fontSize: '0.72rem', color: textMuted, whiteSpace: 'nowrap' }}>
                                {tr.stockName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px', fontWeight: 700, color: tr.type === 'LONG' ? '#059669' : '#dc2626' }}>
                          {tr.type}
                        </td>
                        <td style={{ padding: '8px', color: textDark, whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#d97706', marginRight: '4px' }}>⏰</span>
                          {tr.entryTime || tr.entryDate}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: textDark }}>₹{tr.entryPrice}</td>
                        <td style={{ padding: '8px', color: textDark, whiteSpace: 'nowrap' }}>
                          {tr.exitTime || tr.exitDate}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: textDark }}>₹{tr.exitPrice}</td>
                        <td style={{ padding: '8px', fontWeight: 700, color: tr.points >= 0 ? '#059669' : '#dc2626' }}>
                          {tr.points >= 0 ? '+' : ''}{tr.points} pts
                        </td>
                        <td style={{ padding: '8px', fontWeight: 800, color: tr.pnl >= 0 ? '#059669' : '#dc2626' }}>
                          {tr.pnl >= 0 ? '+' : ''}₹{tr.pnl.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px', color: textMuted }}>{tr.exitReason}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: textDark }}>₹{tr.capitalAfter?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div style={{ background: subCardBg, border: `1px dashed ${cardBorder}`, borderRadius: '8px', padding: '50px 20px', textAlign: 'center', color: textMuted }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🧪</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: textDark }}>Ready to Backtest Strategy</div>
          <div style={{ fontSize: '0.85rem', marginTop: '6px', maxWidth: '540px', margin: '6px auto 18px' }}>
            All settings above are fully editable. Customize your policy name, target universe, timeframes, date ranges, and indicator rules in the matrix above, then click <b>"Run Backtest"</b>.
          </div>
        </div>
      )}

      {/* ─── STOCK UNIVERSE SELECTOR MODAL ─── */}
      {showInstModal && (
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
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '12px',
            maxWidth: '820px',
            width: '100%',
            padding: '24px',
            color: textDark,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Select Stock Universe
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  Select universe basket to backtest: Nifty 50, Nifty 100, Nifty 200, F&O Stocks, All Stocks, Options, or MCX.
                </div>
              </div>
              <button
                onClick={() => setShowInstModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search universe (e.g., Nifty 100, Nifty 200, F&O, All stocks, MCX)..."
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

            {/* Universe List (Multi-Selectable) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '12px',
              paddingRight: '4px',
            }}>
              {displayedUniverses.map(uni => {
                const isSelected = selectedUniverses.some(s => s.toLowerCase() === uni.symbol.toLowerCase() || s.toLowerCase() === uni.name.toLowerCase());
                return (
                  <div
                    key={uni.id}
                    onClick={() => toggleUniverseSelection(uni.symbol)}
                    style={{
                      background: isSelected ? '#1e3a8a30' : '#0f172a',
                      border: `1.5px solid ${isSelected ? '#3b82f6' : '#334155'}`,
                      borderRadius: '8px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#3b82f6' : '#64748b'}`,
                            background: isSelected ? '#3b82f6' : 'transparent',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <span style={{ fontSize: '1.25rem' }}>{uni.icon}</span>
                          <span style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f8fafc', fontSize: '0.95rem' }}>
                            {uni.symbol}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', background: '#3b82f620', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {uni.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '8px', paddingLeft: '28px' }}>
                        {uni.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '8px', marginTop: '4px', paddingLeft: '28px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                        📊 {uni.stockCount} {uni.category === 'MCX' ? 'Commodities' : uni.category === 'OPTIONS' ? 'Indices' : 'Instruments'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#1e293b', padding: '1px 6px', borderRadius: '3px' }}>
                        {uni.exchange}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                Selected: <strong>{selectedUniverses.length} universes</strong> ({totalConstituentCount} total instruments)
              </div>
              <button
                onClick={() => setShowInstModal(false)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                Apply Selection ({selectedUniverses.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Sub-Component: Equity Curve SVG ──────────────────────────────────────────

function EquityCurveSVG({ points }) {
  const width = 850;
  const height = 220;
  const padding = 36;

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
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: '240px' }}>
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
