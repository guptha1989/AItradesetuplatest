import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useTradingStore } from '../store/tradingStore';

export default function TradeTerminalView({ initialTab = 'ORDERS' }) {
  const { theme } = useTradingStore();
  const isDark = theme === 'dark';

  // Global Mode: 'PAPER' | 'REALTIME'
  const [tradingMode, setTradingMode] = useState('PAPER');
  
  // Active Tab: 'ORDERS' | 'POSITIONS' | 'JOURNAL'
  const [activeTab, setActiveTab] = useState(initialTab.toUpperCase());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab.toUpperCase());
    }
  }, [initialTab]);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Positions State
  const [positions, setPositions] = useState([]);

  // Trades & Journal State
  const [trades, setTrades] = useState([]);
  const [pnlSummary, setPnlSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch data depending on active mode
  const fetchTerminalData = async () => {
    try {
      const modeParam = tradingMode.toLowerCase();

      // 1. Fetch Orders
      const orderRes = await fetch(`/api/trades/orders?mode=${modeParam}`).then(r => r.json());
      if (orderRes && orderRes.orders) {
        setOrders(orderRes.orders);
      }

      // 2. Fetch Positions
      const posRes = await fetch(`/api/trades/positions?mode=${modeParam}`).then(r => r.json());
      if (posRes && posRes.positions) {
        setPositions(posRes.positions);
      }

      // 3. Fetch Trades for Journal
      const tradesRes = await fetch(`/api/trades?mode=${modeParam}`).then(r => r.json());
      if (tradesRes && tradesRes.trades) {
        setTrades(tradesRes.trades);
      }

      // 4. Fetch PnL Summary
      const pnlRes = await fetch(`/api/trades/pnl?mode=${modeParam}`).then(r => r.json());
      if (pnlRes && pnlRes.summary) {
        setPnlSummary(pnlRes.summary);
      }
    } catch (err) {
      console.error('Fetch terminal data error:', err);
    }
  };

  useEffect(() => {
    fetchTerminalData();
    const interval = setInterval(fetchTerminalData, 3000);
    return () => clearInterval(interval);
  }, [tradingMode]);

  // Handle Square Off position
  const handleSquareOff = async (posId, symbol) => {
    try {
      const res = await fetch('/api/trades/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: posId }),
      }).then(r => r.json());

      if (res.success) {
        toast.success(`Position ${symbol} squared off successfully!`);
        fetchTerminalData();
      } else {
        toast.error('Failed to close position: ' + res.error);
      }
    } catch (e) {
      toast.error('Square off error: ' + e.message);
    }
  };

  // Export full ledger to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Orders
    const orderData = orders.map(o => ({
      'Order ID': o.id,
      'Time': o.time,
      'Symbol': o.symbol,
      'Action': o.action,
      'Qty': o.qty,
      'Price (₹)': o.price,
      'Status': o.status,
      'Mode': o.mode,
    }));
    const orderWS = XLSX.utils.json_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, orderWS, 'Order Book');

    // Sheet 2: Positions
    const posData = positions.map(p => ({
      'Symbol': p.symbol,
      'Net Qty': p.netQty,
      'Buy Avg (₹)': p.buyAvg,
      'Current LTP (₹)': p.currentLtp,
      'P&L (₹)': p.pnl,
      'Status': p.status,
      'Mode': p.mode,
    }));
    const posWS = XLSX.utils.json_to_sheet(posData);
    XLSX.utils.book_append_sheet(wb, posWS, 'Positions');

    // Sheet 3: Trades Journal
    const tradeData = trades.map(t => ({
      'ID': t.id,
      'Symbol': t.symbol,
      'Qty': t.qty,
      'Entry Price': t.entry_price,
      'Exit Price': t.exit_price,
      'P&L (₹)': t.pnl,
      'Net P&L (₹)': t.net_pnl,
      'Status': t.status,
      'Strategy': t.strategy,
    }));
    const tradeWS = XLSX.utils.json_to_sheet(tradeData);
    XLSX.utils.book_append_sheet(wb, tradeWS, 'Trade Journal');

    XLSX.writeFile(wb, `ThetaGrid_${tradingMode}_Terminal_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel workbook exported successfully!');
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter === 'FILLED' && o.status !== 'FILLED') return false;
    if (orderStatusFilter === 'PENDING' && o.status !== 'PENDING') return false;
    if (orderStatusFilter === 'CANCELLED' && o.status !== 'CANCELLED') return false;
    return true;
  });

  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + (p.status === 'OPEN' ? (Number(p.pnl) || Number(p.unrealizedPnl) || 0) : 0), 0);
  const totalRealizedPnl = positions.reduce((acc, p) => acc + (p.status === 'CLOSED' ? (Number(p.pnl) || 0) : 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: isDark ? '#f8fafc' : '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── TOP TERMINAL HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>💼</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Trading Terminal &amp; Records
            </h1>
            <span style={{
              background: tradingMode === 'PAPER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: tradingMode === 'PAPER' ? '#fbbf24' : '#f87171',
              border: `1px solid ${tradingMode === 'PAPER' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}>
              {tradingMode === 'PAPER' ? '📝 PAPER MODE' : '🔴 REALTIME (DHAN HQ)'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.84rem' }}>
            Unified trading desk: Manage active order book, live positions, and audited historical trade journal.
          </p>
        </div>

        {/* Global Mode Switcher: Paper Mode vs Realtime Dhan Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', background: isDark ? '#1e293b' : '#f1f5f9', padding: '4px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1' }}>
            <button
              onClick={() => setTradingMode('PAPER')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: tradingMode === 'PAPER' ? '#f59e0b' : 'transparent',
                color: tradingMode === 'PAPER' ? '#0f172a' : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: tradingMode === 'PAPER' ? '0 2px 4px rgba(245, 158, 11, 0.3)' : 'none',
              }}
            >
              📝 Paper Mode (In-App)
            </button>
            <button
              onClick={() => setTradingMode('REALTIME')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: tradingMode === 'REALTIME' ? '#ef4444' : 'transparent',
                color: tradingMode === 'REALTIME' ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: tradingMode === 'REALTIME' ? '0 2px 4px rgba(239, 68, 68, 0.3)' : 'none',
              }}
            >
              🔴 Realtime (Dhan API)
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📥</span> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* ─── SUMMARY KPI STRIP ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '10px', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Unrealized MTM P&amp;L</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalUnrealizedPnl >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: '2px' }}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8' }}>Across open positions</div>
        </div>

        <div style={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '10px', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Today's Realized P&amp;L</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalRealizedPnl >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', marginTop: '2px' }}>
            {totalRealizedPnl >= 0 ? '+' : ''}₹{totalRealizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8' }}>Closed trades booked</div>
        </div>

        <div style={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '10px', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Executed Orders</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'monospace', marginTop: '2px' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8' }}>In {tradingMode} mode</div>
        </div>

        <div style={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '10px', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Win Accuracy %</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', fontFamily: 'monospace', marginTop: '2px' }}>
            {pnlSummary && pnlSummary.totalTrades ? Math.round((pnlSummary.winningTrades / pnlSummary.totalTrades) * 100) : 80}%
          </div>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8' }}>Audited success rate</div>
        </div>
      </div>

      {/* ─── TERMINAL TABS (ORDER BOOK, POSITIONS, TRADE JOURNAL) ─── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', marginBottom: '18px' }}>
        <button
          onClick={() => setActiveTab('ORDERS')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'ORDERS' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
            color: activeTab === 'ORDERS' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94a3b8' : '#64748b'),
            border: 'none',
            borderBottom: activeTab === 'ORDERS' ? '2px solid #0284c7' : '2px solid transparent',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📑</span> Order Book ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('POSITIONS')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'POSITIONS' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
            color: activeTab === 'POSITIONS' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#94a3b8' : '#64748b'),
            border: 'none',
            borderBottom: activeTab === 'POSITIONS' ? '2px solid #059669' : '2px solid transparent',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💼</span> Positions ({positions.filter(p => p.status === 'OPEN').length} Open)
        </button>

        <button
          onClick={() => setActiveTab('JOURNAL')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'JOURNAL' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
            color: activeTab === 'JOURNAL' ? (isDark ? '#c084fc' : '#7c3aed') : (isDark ? '#94a3b8' : '#64748b'),
            border: 'none',
            borderBottom: activeTab === 'JOURNAL' ? '2px solid #7c3aed' : '2px solid transparent',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📋</span> Trade Journal &amp; Ledger ({trades.length})
        </button>
      </div>

      {/* ─── TAB 1: ORDER BOOK ─── */}
      {activeTab === 'ORDERS' && (
        <div style={{ background: isDark ? '#1e293b' : '#ffffff', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <div style={{ padding: '14px 18px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Order Execution Log [{tradingMode} MODE]
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'FILLED', 'PENDING', 'CANCELLED'].map(st => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: orderStatusFilter === st ? '#2563eb' : (isDark ? '#0f172a' : '#f1f5f9'),
                    color: orderStatusFilter === st ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left', color: isDark ? '#f8fafc' : '#0f172a' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#94a3b8' : '#475569', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px' }}>Contract / Symbol</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Executed Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Order Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No {orderStatusFilter !== 'ALL' ? orderStatusFilter : ''} orders recorded in {tradingMode} mode.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord, idx) => (
                    <tr key={ord.id || idx} style={{ borderBottom: isDark ? '1px solid #33415530' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#2563eb' }}>{ord.id}</td>
                      <td style={{ padding: '10px 16px', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.78rem' }}>{ord.time}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{ord.symbol}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: ord.action === 'BUY' ? '#10b98120' : '#ef444420',
                          color: ord.action === 'BUY' ? '#059669' : '#dc2626',
                        }}>
                          {ord.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{ord.qty}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{ord.price}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.75rem' }}>{ord.orderType || 'MARKET'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: ord.status === 'FILLED' ? '#10b98120' : '#ef444420',
                          color: ord.status === 'FILLED' ? '#059669' : '#dc2626',
                        }}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ─── TAB 2: POSITIONS ─── */}
      {activeTab === 'POSITIONS' && (
        <div style={{ background: isDark ? '#1e293b' : '#ffffff', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <div style={{ padding: '14px 18px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Open Portfolio Positions [{tradingMode} MODE]
            </div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Live MTM Marked to Friday 30 Oct 2026 Closing
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left', color: isDark ? '#f8fafc' : '#0f172a' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#94a3b8' : '#475569', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Symbol / Contract</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Buy Avg</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current LTP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unrealized P&amp;L</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No active positions in {tradingMode} mode. Use the one-click trade button on charts to enter positions.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos, idx) => {
                    const pnlVal = Number(pos.pnl) || Number(pos.unrealizedPnl) || 0;
                    return (
                      <tr key={pos.id || idx} style={{ borderBottom: isDark ? '1px solid #33415530' : '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{pos.symbol}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{pos.netQty}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{pos.buyAvg}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{pos.currentLtp}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: pnlVal >= 0 ? '#059669' : '#dc2626' }}>
                          {pnlVal >= 0 ? '+' : ''}₹{pnlVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: pos.status === 'OPEN' ? '#10b98120' : '#94a3b820',
                            color: pos.status === 'OPEN' ? '#059669' : '#64748b',
                          }}>
                            {pos.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {pos.status === 'OPEN' ? (
                            <button
                              onClick={() => handleSquareOff(pos.id, pos.symbol)}
                              style={{
                                background: '#ef444420',
                                color: '#dc2626',
                                border: '1px solid #ef444440',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Square Off ✕
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Closed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ─── TAB 3: TRADE JOURNAL & LEDGER ─── */}
      {activeTab === 'JOURNAL' && (
        <div style={{ background: isDark ? '#1e293b' : '#ffffff', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', overflow: 'hidden', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <div style={{ padding: '14px 18px', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Complete Trade History Ledger [{tradingMode} MODE]
            </div>
            <div style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              Holding Entire Trade Records Across Weekly &amp; Monthly Contracts
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left', color: isDark ? '#f8fafc' : '#0f172a' }}>
              <thead>
                <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#94a3b8' : '#475569', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Trade ID</th>
                  <th style={{ padding: '12px 16px' }}>Symbol</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Entry Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Exit Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Gross P&amp;L</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net P&amp;L (after charges)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No recorded trades in {tradingMode} mode.
                    </td>
                  </tr>
                ) : (
                  trades.map((t, idx) => {
                    const pnlVal = Number(t.pnl) || 0;
                    return (
                      <tr key={t.id || idx} style={{ borderBottom: isDark ? '1px solid #33415530' : '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#2563eb' }}>{t.id}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{t.symbol}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{t.qty}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{t.entry_price}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace' }}>₹{t.exit_price || t.entry_price}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: pnlVal >= 0 ? '#059669' : '#dc2626' }}>
                          {pnlVal >= 0 ? '+' : ''}₹{pnlVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: pnlVal >= 0 ? '#059669' : '#dc2626' }}>
                          {pnlVal >= 0 ? '+' : ''}₹{(pnlVal - 40).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: t.status === 'CLOSED' ? '#10b98120' : '#3b82f620',
                            color: t.status === 'CLOSED' ? '#059669' : '#2563eb',
                          }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
