import React, { useState, useRef, useEffect } from 'react';
import InteractiveChartTile, { CHART_INSTRUMENTS } from './InteractiveChartTile';
import { useTradingStore } from '../store/tradingStore';
import toast from 'react-hot-toast';

// ─── SVG Layout Icons Matching Image 1 ──────────────────────────────────────────

const LayoutIcon = ({ type, active, size = { w: 32, h: 24 } }) => {
  const stroke = active ? '#ffffff' : '#64748b';
  const fill = active ? 'rgba(255, 255, 255, 0.15)' : 'transparent';
  const sw = active ? 1.8 : 1.3;

  switch (type) {
    // 1 Chart
    case '1':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
        </svg>
      );

    // 2 Charts
    case '2-v':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '2-h':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );

    // 3 Charts
    case '3-v':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="9.5" y1="1" x2="9.5" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="18.5" y1="1" x2="18.5" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '3-h':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="7" x2="27" y2="7" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="13.5" x2="27" y2="13.5" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '3-left-split':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '3-right-split':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="10" x2="14" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '3-top-split':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="10" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '3-bottom-split':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="1" x2="14" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );

    // 4 Charts
    case '4-grid':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-h':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="5.5" x2="27" y2="5.5" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="14.5" x2="27" y2="14.5" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-v':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="7.5" y1="1" x2="7.5" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="20.5" y1="1" x2="20.5" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-left-3':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="7" x2="27" y2="7" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="13.5" x2="27" y2="13.5" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-right-3':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="7" x2="14" y2="7" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="13.5" x2="14" y2="13.5" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-top-3':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="9.5" y1="10" x2="9.5" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="18.5" y1="10" x2="18.5" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-bottom-3':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="9.5" y1="1" x2="9.5" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="18.5" y1="1" x2="18.5" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case '4-unequal':
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="10" y1="1" x2="10" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="18" y1="10" x2="18" y2="19" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    default:
      return (
        <svg width={size.w} height={size.h} viewBox="0 0 28 20" fill="none">
          <rect x="1" y="1" width="26" height="18" rx="2" stroke={stroke} strokeWidth={sw} fill={fill} />
          <line x1="14" y1="1" x2="14" y2="19" stroke={stroke} strokeWidth={sw} />
          <line x1="1" y1="10" x2="27" y2="10" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
  }
};

