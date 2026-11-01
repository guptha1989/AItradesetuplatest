import React, { useState } from 'react';

export const DEFAULT_INDICATOR_SETTINGS = {
  ema9: { enabled: true, period: 9, color: '#38bdf8', lineWidth: 1.5, title: 'EMA Fast' },
  ema21: { enabled: true, period: 21, color: '#f97316', lineWidth: 1.5, title: 'EMA Slow' },
  ema200: { enabled: true, period: 200, color: '#eab308', lineWidth: 2.5, title: 'EMA 200 (Trend Baseline)' },
  supertrend: { enabled: true, period: 10, multiplier: 3.0, upColor: '#10b981', downColor: '#ef4444', lineWidth: 2.0 },
  vwap: { enabled: true, color: '#c084fc', lineWidth: 1.5, lineStyle: 2, title: 'Session VWAP' },
  bollinger: { enabled: false, period: 20, mult: 2.0, color: '#60a5fa', lineWidth: 1.0 },
  keltner: { enabled: false, length: 20, mult: 2.0, atrLength: 10, color: '#f59e0b', lineWidth: 1.0 },
  donchian: { enabled: false, length: 20, color: '#10b981', lineWidth: 1.5 },
  rsi: { enabled: false, period: 14, overbought: 70, oversold: 30, color: '#a855f7' },
  macd: { enabled: false, fast: 12, slow: 26, signal: 9, upColor: '#10b981', downColor: '#ef4444' },
  adx: { enabled: false, length: 14, threshold: 25, color: '#38bdf8' },
  pivots: { enabled: false, color: '#f59e0b' },
};

