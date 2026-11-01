import React from 'react';

export const ALL_BANDS_AND_INDICATORS = [
  {
    group: '📉 Bollinger Bands',
    options: [
      { id: 'BB_LOWER', name: 'Bollinger Lower Band (BB Lower)' },
      { id: 'BB_UPPER', name: 'Bollinger Upper Band (BB Upper)' },
      { id: 'BB_MIDDLE', name: 'Bollinger Basis / Middle (SMA)' },
      { id: 'BB_PERCENT_B', name: 'Bollinger %B (%B Oscillator)' },
      { id: 'BB_BANDWIDTH', name: 'Bollinger Bandwidth' },
    ],
  },
  {
    group: '🎯 Keltner Channels',
    options: [
      { id: 'KC_LOWER', name: 'Keltner Lower Channel (KC Lower)' },
      { id: 'KC_UPPER', name: 'Keltner Upper Channel (KC Upper)' },
      { id: 'KC_MIDDLE', name: 'Keltner Middle Basis (EMA)' },
    ],
  },
  {
    group: '📊 Donchian Channels',
    options: [
      { id: 'DC_LOWER', name: 'Donchian Lower Channel (DC Lower)' },
      { id: 'DC_UPPER', name: 'Donchian Upper Channel (DC Upper)' },
      { id: 'DC_MIDDLE', name: 'Donchian Middle Basis (DC Middle)' },
    ],
  },
  {
    group: '🕯️ Price Action',
    options: [
      { id: 'PRICE_CLOSE', name: 'Price (Close)' },
      { id: 'PRICE_OPEN', name: 'Price (Open)' },
      { id: 'PRICE_HIGH', name: 'Price (High)' },
      { id: 'PRICE_LOW', name: 'Price (Low)' },
    ],
  },
  {
    group: '📈 MACD',
    options: [
      { id: 'MACD_HIST', name: 'MACD Histogram' },
      { id: 'MACD_LINE', name: 'MACD Line' },
      { id: 'MACD_SIGNAL', name: 'MACD Signal Line' },
    ],
  },
  {
    group: '⚡ RSI & ADX',
    options: [
      { id: 'RSI', name: 'RSI (Relative Strength Index)' },
      { id: 'ADX', name: 'ADX (Trend Strength Line)' },
      { id: 'PLUS_DI', name: '+DI (Bullish Directional Movement)' },
      { id: 'MINUS_DI', name: '-DI (Bearish Directional Movement)' },
    ],
  },
  {
    group: '📊 Volume & Moving Averages',
    options: [
      { id: 'VOLUME', name: 'Bar Volume' },
      { id: 'VOLUME_SMA', name: 'Average Volume (Volume SMA)' },
      { id: 'VWAP', name: 'VWAP (Volume Weighted Avg Price)' },
      { id: 'EMA', name: 'EMA (Exponential Moving Average)' },
    ],
  },
];

const COMPARATORS = [
  { id: 'IS_BELOW', name: 'Is Below (<)' },
  { id: 'IS_ABOVE', name: 'Is Above (>)' },
  { id: 'CROSSES_BELOW', name: 'Crosses Below (Breakdown)' },
  { id: 'CROSSES_ABOVE', name: 'Crosses Above (Breakout)' },
  { id: 'EQUALS', name: 'Equals (==)' },
];

