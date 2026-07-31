import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:3001/api';

// ─── Excel Export ──────────────────────────────────────────────
function exportToExcel(trades, pnlSummary, viewMode, selectedDate) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Trade Details
  const tradeRows = [
    ['#', 'Symbol', 'Strike', 'Type', 'Action', 'Lots', 'Qty', 'Entry Price', 'Exit Price', 'Entry Time', 'Exit Time', 'Status', 'P&L (₹)', 'Net P&L (₹)', 'Entry IV', 'Strategy', 'Signal ID'],
    ...trades.map((t, i) => [
      i + 1,
      t.symbol || '',
      t.strike || '',
      t.type || '',
      t.action || '',
      t.lots || '',
      t.qty || '',
      t.entry_price ? parseFloat(t.entry_price) : '',
      t.exit_price ? parseFloat(t.exit_price) : '',
      t.entry_time ? new Date(t.entry_time).toLocaleString('en-IN') : '',
      t.exit_time ? new Date(t.exit_time).toLocaleString('en-IN') : '',
      t.status || '',
      t.pnl ? parseFloat(t.pnl) : '',
      t.net_pnl ? parseFloat(t.net_pnl) : '',
      t.entry_iv ? parseFloat(t.entry_iv) : '',
      t.strategy || '',
      t.signal_id || '',
    ]),
  ];

  const tradeWS = XLSX.utils.aoa_to_sheet(tradeRows);
  tradeWS['!cols'] = [
    { wch: 4 }, { wch: 20 }, { wch: 8 }, { wch: 5 }, { wch: 7 }, { wch: 5 }, { wch: 6 },
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, tradeWS, 'Trades');

  // Sheet 2: P&L Summary
  if (pnlSummary) {
    const summaryRows = [
      ['P&L Summary Report'],
      ['Period', viewMode === 'monthly' ? selectedDate.slice(0, 7) : selectedDate],
      ['Generated At', new Date().toLocaleString('en-IN')],
      [],
      ['Metric', 'Value'],
      ['Total Trades', pnlSummary.totalTrades || 0],
      ['Closed Trades', pnlSummary.closedTrades || 0],
      ['Open Trades', pnlSummary.openTrades || 0],
      ['Winning Trades', pnlSummary.winningTrades || 0],
      ['Losing Trades', pnlSummary.losingTrades || 0],
      ['Win Rate %', pnlSummary.winningTrades && pnlSummary.closedTrades
        ? `${((pnlSummary.winningTrades / pnlSummary.closedTrades) * 100).toFixed(1)}%` : '0%'],
      ['Gross P&L (₹)', pnlSummary.realizedPnl ? parseFloat(pnlSummary.realizedPnl) : 0],
      ['Net P&L (₹)', pnlSummary.netPnl ? parseFloat(pnlSummary.netPnl) : 0],
      ['Best Trade (₹)', pnlSummary.bestTrade ? parseFloat(pnlSummary.bestTrade) : 0],
      ['Worst Trade (₹)', pnlSummary.worstTrade ? parseFloat(pnlSummary.worstTrade) : 0],
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWS['!cols'] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWS, 'P&L Summary');
  }

  // Generate filename
  const fname = viewMode === 'monthly'
    ? `NiftyAI_Trades_${selectedDate.slice(0, 7)}.xlsx`
    : `NiftyAI_Trades_${selectedDate}.xlsx`;

  XLSX.writeFile(wb, fname);
}