export default function IndicatorSettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [localConfig, setLocalConfig] = useState(() => ({ ...DEFAULT_INDICATOR_SETTINGS, ...(settings || {}) }));
  const [activeTab, setActiveTab] = useState('movingAverages');

  if (!isOpen) return null;

  const updateIndicator = (key, field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const handleApply = () => {
    onSaveSettings(localConfig);
    onClose();
  };

  const handleResetToDefaults = () => {
    setLocalConfig(DEFAULT_INDICATOR_SETTINGS);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '680px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        background: '#ffffff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        boxShadow: '0 24px 48px -12px rgba(37, 99, 235, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#0f172a',
      }}>
        
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Technical Indicator Settings &amp; Parameters
            </div>
            <div style={{ fontSize: '0.74rem', color: '#bfdbfe' }}>
              Customize calculations, periods, multipliers &amp; visual colors (Zerodha Kite &amp; Dhan standard)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4px 12px',
          gap: '6px',
          overflowX: 'auto',
        }}>
          {[
            { id: 'movingAverages', label: 'EMA / Moving Averages' },
            { id: 'supertrend', label: 'Supertrend & VWAP' },
            { id: 'bands', label: 'Bollinger & Channels' },
            { id: 'oscillators', label: 'RSI, MACD & ADX' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px',
                background: activeTab === tab.id ? '#2563eb' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TAB 1: MOVING AVERAGES */}
          {activeTab === 'movingAverages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* EMA 9 */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.ema9.enabled}
                      onChange={(e) => updateIndicator('ema9', 'enabled', e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
                    />
                    Fast Exponential Moving Average (EMA 9)
                  </label>
                  <input
                    type="color"
                    value={localConfig.ema9.color}
                    onChange={(e) => updateIndicator('ema9', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Period (Length):</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={localConfig.ema9.period}
                      onChange={(e) => updateIndicator('ema9', 'period', parseInt(e.target.value) || 9)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Line Width (px):</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      value={localConfig.ema9.lineWidth}
                      onChange={(e) => updateIndicator('ema9', 'lineWidth', parseFloat(e.target.value) || 1.5)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* EMA 21 */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.ema21.enabled}
                      onChange={(e) => updateIndicator('ema21', 'enabled', e.target.checked)}
                      style={{ accentColor: '#ea580c', width: '16px', height: '16px' }}
                    />
                    Slow Exponential Moving Average (EMA 21)
                  </label>
                  <input
                    type="color"
                    value={localConfig.ema21.color}
                    onChange={(e) => updateIndicator('ema21', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Period (Length):</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={localConfig.ema21.period}
                      onChange={(e) => updateIndicator('ema21', 'period', parseInt(e.target.value) || 21)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Line Width (px):</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      value={localConfig.ema21.lineWidth}
                      onChange={(e) => updateIndicator('ema21', 'lineWidth', parseFloat(e.target.value) || 1.5)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* EMA 200 (Image 1 Golden Baseline) */}
              <div style={{ border: '1px solid #fde047', borderRadius: '8px', padding: '14px', background: '#fefce8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#a16207', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.ema200.enabled}
                      onChange={(e) => updateIndicator('ema200', 'enabled', e.target.checked)}
                      style={{ accentColor: '#ca8a04', width: '16px', height: '16px' }}
                    />
                    Yellow Trend Baseline (EMA 200 — Image 1 Standard)
                  </label>
                  <input
                    type="color"
                    value={localConfig.ema200.color}
                    onChange={(e) => updateIndicator('ema200', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#854d0e', fontWeight: 600 }}>Period (Length):</span>
                    <input
                      type="number"
                      min="20"
                      max="500"
                      value={localConfig.ema200.period}
                      onChange={(e) => updateIndicator('ema200', 'period', parseInt(e.target.value) || 200)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fde047', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#854d0e', fontWeight: 600 }}>Line Width (px):</span>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      step="0.5"
                      value={localConfig.ema200.lineWidth}
                      onChange={(e) => updateIndicator('ema200', 'lineWidth', parseFloat(e.target.value) || 2.5)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fde047', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SUPERTREND & VWAP */}
          {activeTab === 'supertrend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Supertrend */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.supertrend.enabled}
                      onChange={(e) => updateIndicator('supertrend', 'enabled', e.target.checked)}
                      style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                    />
                    SuperTrend Algorithmic Trailing Stop
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Bull/Bear:</span>
                    <input
                      type="color"
                      value={localConfig.supertrend.upColor}
                      onChange={(e) => updateIndicator('supertrend', 'upColor', e.target.value)}
                      style={{ width: '24px', height: '22px', border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="color"
                      value={localConfig.supertrend.downColor}
                      onChange={(e) => updateIndicator('supertrend', 'downColor', e.target.value)}
                      style={{ width: '24px', height: '22px', border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>ATR Period:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={localConfig.supertrend.period}
                      onChange={(e) => updateIndicator('supertrend', 'period', parseInt(e.target.value) || 10)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Multiplier:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={localConfig.supertrend.multiplier}
                      onChange={(e) => updateIndicator('supertrend', 'multiplier', parseFloat(e.target.value) || 3.0)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Line Width:</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      value={localConfig.supertrend.lineWidth}
                      onChange={(e) => updateIndicator('supertrend', 'lineWidth', parseFloat(e.target.value) || 2.0)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* VWAP */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.vwap.enabled}
                      onChange={(e) => updateIndicator('vwap', 'enabled', e.target.checked)}
                      style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                    />
                    Volume Weighted Average Price (Session VWAP)
                  </label>
                  <input
                    type="color"
                    value={localConfig.vwap.color}
                    onChange={(e) => updateIndicator('vwap', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Strictly resets every morning at 09:15 AM Indian Market Open (Zerodha Kite &amp; Dhan standard calculation).
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: BANDS & CHANNELS */}
          {activeTab === 'bands' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Bollinger Bands */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.bollinger.enabled}
                      onChange={(e) => updateIndicator('bollinger', 'enabled', e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
                    />
                    Bollinger Bands (Volatility Envelope)
                  </label>
                  <input
                    type="color"
                    value={localConfig.bollinger.color}
                    onChange={(e) => updateIndicator('bollinger', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Period (Length):</span>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={localConfig.bollinger.period}
                      onChange={(e) => updateIndicator('bollinger', 'period', parseInt(e.target.value) || 20)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Std Dev Multiplier:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={localConfig.bollinger.mult}
                      onChange={(e) => updateIndicator('bollinger', 'mult', parseFloat(e.target.value) || 2.0)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Donchian Channels */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.donchian.enabled}
                      onChange={(e) => updateIndicator('donchian', 'enabled', e.target.checked)}
                      style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                    />
                    Donchian Channels (Breakout Levels — Image 2 Standard)
                  </label>
                  <input
                    type="color"
                    value={localConfig.donchian.color}
                    onChange={(e) => updateIndicator('donchian', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Period (Lookback Bars):</span>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={localConfig.donchian.length}
                    onChange={(e) => updateIndicator('donchian', 'length', parseInt(e.target.value) || 20)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: OSCILLATORS (RSI, MACD, ADX) */}
          {activeTab === 'oscillators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* RSI */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.rsi.enabled}
                      onChange={(e) => updateIndicator('rsi', 'enabled', e.target.checked)}
                      style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }}
                    />
                    Relative Strength Index (RSI)
                  </label>
                  <input
                    type="color"
                    value={localConfig.rsi.color}
                    onChange={(e) => updateIndicator('rsi', 'color', e.target.value)}
                    style={{ width: '32px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Period:</span>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={localConfig.rsi.period}
                      onChange={(e) => updateIndicator('rsi', 'period', parseInt(e.target.value) || 14)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Overbought:</span>
                    <input
                      type="number"
                      min="50"
                      max="95"
                      value={localConfig.rsi.overbought}
                      onChange={(e) => updateIndicator('rsi', 'overbought', parseInt(e.target.value) || 70)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Oversold:</span>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={localConfig.rsi.oversold}
                      onChange={(e) => updateIndicator('rsi', 'oversold', parseInt(e.target.value) || 30)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

              {/* MACD */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={localConfig.macd.enabled}
                      onChange={(e) => updateIndicator('macd', 'enabled', e.target.checked)}
                      style={{ accentColor: '#2563eb', width: '16px', height: '16px' }}
                    />
                    MACD (Moving Average Convergence Divergence)
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Fast Length:</span>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={localConfig.macd.fast}
                      onChange={(e) => updateIndicator('macd', 'fast', parseInt(e.target.value) || 12)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Slow Length:</span>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={localConfig.macd.slow}
                      onChange={(e) => updateIndicator('macd', 'slow', parseInt(e.target.value) || 26)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Signal Smoothing:</span>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={localConfig.macd.signal}
                      onChange={(e) => updateIndicator('macd', 'signal', parseInt(e.target.value) || 9)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={handleResetToDefaults}
            style={{
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reset Defaults
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: '#e2e8f0',
                color: '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 20px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
              }}
            >
              Apply Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