export function ConditionRow({ condition, onChange, onRemove, isExit = false }) {
  // Normalize fields
  const left = condition.left || (
    condition.indicator === 'BOLLINGER' && condition.comparator === 'LOWER_BB_BELOW_LOWER_KC' ? 'BB_LOWER' :
    condition.indicator === 'BOLLINGER' && condition.comparator === 'LOWER_BB_BELOW_ZERO' ? 'BB_LOWER' :
    condition.indicator === 'BOLLINGER' && condition.comparator === 'UPPER_BB_ABOVE_UPPER_KC' ? 'BB_UPPER' :
    condition.indicator === 'BOLLINGER' ? 'PRICE_CLOSE' :
    condition.indicator === 'KELTNER' ? 'PRICE_CLOSE' :
    condition.indicator === 'DONCHIAN' ? 'PRICE_CLOSE' :
    condition.indicator === 'MACD' ? 'MACD_HIST' :
    condition.indicator === 'RSI' ? 'RSI' :
    condition.indicator === 'ADX' ? 'ADX' :
    condition.indicator === 'VWAP' ? 'PRICE_CLOSE' :
    'PRICE_CLOSE'
  );

  const comparator = condition.comparator === 'PRICE_ABOVE' || condition.comparator === 'GREATER_THAN' || condition.comparator === 'HISTOGRAM_POSITIVE' || condition.comparator === 'UPPER_BB_ABOVE_UPPER_KC' ? 'IS_ABOVE' :
    condition.comparator === 'PRICE_BELOW' || condition.comparator === 'LESS_THAN' || condition.comparator === 'HISTOGRAM_NEGATIVE' || condition.comparator === 'LOWER_BB_BELOW_ZERO' || condition.comparator === 'LOWER_BB_BELOW_LOWER_KC' ? 'IS_BELOW' :
    condition.comparator === 'CROSS_ABOVE' || condition.comparator === 'CROSSES_ABOVE' ? 'CROSSES_ABOVE' :
    condition.comparator === 'CROSS_BELOW' || condition.comparator === 'CROSSES_BELOW' ? 'CROSSES_BELOW' :
    (condition.comparator || 'IS_BELOW');

  const rightType = condition.rightType || (
    condition.comparator === 'LOWER_BB_BELOW_LOWER_KC' ? 'INDICATOR' :
    condition.comparator === 'UPPER_BB_ABOVE_UPPER_KC' ? 'INDICATOR' :
    condition.rightIndicator ? 'INDICATOR' : 'VALUE'
  );

  const rightIndicator = condition.rightIndicator || (
    condition.comparator === 'LOWER_BB_BELOW_LOWER_KC' ? 'KC_LOWER' :
    condition.comparator === 'UPPER_BB_ABOVE_UPPER_KC' ? 'KC_UPPER' :
    condition.indicator === 'DONCHIAN' ? (condition.band === 'UPPER' ? 'DC_UPPER' : condition.band === 'LOWER' ? 'DC_LOWER' : 'DC_MIDDLE') :
    condition.indicator === 'KELTNER' ? (condition.band === 'UPPER' ? 'KC_UPPER' : condition.band === 'LOWER' ? 'KC_LOWER' : 'KC_MIDDLE') :
    condition.indicator === 'BOLLINGER' ? (condition.band === 'UPPER' ? 'BB_UPPER' : condition.band === 'LOWER' ? 'BB_LOWER' : 'BB_MIDDLE') :
    'KC_LOWER'
  );

  const rightValue = condition.rightValue !== undefined ? condition.rightValue : (condition.value !== undefined ? condition.value : 0);

  // Parameter values with defaults for Left
  const period = condition.period !== undefined ? condition.period : (left.startsWith('DC') ? 20 : left.startsWith('KC') ? 20 : left.startsWith('RSI') ? 14 : left.startsWith('ADX') ? 14 : left === 'EMA' ? 20 : 20);
  const mult = condition.mult !== undefined ? condition.mult : (left.startsWith('KC') ? 2.0 : 2.0);
  const atrPeriod = condition.atrPeriod !== undefined ? condition.atrPeriod : 10;
  const fast = condition.fast !== undefined ? condition.fast : 12;
  const slow = condition.slow !== undefined ? condition.slow : 26;
  const signal = condition.signal !== undefined ? condition.signal : 9;

  // Parameter values with defaults for Right (when comparing against another band)
  const rightPeriod = condition.rightPeriod !== undefined ? condition.rightPeriod : (rightIndicator.startsWith('DC') ? 20 : rightIndicator.startsWith('KC') ? 20 : rightIndicator.startsWith('RSI') ? 14 : rightIndicator.startsWith('ADX') ? 14 : rightIndicator === 'EMA' ? 20 : 20);
  const rightMult = condition.rightMult !== undefined ? condition.rightMult : (rightIndicator.startsWith('KC') ? 2.0 : 2.0);
  const rightAtrPeriod = condition.rightAtrPeriod !== undefined ? condition.rightAtrPeriod : 10;
  const rightFast = condition.rightFast !== undefined ? condition.rightFast : 12;
  const rightSlow = condition.rightSlow !== undefined ? condition.rightSlow : 26;
  const rightSignal = condition.rightSignal !== undefined ? condition.rightSignal : 9;

  // Exit timeframe states
  const exitTf = condition.exitTimeframe || 'SAME';
  const isCustomExitTf = condition.exitTfMode === 'CUSTOM' || !['SAME', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h'].includes(exitTf);

  const setLeft = (val) => {
    onChange('left', val);
    if (val.startsWith('BB_')) onChange('indicator', 'BOLLINGER');
    else if (val.startsWith('KC_')) onChange('indicator', 'KELTNER');
    else if (val.startsWith('DC_')) onChange('indicator', 'DONCHIAN');
    else if (val.startsWith('MACD_')) onChange('indicator', 'MACD');
    else if (val.startsWith('RSI')) onChange('indicator', 'RSI');
    else if (val === 'ADX' || val === 'PLUS_DI' || val === 'MINUS_DI') onChange('indicator', 'ADX');
    else if (val.startsWith('VOLUME')) onChange('indicator', 'VOLUME');
    else if (val === 'VWAP') onChange('indicator', 'VWAP');
    else if (val === 'EMA') onChange('indicator', 'EMA');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: '#0f172a',
      padding: '12px 14px',
      borderRadius: '8px',
      border: '1px solid #334155',
      boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
    }}>
      {/* ─── OPTIONAL EXIT TIMEFRAME SELECTOR (FOR MULTI-TIMEFRAME EXITS) ─── */}
      {isExit && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: '#7c2d1225',
          border: '1px solid #ea580c50',
          borderRadius: '6px',
          marginBottom: '2px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem' }}>🎯</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c' }}>
              Exit Execution Timeframe (Multi-Timeframe Exit Monitoring):
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={isCustomExitTf ? 'CUSTOM' : exitTf}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'CUSTOM') {
                  onChange('exitTfMode', 'CUSTOM');
                  if (exitTf === 'SAME') onChange('exitTimeframe', '1m');
                } else {
                  onChange('exitTfMode', 'PRESET');
                  onChange('exitTimeframe', val);
                }
              }}
              style={{
                padding: '4px 8px',
                background: '#0f172a',
                border: '1px solid #f97316',
                borderRadius: '4px',
                color: '#fdba74',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value="SAME">⚡ Same as Strategy Timeframe</option>
              <optgroup label="── Lower Timeframe Fast Exits ──">
                <option value="1m">⏱️ 1 Minute (Ultra Fast Scalp Exit)</option>
                <option value="2m">⏱️ 2 Minutes</option>
                <option value="3m">⏱️ 3 Minutes</option>
                <option value="5m">⏱️ 5 Minutes (Standard Intraday Exit)</option>
                <option value="10m">⏱️ 10 Minutes</option>
                <option value="15m">⏱️ 15 Minutes</option>
                <option value="30m">⏱️ 30 Minutes</option>
                <option value="1h">⏱️ 1 Hour</option>
              </optgroup>
              <option value="CUSTOM">✏️ Manual Timeframe Entry...</option>
            </select>

            {isCustomExitTf && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={exitTf === 'SAME' ? '' : exitTf}
                  onChange={(e) => onChange('exitTimeframe', e.target.value)}
                  placeholder="e.g. 1m, 3m, 7m"
                  style={{
                    width: '85px',
                    padding: '4px 8px',
                    background: '#0f172a',
                    border: '1px solid #fb923c',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#fed7aa' }}>Manual TF</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ROW 1: PRIMARY CONDITION SELECTION ─── */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Source Band */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Source Band / Indicator
          </span>
          <select
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            style={{
              padding: '7px 10px',
              background: '#1e293b',
              border: '1px solid #3b82f6',
              borderRadius: '5px',
              color: '#60a5fa',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {ALL_BANDS_AND_INDICATORS.map(grp => (
              <optgroup key={grp.group} label={grp.group}>
                {grp.options.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Condition Operator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Condition
          </span>
          <select
            value={comparator}
            onChange={(e) => onChange('comparator', e.target.value)}
            style={{
              padding: '7px 10px',
              background: '#1e293b',
              border: '1px solid #f59e0b',
              borderRadius: '5px',
              color: '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {COMPARATORS.map(comp => (
              <option key={comp.id} value={comp.id}>{comp.name}</option>
            ))}
          </select>
        </div>

        {/* Target Type Mode Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Compare Against
          </span>
          <div style={{
            display: 'flex',
            background: '#1e293b',
            borderRadius: '5px',
            border: '1px solid #475569',
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => onChange('rightType', 'VALUE')}
              style={{
                background: rightType === 'VALUE' ? '#3b82f6' : 'transparent',
                color: rightType === 'VALUE' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔢 Manual Value
            </button>
            <button
              type="button"
              onClick={() => onChange('rightType', 'INDICATOR')}
              style={{
                background: rightType === 'INDICATOR' ? '#10b981' : 'transparent',
                color: rightType === 'INDICATOR' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🎯 Other Band
            </button>
          </div>
        </div>

        {/* Target Value or Target Indicator Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {rightType === 'VALUE' ? 'Manual Value (Price / Level)' : 'Target Band'}
          </span>

          {rightType === 'VALUE' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                step="any"
                value={rightValue}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  onChange('rightValue', val);
                  onChange('value', val);
                }}
                style={{
                  width: '90px',
                  padding: '7px 10px',
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  borderRadius: '5px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 25, 50, 70].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      onChange('rightValue', v);
                      onChange('value', v);
                    }}
                    style={{
                      background: rightValue === v ? '#38bdf8' : '#334155',
                      color: rightValue === v ? '#0f172a' : '#cbd5e1',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <select
              value={rightIndicator}
              onChange={(e) => onChange('rightIndicator', e.target.value)}
              style={{
                padding: '7px 10px',
                background: '#1e293b',
                border: '1px solid #10b981',
                borderRadius: '5px',
                color: '#34d399',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {ALL_BANDS_AND_INDICATORS.map(grp => (
                <optgroup key={grp.group} label={grp.group}>
                  {grp.options.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          title="Remove condition"
          style={{
            background: '#ef444420',
            color: '#f87171',
            border: '1px solid #ef444450',
            padding: '6px 12px',
            borderRadius: '5px',
            fontSize: '0.82rem',
            cursor: 'pointer',
            marginLeft: 'auto',
            fontWeight: 700,
          }}
        >
          ✕ Remove
        </button>
      </div>

      {/* ─── ROW 2: DETAILED MANUAL PARAMETER INPUTS (PERIOD, MULT, ATR, ETC.) ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 10px',
        background: '#1e293b50',
        borderRadius: '5px',
        border: '1px dashed #334155',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
          ⚙️ Manual Indicator Settings:
        </span>

        {/* BOLLINGER BANDS PARAMETERS */}
        {left.startsWith('BB_') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Period:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              StdDev:
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={mult}
                onChange={(e) => onChange('mult', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* KELTNER CHANNEL PARAMETERS */}
        {left.startsWith('KC_') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              EMA Length:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Multiplier:
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={mult}
                onChange={(e) => onChange('mult', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              ATR Length:
              <input
                type="number"
                min="1"
                value={atrPeriod}
                onChange={(e) => onChange('atrPeriod', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* DONCHIAN PARAMETERS */}
        {left.startsWith('DC_') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Donchian Period:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* RSI PARAMETERS */}
        {left.startsWith('RSI') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              RSI Period:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* MACD PARAMETERS */}
        {left.startsWith('MACD_') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Fast:
              <input
                type="number"
                value={fast}
                onChange={(e) => onChange('fast', Number(e.target.value))}
                style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Slow:
              <input
                type="number"
                value={slow}
                onChange={(e) => onChange('slow', Number(e.target.value))}
                style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Signal:
              <input
                type="number"
                value={signal}
                onChange={(e) => onChange('signal', Number(e.target.value))}
                style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* ADX PARAMETERS */}
        {(left === 'ADX' || left === 'PLUS_DI' || left === 'MINUS_DI') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              ADX / DI Length:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* EMA PARAMETERS */}
        {left === 'EMA' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              EMA Length:
              <input
                type="number"
                min="1"
                value={period}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* VOLUME SMA LENGTH */}
        {left === 'VOLUME_SMA' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
              Avg Vol Period (SMA):
              <input
                type="number"
                min="1"
                value={period || 20}
                onChange={(e) => onChange('period', Number(e.target.value))}
                style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
            </label>
          </div>
        )}

        {/* PRICE ACTION OR VWAP OR VOLUME */}
        {(left.startsWith('PRICE_') || left === 'VWAP' || left === 'VOLUME') && (
          <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
            Direct Market OHLCV / Volume Series
          </span>
        )}

        {/* RIGHT INDICATOR SETTINGS */}
        {rightType === 'INDICATOR' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #475569', paddingLeft: '10px', marginLeft: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
              🎯 Target Band Settings:
            </span>

            {/* Right Bollinger */}
            {rightIndicator.startsWith('BB_') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Period:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  StdDev:
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rightMult}
                    onChange={(e) => onChange('rightMult', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right Keltner */}
            {rightIndicator.startsWith('KC_') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  EMA Length:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Multiplier:
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rightMult}
                    onChange={(e) => onChange('rightMult', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  ATR Length:
                  <input
                    type="number"
                    min="1"
                    value={rightAtrPeriod}
                    onChange={(e) => onChange('rightAtrPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right Donchian */}
            {rightIndicator.startsWith('DC_') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Period:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right RSI */}
            {rightIndicator.startsWith('RSI') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  RSI Period:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right MACD */}
            {rightIndicator.startsWith('MACD_') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Fast:
                  <input
                    type="number"
                    value={rightFast}
                    onChange={(e) => onChange('rightFast', Number(e.target.value))}
                    style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Slow:
                  <input
                    type="number"
                    value={rightSlow}
                    onChange={(e) => onChange('rightSlow', Number(e.target.value))}
                    style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Signal:
                  <input
                    type="number"
                    value={rightSignal}
                    onChange={(e) => onChange('rightSignal', Number(e.target.value))}
                    style={{ width: '48px', marginLeft: '4px', padding: '3px 5px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right ADX */}
            {(rightIndicator === 'ADX' || rightIndicator === 'PLUS_DI' || rightIndicator === 'MINUS_DI') && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  ADX / DI Length:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right EMA */}
            {rightIndicator === 'EMA' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  EMA Length:
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {/* Right Volume SMA */}
            {rightIndicator === 'VOLUME_SMA' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                  Avg Vol Period (SMA):
                  <input
                    type="number"
                    min="1"
                    value={rightPeriod || 20}
                    onChange={(e) => onChange('rightPeriod', Number(e.target.value))}
                    style={{ width: '55px', marginLeft: '4px', padding: '3px 6px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </label>
              </div>
            )}

            {(rightIndicator.startsWith('PRICE_') || rightIndicator === 'VWAP' || rightIndicator === 'VOLUME') && (
              <span style={{ fontSize: '0.72rem', color: '#34d399' }}>
                Direct Market Series
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConditionRow;