// ─── Stat Tile ────────────────────────────────────────────────
function StatTile({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
      <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: color || 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

// ─── Daily P&L Row (for monthly view) ────────────────────────
function DailyRow({ day, onClick, selected }) {
  const pnl = parseFloat(day.net_pnl || 0);
  return (
    <tr onClick={onClick} style={{ cursor: 'pointer', background: selected ? 'rgba(59,130,246,0.08)' : undefined }}>
      <td style={{ fontWeight: 600 }}>{day.trade_date}</td>
      <td><span className={`badge ${parseInt(day.winning_trades) > parseInt(day.losing_trades) ? 'badge-bullish' : 'badge-bearish'}`}>{day.winning_trades}W / {day.losing_trades}L</span></td>
      <td>{day.winning_trades && day.losing_trades
        ? `${((day.winning_trades / (parseInt(day.winning_trades) + parseInt(day.losing_trades))) * 100).toFixed(0)}%`
        : '—'}</td>
      <td className={pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>{pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
      <td className="text-secondary">{day.winning_trades}</td>
      <td className="text-secondary">{day.losing_trades}</td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function TradeJournal() {
  const [trades, setTrades] = useState([]);
  const [pnlSummary, setPnlSummary] = useState(null);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    if (viewMode === 'daily') fetchDailyData(selectedDate);
    else fetchMonthlyData(selectedMonth);
  }, [viewMode, selectedDate, selectedMonth]);

  const fetchDailyData = async (date) => {
    setLoading(true);
    try {
      const [tradesRes, pnlRes] = await Promise.all([
        fetch(`${API_BASE}/trades?limit=100`).then(r => r.json()),
        fetch(`${API_BASE}/trades/pnl?date=${date}`).then(r => r.json()),
      ]);
      setTrades(tradesRes.trades || []);
      setPnlSummary(pnlRes.summary);
    } catch (err) {
      console.error('Failed to fetch daily data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async (month) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trades/monthly?month=${month}`).then(r => r.json());
      setMonthlyHistory(res.dailyHistory || []);
      setPnlSummary(res.summary);
      setTrades(res.trades || []);
    } catch (err) {
      console.error('Failed to fetch monthly data:', err);
      setMonthlyHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      exportToExcel(trades, pnlSummary, viewMode, viewMode === 'monthly' ? selectedMonth : selectedDate);
    } finally {
      setExporting(false);
    }
  };

  const formatPnl = (val) => {
    const n = parseFloat(val || 0);
    return `${n >= 0 ? '+' : ''}₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const winRate = pnlSummary && pnlSummary.closedTrades > 0
    ? `${((pnlSummary.winningTrades / pnlSummary.closedTrades) * 100).toFixed(0)}%`
    : '—';

  const filteredTrades = filterStatus === 'ALL'
    ? trades
    : trades.filter(t => t.status === filterStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>📋 Trade Journal</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Complete trade history with P&L analytics</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {['daily', 'monthly'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  background: viewMode === mode ? 'var(--color-accent-blue)' : 'transparent',
                  color: viewMode === mode ? 'white' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode === 'daily' ? '📅 Daily' : '📆 Monthly'}
              </button>
            ))}
          </div>

          {/* Date / Month picker */}
          {viewMode === 'daily' ? (
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }} />
          ) : (
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }} />
          )}

          <button className="btn btn-success btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? '⏳' : '📥'} Export Excel
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      {pnlSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          <StatTile label="Net P&L" value={formatPnl(pnlSummary.netPnl)} color={parseFloat(pnlSummary.netPnl || 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'} />
          <StatTile label="Total Trades" value={pnlSummary.totalTrades || 0} />
          <StatTile label="Win Rate" value={winRate} color="var(--color-accent-blue)" />
          <StatTile label="Winners" value={pnlSummary.winningTrades || 0} color="var(--color-profit)" />
          <StatTile label="Losers" value={pnlSummary.losingTrades || 0} color="var(--color-loss)" />
          <StatTile label="Best Trade" value={formatPnl(pnlSummary.bestTrade)} color="var(--color-profit)" />
        </div>
      )}

      {/* Monthly calendar view */}
      {viewMode === 'monthly' && monthlyHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📆 Daily Breakdown — {selectedMonth}</span>
            <span className="text-muted text-sm">{monthlyHistory.length} trading days</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>W/L</th>
                <th>Win Rate</th>
                <th>Net P&L</th>
                <th>Winners</th>
                <th>Losers</th>
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map((day, i) => (
                <DailyRow
                  key={i}
                  day={day}
                  selected={selectedDayDetail === day.trade_date}
                  onClick={() => {
                    setSelectedDayDetail(day.trade_date);
                    setViewMode('daily');
                    setSelectedDate(day.trade_date);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trades Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Trades — {viewMode === 'monthly' ? selectedMonth : selectedDate}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.78rem', fontFamily: 'Inter, sans-serif' }}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{filteredTrades.length} records</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            Loading trades...
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
            No trades found for this period
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Symbol</th>
                  <th>Strike</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>Lots</th>
                  <th>Entry ₹</th>
                  <th>Exit ₹</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Status</th>
                  <th>P&L ₹</th>
                  <th>Net P&L ₹</th>
                  <th>Entry IV</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t, i) => {
                  const pnl = parseFloat(t.pnl || 0);
                  const netPnl = parseFloat(t.net_pnl || 0);
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{t.symbol}</td>
                      <td className="font-mono">{t.strike || '—'}</td>
                      <td>
                        {t.type && (
                          <span style={{ color: t.type === 'CE' ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 700, fontSize: '0.78rem' }}>{t.type}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${t.action === 'BUY' ? 'badge-bullish' : 'badge-bearish'}`} style={{ fontSize: '0.65rem' }}>{t.action}</span>
                      </td>
                      <td className="font-mono">{t.lots || '—'}</td>
                      <td className="font-mono">{t.entry_price ? parseFloat(t.entry_price).toFixed(2) : '—'}</td>
                      <td className="font-mono">{t.exit_price ? parseFloat(t.exit_price).toFixed(2) : '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {t.entry_time ? new Date(t.entry_time).toLocaleTimeString('en-IN') : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {t.exit_time ? new Date(t.exit_time).toLocaleTimeString('en-IN') : '—'}
                      </td>
                      <td>
                        <span className={`badge ${t.status === 'OPEN' ? 'badge-bullish' : t.status === 'CLOSED' ? 'badge-neutral' : 'badge-bearish'}`} style={{ fontSize: '0.65rem' }}>
                          {t.status}
                        </span>
                      </td>
                      <td className={pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : 'pnl-zero'}>
                        {t.pnl ? `${pnl > 0 ? '+' : ''}₹${Math.abs(pnl).toFixed(0)}` : '—'}
                      </td>
                      <td className={netPnl > 0 ? 'pnl-positive' : netPnl < 0 ? 'pnl-negative' : 'pnl-zero'}>
                        {t.net_pnl ? `${netPnl > 0 ? '+' : ''}₹${Math.abs(netPnl).toFixed(0)}` : '—'}
                      </td>
                      <td className="font-mono text-secondary">{t.entry_iv ? `${parseFloat(t.entry_iv).toFixed(1)}%` : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{t.strategy || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr style={{ background: 'var(--color-bg-elevated)', borderTop: '1px solid var(--color-border)' }}>
                  <td colSpan={11} style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>TOTAL ({filteredTrades.length} trades)</td>
                  <td className={parseFloat(pnlSummary?.realizedPnl || 0) >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontWeight: 700 }}>
                    {formatPnl(pnlSummary?.realizedPnl)}
                  </td>
                  <td className={parseFloat(pnlSummary?.netPnl || 0) >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontWeight: 700 }}>
                    {formatPnl(pnlSummary?.netPnl)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
