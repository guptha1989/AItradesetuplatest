import React from 'react';
import { useTradingStore } from '../store/tradingStore';

export default function Topbar({ onOpenAIChat }) {
  const { wsConnected, paperMode, spot, spotChange, spotChangePercent, tradingHalted, vix, historicalDate, theme, toggleTheme } = useTradingStore();

  const formatSpot = (val) => val ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
  const changeColor = spotChange > 0 ? '#16a34a' : spotChange < 0 ? '#dc2626' : '#64748b';

  return (
    <header className="topbar" style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      color: '#0f172a',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    }}>
      {/* Brand: ThetaGrid */}
      <div className="topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          color: '#ffffff',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.05rem',
          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
        }}>
          θ
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e40af', letterSpacing: '-0.02em' }}>ThetaGrid</span>
          <span style={{ fontSize: '0.62rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 5px', marginLeft: '6px', fontWeight: 700 }}>
            v2.6 PRO
          </span>
        </div>
      </div>

      {/* Center — Live Nifty spot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>NIFTY 50 SPOT</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{formatSpot(spot)}</span>
            {spotChange !== null && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: changeColor }}>
                {spotChange > 0 ? '▲' : '▼'} {Math.abs(spotChange).toFixed(2)} ({Math.abs(spotChangePercent).toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {vix && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>INDIA VIX</div>
            <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: vix > 20 ? '#dc2626' : vix < 12 ? '#16a34a' : '#2563eb' }}>
              {vix?.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Right — AI Chatbot, Status Badges & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* ThetaGrid AI Copilot Launch Button */}
        <button
          onClick={onOpenAIChat}
          title="Open ThetaGrid AI Copilot (Powered by Gemini 2.5 Flash & Dhan)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🤖</span> AI Copilot
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Clean White & Blue Theme' : 'Switch to Dark Theme'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#1e40af',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {theme === 'dark' ? '🌙 Dark Blue' : '☀️ White & Blue'}
        </button>

        {tradingHalted && (
          <span className="badge badge-bearish" style={{ animation: 'pulse-red 1.5s infinite' }}>
            🛑 HALTED
          </span>
        )}
        <span style={{
          background: 'rgba(22, 163, 74, 0.1)',
          color: '#16a34a',
          border: '1px solid rgba(22, 163, 74, 0.3)',
          fontWeight: 700,
          borderRadius: '5px',
          padding: '3px 8px',
          fontSize: '0.72rem',
        }}>
          🔴 LIVE - Dhan HQ
        </span>
        <span style={{
          background: paperMode ? '#eff6ff' : 'rgba(220, 38, 38, 0.1)',
          color: paperMode ? '#2563eb' : '#dc2626',
          border: `1px solid ${paperMode ? '#bfdbfe' : '#fca5a5'}`,
          fontWeight: 700,
          borderRadius: '5px',
          padding: '3px 8px',
          fontSize: '0.72rem',
        }}>
          {paperMode ? '📝 PAPER EXECUTION' : '🔴 LIVE TRADING'}
        </span>
        {historicalDate && (
          <span style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            borderRadius: '5px',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}>📅 {historicalDate}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: wsConnected ? '#16a34a' : '#dc2626',
            boxShadow: wsConnected ? '0 0 6px #16a34a' : '0 0 6px #dc2626',
            display: 'inline-block',
          }} />
          {wsConnected ? 'Realtime WS' : 'Disconnected'}
        </div>
      </div>
    </header>
  );
}
