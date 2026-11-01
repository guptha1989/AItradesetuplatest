import React, { useState } from 'react';
import { useTradingStore } from '../store/tradingStore';

export default function Sidebar({ onOpenAIChat }) {
  const {
    activePage,
    setActivePage,
    todayPnl,
    positions,
    alerts,
    policyAlerts,
    unreadPolicyAlerts,
    tradingHalted,
    paperMode,
    wsConnected,
  } = useTradingStore();

  // Accordion open/close state for collapsible groups
  const [openSections, setOpenSections] = useState({
    liveTradeTools: true,
    tradeRecommendations: true,
    strategyBacktesting: true,
    tradingDesk: true,
    marketAnalysis: false,
  });

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const pnlColor = todayPnl > 0 ? '#10b981' : todayPnl < 0 ? '#ef4444' : '#94a3b8';

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      background: '#09142f',
      borderRight: '1px solid #17274a',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 54px)',
      overflowY: 'auto',
      userSelect: 'none',
    }}>
      
      {/* ─── BRAND PULSE HEADER ─── */}
      <div style={{
        padding: '18px 20px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #17274a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Glowing pulse brandmark */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(37, 99, 235, 0.45)',
          }}>
            <span style={{ fontSize: '15px', color: 'white', fontWeight: 800 }}>θ</span>
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', display: 'flex', alignItems: 'center' }}>
              <span>Theta</span>
              <span style={{ color: '#38bdf8', fontWeight: 800, marginLeft: '1px' }}>Grid</span>
            </div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              OPTIONS ALGO DESK
            </div>
          </div>
        </div>

        {/* Live WS Status Pill */}
        <div
          title={wsConnected ? 'Real-Time Market Data Active' : 'Connecting to Market Data...'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: wsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${wsConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: wsConnected ? '#34d399' : '#f87171',
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: wsConnected ? '#10b981' : '#ef4444',
            boxShadow: wsConnected ? '0 0 6px #10b981' : 'none',
          }} />
          <span>{wsConnected ? 'LIVE' : 'OFF'}</span>
        </div>
      </div>

      {/* ─── NAVIGATION MENU ─── */}
      <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        
        {/* ThetaGrid AI Copilot Launch Button */}
        {onOpenAIChat && (
          <button
            onClick={onOpenAIChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.35) 0%, rgba(37, 99, 235, 0.25) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              padding: '9px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.8rem',
              marginBottom: '8px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> ThetaGrid AI Copilot
            </span>
            <span style={{ fontSize: '0.62rem', background: '#2563eb', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              GEMINI
            </span>
          </button>
        )}

        {/* 1. DASHBOARD */}
        <div
          onClick={() => setActivePage('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            background: activePage === 'dashboard' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: activePage === 'dashboard' ? '#60a5fa' : '#cbd5e1',
            border: activePage === 'dashboard' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🧭</span>
          <span>Dashboard</span>
        </div>

        {/* 2. LIVE TRADE TOOLS (COLLAPSIBLE GROUP) */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => toggleSection('liveTradeTools')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛠️</span>
              <span>Live Trade Tools</span>
            </div>
            <span style={{ fontSize: '0.75rem', transform: openSections.liveTradeTools ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>

          {openSections.liveTradeTools && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
              
              {/* Realtime Pro Multi-Charts (All Zerodha TFs, Renko, Heikin-Ashi, Pine Script, 4 Grid) */}
              <div
                onClick={() => setActivePage('charts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'charts' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'charts' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'charts' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>📊</span>
                <span>Realtime Pro Charts</span>
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  4 Grid
                </span>
              </div>

              {/* OI Crossover (IMAGE 1 STRATEGY) */}
              <div
                onClick={() => setActivePage('oi-crossover')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'oi-crossover' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: activePage === 'oi-crossover' ? '#34d399' : '#94a3b8',
                  border: activePage === 'oi-crossover' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                }}
              >
                <span>⚡</span>
                <span>OI Crossover</span>
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  ATM±4
                </span>
              </div>

              {/* Premium Decay (IMAGE 2 STRATEGY) */}
              <div
                onClick={() => setActivePage('premium-decay')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'premium-decay' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  color: activePage === 'premium-decay' ? '#f87171' : '#94a3b8',
                  border: activePage === 'premium-decay' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid transparent',
                }}
              >
                <span>📉</span>
                <span>Premium Decay</span>
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  9:15 Open
                </span>
              </div>

              {/* Trending OI (Moved here) */}
              <div
                onClick={() => setActivePage('trending')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'trending' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'trending' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'trending' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>📈</span>
                <span>Trending OI</span>
              </div>

              {/* Option Chain (Moved here) */}
              <div
                onClick={() => setActivePage('chain')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'chain' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'chain' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'chain' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>⛓️</span>
                <span>Option Chain</span>
              </div>

            </div>
          )}
        </div>

        {/* 3. TRADE RECOMMENDATIONS (COLLAPSIBLE GROUP) */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => toggleSection('tradeRecommendations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span>
              <span>Trade Recommendations</span>
            </div>
            <span style={{ fontSize: '0.75rem', transform: openSections.tradeRecommendations ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>

          {openSections.tradeRecommendations && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
              
              {/* Policy Alerts (Moved here) */}
              <div
                onClick={() => setActivePage('policy-alerts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'policy-alerts' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'policy-alerts' ? '#60a5fa' : '#cbd5e1',
                  border: activePage === 'policy-alerts' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>🔔</span>
                <span>Policy Alerts</span>
                {(policyAlerts.length > 0 || unreadPolicyAlerts > 0) && (
                  <span style={{
                    marginLeft: 'auto',
                    background: unreadPolicyAlerts > 0 ? '#3b82f6' : '#334155',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}>
                    {unreadPolicyAlerts > 0 ? unreadPolicyAlerts : policyAlerts.length}
                  </span>
                )}
              </div>

              {/* AI Signals (Moved here) */}
              <div
                onClick={() => setActivePage('signals')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'signals' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: activePage === 'signals' ? '#c084fc' : '#cbd5e1',
                  border: activePage === 'signals' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid transparent',
                }}
              >
                <span>🤖</span>
                <span>AI Signals</span>
                {alerts.length > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}>
                    {alerts.length}
                  </span>
                )}
              </div>

            </div>
          )}
        </div>

        {/* 4. STRATEGY & BACKTESTING */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => toggleSection('strategyBacktesting')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧪</span>
              <span>Strategy &amp; Backtesting</span>
            </div>
            <span style={{ fontSize: '0.75rem', transform: openSections.strategyBacktesting ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>

          {openSections.strategyBacktesting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
              
              <div
                onClick={() => setActivePage('backtest')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'backtest' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'backtest' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'backtest' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>🧪</span>
                <span>Backtest Hub</span>
              </div>

              <div
                onClick={() => setActivePage('policy-creator')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'policy-creator' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'policy-creator' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'policy-creator' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>🛠️</span>
                <span>Policy Creator</span>
              </div>

            </div>
          )}
        </div>

        {/* 5. TRADING DESK & PORTFOLIO (ORDER BOOK, POSITIONS, JOURNAL) */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => toggleSection('tradingDesk')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💼</span>
              <span>Trading Desk &amp; Terminal</span>
            </div>
            <span style={{ fontSize: '0.75rem', transform: openSections.tradingDesk ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>

          {openSections.tradingDesk && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
              {/* Order Book */}
              <div
                onClick={() => setActivePage('order-book')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'order-book' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'order-book' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'order-book' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>📑</span>
                <span>Order Book</span>
              </div>

              {/* Positions */}
              <div
                onClick={() => setActivePage('positions')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'positions' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: activePage === 'positions' ? '#34d399' : '#94a3b8',
                  border: activePage === 'positions' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                }}
              >
                <span>💼</span>
                <span>Positions</span>
                {positions.length > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#10b981',
                    color: '#0f172a',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                  }}>
                    {positions.length}
                  </span>
                )}
              </div>

              {/* Trade Journal */}
              <div
                onClick={() => setActivePage('journal')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'journal' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'journal' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'journal' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>📋</span>
                <span>Trade Journal</span>
              </div>
            </div>
          )}
        </div>

        {/* 6. MARKET ANALYSIS */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => toggleSection('marketAnalysis')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span>
              <span>Market &amp; Analysis</span>
            </div>
            <span style={{ fontSize: '0.75rem', transform: openSections.marketAnalysis ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }}>
              ▼
            </span>
          </div>

          {openSections.marketAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
              <div
                onClick={() => setActivePage('sr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  background: activePage === 'sr' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: activePage === 'sr' ? '#60a5fa' : '#94a3b8',
                  border: activePage === 'sr' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                }}
              >
                <span>🎯</span>
                <span>Support &amp; Resistance</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ─── BOTTOM SAAS SCORECARD & RISK MONITOR ─── */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #17274a',
        background: '#060e22',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {/* Today's P&L */}
        <div style={{
          background: '#0c1836',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid #1c2f5e',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Today's Net P&amp;L
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: pnlColor, marginTop: '2px', fontFamily: 'monospace' }}>
            {todayPnl >= 0 ? '+' : ''}₹{Math.abs(todayPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Risk Status Indicator */}
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: tradingHalted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${tradingHalted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>Risk Shield</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tradingHalted ? '#f87171' : '#34d399' }}>
            {tradingHalted ? '🛑 HALTED' : '✓ NORMAL'}
          </span>
        </div>

        {/* Execution Mode */}
        <div style={{
          textAlign: 'center',
          padding: '5px',
          borderRadius: '4px',
          background: paperMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: paperMode ? '#fbbf24' : '#f87171',
          fontSize: '0.7rem',
          fontWeight: 700,
          border: `1px solid ${paperMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}>
          {paperMode ? '📝 PAPER EXECUTION' : '⚡ LIVE REAL MONEY'}
        </div>
      </div>

    </aside>
  );
}