export default function RealtimeChartView() {
  const { setActivePage, theme, toggleTheme } = useTradingStore();

  // Grid layout options matching Image 1:
  // 1, 2-v, 2-h, 3-v, 3-h, 3-left-split, 3-right-split, 3-top-split, 3-bottom-split,
  // 4-grid, 4-h, 4-v, 4-left-3, 4-right-3, 4-top-3, 4-bottom-3, 4-unequal
  const [layout, setLayout] = useState('2-v'); // Matching image 1 selection (2 vertical charts)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuRef = useRef(null);

  // Global Mode Toggle: Real Trade vs Paper Mode
  const [isRealTradeMode, setIsRealTradeMode] = useState(false);

  // Configuration for up to 4 charts
  const [charts, setCharts] = useState([
    { id: 'c1', symbol: 'NIFTY', timeframe: '5m', chartType: 'candlestick' },
    { id: 'c2', symbol: 'BANKNIFTY', timeframe: '5m', chartType: 'heikinashi' },
    { id: 'c3', symbol: 'SENSEX', timeframe: '15m', chartType: 'renko' },
    { id: 'c4', symbol: 'CRUDEOIL', timeframe: '5m', chartType: 'volume_candle' },
  ]);

  // Close layout popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target)) {
        setShowLayoutMenu(false);
      }
    }
    if (showLayoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutMenu]);

  // Determine which charts are visible
  const getVisibleCharts = () => {
    if (layout === '1') return charts.slice(0, 1);
    if (layout === '2-v' || layout === '2-h') return charts.slice(0, 2);
    if (['3-v', '3-h', '3-left-split', '3-right-split', '3-top-split', '3-bottom-split'].includes(layout)) {
      return charts.slice(0, 3);
    }
    return charts.slice(0, 4);
  };

  // Grid Container Style
  const getGridStyle = () => {
    const base = {
      display: 'grid',
      height: 'calc(100vh - 165px)',
      gap: '8px',
      overflow: 'hidden',
    };

    switch (layout) {
      case '1':
        return { ...base, gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
      case '2-v':
        return { ...base, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
      case '2-h':
        return { ...base, gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr' };
      case '3-v':
        return { ...base, gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr' };
      case '3-h':
        return { ...base, gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr 1fr' };
      case '3-left-split':
      case '3-right-split':
      case '3-top-split':
      case '3-bottom-split':
        return { ...base, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
      case '4-grid':
      default:
        return { ...base, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
      case '4-v':
        return { ...base, gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr' };
      case '4-h':
        return { ...base, gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr 1fr 1fr' };
      case '4-left-3':
      case '4-right-3':
        return { ...base, gridTemplateColumns: '1.2fr 1fr', gridTemplateRows: '1fr 1fr 1fr' };
      case '4-top-3':
      case '4-bottom-3':
        return { ...base, gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' };
      case '4-unequal':
        return { ...base, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
    }
  };

  // Individual Chart Pane Style for Asymmetric Layouts
  const getChartPaneStyle = (index) => {
    switch (layout) {
      case '3-left-split':
        if (index === 0) return { gridColumn: '1', gridRow: '1 / span 2', minHeight: 0 };
        if (index === 1) return { gridColumn: '2', gridRow: '1', minHeight: 0 };
        if (index === 2) return { gridColumn: '2', gridRow: '2', minHeight: 0 };
        return { minHeight: 0 };
      case '3-right-split':
        if (index === 0) return { gridColumn: '1', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '1', gridRow: '2', minHeight: 0 };
        if (index === 2) return { gridColumn: '2', gridRow: '1 / span 2', minHeight: 0 };
        return { minHeight: 0 };
      case '3-top-split':
        if (index === 0) return { gridColumn: '1 / span 2', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '1', gridRow: '2', minHeight: 0 };
        if (index === 2) return { gridColumn: '2', gridRow: '2', minHeight: 0 };
        return { minHeight: 0 };
      case '3-bottom-split':
        if (index === 0) return { gridColumn: '1', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '2', gridRow: '1', minHeight: 0 };
        if (index === 2) return { gridColumn: '1 / span 2', gridRow: '2', minHeight: 0 };
        return { minHeight: 0 };
      case '4-left-3':
        if (index === 0) return { gridColumn: '1', gridRow: '1 / span 3', minHeight: 0 };
        if (index === 1) return { gridColumn: '2', gridRow: '1', minHeight: 0 };
        if (index === 2) return { gridColumn: '2', gridRow: '2', minHeight: 0 };
        if (index === 3) return { gridColumn: '2', gridRow: '3', minHeight: 0 };
        return { minHeight: 0 };
      case '4-right-3':
        if (index === 0) return { gridColumn: '1', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '1', gridRow: '2', minHeight: 0 };
        if (index === 2) return { gridColumn: '1', gridRow: '3', minHeight: 0 };
        if (index === 3) return { gridColumn: '2', gridRow: '1 / span 3', minHeight: 0 };
        return { minHeight: 0 };
      case '4-top-3':
        if (index === 0) return { gridColumn: '1 / span 3', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '1', gridRow: '2', minHeight: 0 };
        if (index === 2) return { gridColumn: '2', gridRow: '2', minHeight: 0 };
        if (index === 3) return { gridColumn: '3', gridRow: '2', minHeight: 0 };
        return { minHeight: 0 };
      case '4-bottom-3':
        if (index === 0) return { gridColumn: '1', gridRow: '1', minHeight: 0 };
        if (index === 1) return { gridColumn: '2', gridRow: '1', minHeight: 0 };
        if (index === 2) return { gridColumn: '3', gridRow: '1', minHeight: 0 };
        if (index === 3) return { gridColumn: '1 / span 3', gridRow: '2', minHeight: 0 };
        return { minHeight: 0 };
      default:
        return { minHeight: 0 };
    }
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '12px 18px',
      height: 'calc(100vh - 54px)',
      boxSizing: 'border-box',
      background: isDark ? 'var(--color-bg-primary)' : '#f8fafc',
      color: isDark ? 'var(--color-text-primary)' : '#0f172a',
      position: 'relative',
    }}>
      
      {/* ─── MASTER HEADER CONTROLS (TRADINGVIEW LAYOUT SELECTOR, MODE TOGGLE, QUICK DESK) ─── */}
      <div style={{
        background: isDark ? 'var(--color-bg-secondary)' : '#ffffff',
        border: isDark ? '1px solid var(--color-border)' : '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Title & Features */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
          }}>
            📈
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Multi-Chart Pro Terminal</span>
              <span style={{ fontSize: '0.65rem', background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f650', padding: '1px 6px', borderRadius: '4px' }}>
                Last 15 Days History
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              15-Day Realtime OHLCV • Candlesticks, Heikin-Ashi, Renko, Volume Candles • Supertrend, VWAP, Pivots, EMA • Pine Script
            </div>
          </div>
        </div>

        {/* Center: TradingView Layout Picker Button (Exact Image 1 Dropdown) */}
        <div style={{ position: 'relative' }} ref={layoutMenuRef}>
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showLayoutMenu ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-bg-elevated)',
              border: showLayoutMenu ? '1px solid #3b82f6' : '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '5px 10px',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Select Multi-Chart Layout"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LayoutIcon type={layout} active={true} size={{ w: 26, h: 18 }} />
              <span style={{ fontSize: '0.76rem', fontWeight: 700, marginLeft: '4px' }}>Layout</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{showLayoutMenu ? '▲' : '▼'}</span>
          </button>

          {/* ─── POPUP POPOVER MENU (MATCHING EXACT IMAGE 1) ─── */}
          {showLayoutMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 9999,
              background: isDark ? '#111827' : '#ffffff',
              border: isDark ? '1px solid #374151' : '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '12px 14px',
              boxShadow: isDark ? '0 16px 36px rgba(0, 0, 0, 0.75)' : '0 16px 36px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '290px',
            }}>
              
              {/* Row 1: 1 Chart */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '8px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                <span style={{ width: '16px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>1</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => { setLayout('1'); setShowLayoutMenu(false); }}
                    style={{
                      background: layout === '1' ? (isDark ? '#1f2937' : '#f1f5f9') : 'transparent',
                      border: layout === '1' ? '2px solid #ffffff' : (isDark ? '1px solid transparent' : '1px solid #e2e8f0'),
                      borderRadius: '5px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                    }}
                    title="Single Chart (1)"
                  >
                    <LayoutIcon type="1" active={layout === '1'} size={{ w: 26, h: 18 }} />
                  </button>
                </div>
              </div>

              {/* Row 2: 2 Charts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '8px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                <span style={{ width: '16px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>2</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* 2 Vertical */}
                  <button
                    onClick={() => { setLayout('2-v'); setShowLayoutMenu(false); }}
                    style={{
                      background: layout === '2-v' ? (isDark ? '#1f2937' : '#f1f5f9') : 'transparent',
                      border: layout === '2-v' ? '2px solid #ffffff' : (isDark ? '1px solid transparent' : '1px solid #e2e8f0'),
                      borderRadius: '5px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                    }}
                    title="2 Charts Vertical Split"
                  >
                    <LayoutIcon type="2-v" active={layout === '2-v'} size={{ w: 26, h: 18 }} />
                  </button>
                  {/* 2 Horizontal */}
                  <button
                    onClick={() => { setLayout('2-h'); setShowLayoutMenu(false); }}
                    style={{
                      background: layout === '2-h' ? (isDark ? '#1f2937' : '#f1f5f9') : 'transparent',
                      border: layout === '2-h' ? '2px solid #ffffff' : (isDark ? '1px solid transparent' : '1px solid #e2e8f0'),
                      borderRadius: '5px',
                      padding: '4px 6px',
                      cursor: 'pointer',
                    }}
                    title="2 Charts Horizontal Split"
                  >
                    <LayoutIcon type="2-h" active={layout === '2-h'} size={{ w: 26, h: 18 }} />
                  </button>
                </div>
              </div>

              {/* Row 3: 3 Charts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '8px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                <span style={{ width: '16px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>3</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: '3-v', title: '3 Charts Vertical Columns' },
                    { id: '3-h', title: '3 Charts Horizontal Rows' },
                    { id: '3-left-split', title: '3 Charts: 1 Left, 2 Right Stacked' },
                    { id: '3-right-split', title: '3 Charts: 2 Left Stacked, 1 Right' },
                    { id: '3-top-split', title: '3 Charts: 1 Top, 2 Bottom Columns' },
                    { id: '3-bottom-split', title: '3 Charts: 2 Top Columns, 1 Bottom' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setLayout(item.id); setShowLayoutMenu(false); }}
                      style={{
                        background: layout === item.id ? (isDark ? '#1f2937' : '#f1f5f9') : 'transparent',
                        border: layout === item.id ? '2px solid #ffffff' : (isDark ? '1px solid transparent' : '1px solid #e2e8f0'),
                        borderRadius: '5px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                      }}
                      title={item.title}
                    >
                      <LayoutIcon type={item.id} active={layout === item.id} size={{ w: 26, h: 18 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: 4 Charts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ width: '16px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>4</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: '4-grid', title: '4 Charts: 2x2 Quad Grid' },
                    { id: '4-h', title: '4 Charts Horizontal Rows' },
                    { id: '4-v', title: '4 Charts Vertical Columns' },
                    { id: '4-left-3', title: '4 Charts: 1 Left, 3 Right Stacked' },
                    { id: '4-right-3', title: '4 Charts: 3 Left Stacked, 1 Right' },
                    { id: '4-top-3', title: '4 Charts: 1 Top, 3 Bottom Columns' },
                    { id: '4-bottom-3', title: '4 Charts: 3 Top Columns, 1 Bottom' },
                    { id: '4-unequal', title: '4 Charts: Asymmetric 2x2' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setLayout(item.id); setShowLayoutMenu(false); }}
                      style={{
                        background: layout === item.id ? (isDark ? '#1f2937' : '#f1f5f9') : 'transparent',
                        border: layout === item.id ? '2px solid #ffffff' : (isDark ? '1px solid transparent' : '1px solid #e2e8f0'),
                        borderRadius: '5px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                      }}
                      title={item.title}
                    >
                      <LayoutIcon type={item.id} active={layout === item.id} size={{ w: 26, h: 18 }} />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Side: Global Real vs Paper Trading Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--color-bg-primary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => {
                setIsRealTradeMode(false);
                toast.success('Switched to 📝 Paper Trading Mode (Simulated Execution)');
              }}
              style={{
                background: !isRealTradeMode ? '#10b981' : 'transparent',
                color: !isRealTradeMode ? '#0f172a' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📝 Paper Mode
            </button>
            <button
              onClick={() => {
                setIsRealTradeMode(true);
                toast('Switched to 🔴 Real Trade Mode (Dhan HQ / Kotak Neo API)', { icon: '⚠️' });
              }}
              style={{
                background: isRealTradeMode ? '#ef4444' : 'transparent',
                color: isRealTradeMode ? 'white' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🔴 Real Trade (Dhan / Kotak)
            </button>
          </div>

          {/* Quick links to Order Book & Positions, and Theme Switcher */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              title="Toggle White / Dark Theme"
              style={{
                background: isDark ? '#1e293b' : '#f1f5f9',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isDark ? '☀️ Clean White' : '🌙 Dark Blue'}
            </button>
            <button
              onClick={() => setActivePage('order-book')}
              className="btn btn-ghost btn-sm"
              style={{ background: isDark ? 'var(--color-bg-elevated)' : '#f8fafc', border: isDark ? '1px solid var(--color-border)' : '1px solid #cbd5e1', color: isDark ? 'var(--color-text-secondary)' : '#334155', fontSize: '0.74rem', padding: '4px 10px' }}
            >
              📑 Orders
            </button>
            <button
              onClick={() => setActivePage('positions')}
              className="btn btn-ghost btn-sm"
              style={{ background: isDark ? 'var(--color-bg-elevated)' : '#f8fafc', border: isDark ? '1px solid var(--color-border)' : '1px solid #cbd5e1', color: isDark ? 'var(--color-text-secondary)' : '#334155', fontSize: '0.74rem', padding: '4px 10px' }}
            >
              💼 Positions
            </button>
          </div>
        </div>
      </div>

      {/* ─── MULTI-CHART GRID VIEWPORT (LAST 15 DAYS) ─── */}
      <div style={getGridStyle()}>
        {getVisibleCharts().map((chartConfig, idx) => (
          <div key={chartConfig.id} style={getChartPaneStyle(idx)}>
            <InteractiveChartTile
              id={chartConfig.id}
              initialSymbol={chartConfig.symbol}
              initialTimeframe={chartConfig.timeframe}
              initialChartType={chartConfig.chartType}
              isRealTradeMode={isRealTradeMode}
            />
          </div>
        ))}
      </div>

    </div>
  );
}
