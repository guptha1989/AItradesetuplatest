import { create } from 'zustand';

const WS_URL = 'ws://localhost:3001/ws';
const API_BASE = 'http://localhost:3001/api';

export const useTradingStore = create((set, get) => ({
  // ─── WebSocket ────────────────────────────────
  ws: null,
  wsConnected: false,
  wsReconnecting: false,

  // ─── Market Data ──────────────────────────────
  spot: 23500,
  spotChange: 0,
  spotChangePercent: 0,
  dayHigh: 23500,
  dayLow: 23500,
  vix: 13.5,
  pcr: 1.05,
  atm: 23500,

  // ─── Replay State ─────────────────────────────
  replayMode: false,
  replayStatus: 'STOPPED', // 'STOPPED' | 'PLAYING' | 'PAUSED' | 'COMPLETED'
  replaySpeed: 10,
  replayMinute: 0,
  replayTime: '09:15:00',
  replayProgress: 0,

  // ─── Option Chain ─────────────────────────────
  optionChain: [],
  lastChainUpdate: null,

  // ─── Ticks ───────────────────────────────────
  ticks: {},

  // ─── Signals ─────────────────────────────────
  signals: [],
  latestSignal: null,

  // ─── P&L ──────────────────────────────────────
  todayPnl: 0,
  realizedPnl: 0,
  unrealizedPnl: 0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,

  // ─── Positions & Orders ───────────────────────
  positions: [],
  recentOrders: [],
  alerts: [],

  // ─── System ───────────────────────────────────────────────
  paperMode: true,
  tradingHalted: false,
  haltReason: null,
  sessionPhase: 'MORNING',

  // ─── Historical Mode ──────────────────────────────────────
  historicalDate: null,      // e.g. '2026-07-31' when loaded
  historicalLoading: false,
  historicalError: null,

  // ─── UI ───────────────────────────────────────────────────
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // ─── Replay Actions ───────────────────────────
  setReplayMode: (enabled) => set({ replayMode: enabled }),

  fetchReplayStatus: async () => {
    try {
      const res = await fetch(`${API_BASE}/replay/status`).then(r => r.json());
      set({
        replayStatus: res.status,
        replaySpeed: res.speed,
        replayMinute: res.currentMinute,
        replayTime: res.timeString,
        replayProgress: res.progressPct,
        spot: res.spot || get().spot,
      });
    } catch (e) {
      console.error('Fetch replay status failed:', e);
    }
  },

  startReplay: async (speed) => {
    try {
      const res = await fetch(`${API_BASE}/replay/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      }).then(r => r.json());
      set({ replayStatus: 'PLAYING', replayMode: true, ...res });
    } catch (e) {
      console.error('Start replay failed:', e);
    }
  },

  pauseReplay: async () => {
    try {
      const res = await fetch(`${API_BASE}/replay/pause`, { method: 'POST' }).then(r => r.json());
      set({ replayStatus: 'PAUSED', ...res });
    } catch (e) {
      console.error('Pause replay failed:', e);
    }
  },

  setReplaySpeed: async (speed) => {
    try {
      const res = await fetch(`${API_BASE}/replay/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed }),
      }).then(r => r.json());
      set({ replaySpeed: speed, ...res });
    } catch (e) {
      console.error('Set replay speed failed:', e);
    }
  },

  seekReplay: async (minute) => {
    try {
      const res = await fetch(`${API_BASE}/replay/seek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minute }),
      }).then(r => r.json());
      set({ replayMinute: minute, ...res });
    } catch (e) {
      console.error('Seek replay failed:', e);
    }
  },

  resetReplay: async () => {
    try {
      const res = await fetch(`${API_BASE}/replay/reset`, { method: 'POST' }).then(r => r.json());
      set({ replayStatus: 'STOPPED', replayMinute: 0, replayProgress: 0, ...res });
    } catch (e) {
      console.error('Reset replay failed:', e);
    }
  },

  // ─── Live Data Sync ───────────────────────────
  fetchLiveData: async () => {
    try {
      // 1. Option Chain & Spot
      const chainRes = await fetch(`${API_BASE}/chain`).then(r => r.json());
      if (chainRes && chainRes.chain) {
        set({
          optionChain: chainRes.chain,
          spot: chainRes.spot || get().spot,
          atm: chainRes.atm || get().atm,
          lastChainUpdate: new Date().toLocaleTimeString('en-IN'),
        });
      }

      // 2. Live Positions
      const posRes = await fetch(`${API_BASE}/market/positions`).then(r => r.json());
      if (posRes && posRes.positions) {
        set({ positions: posRes.positions });
      }

      // 3. PnL Summary
      const pnlRes = await fetch(`${API_BASE}/trades/pnl`).then(r => r.json());
      if (pnlRes && pnlRes.summary) {
        const s = pnlRes.summary;
        set({
          todayPnl: s.realizedPnl || 0,
          realizedPnl: s.realizedPnl || 0,
          totalTrades: s.totalTrades || 0,
          winningTrades: s.winningTrades || 0,
          losingTrades: s.losingTrades || 0,
        });
      }
    } catch (e) {
      console.error('fetchLiveData error:', e);
    }
  },

  // ─── Historical Snapshot Load ─────────────────────────────
  loadHistoricalData: async (date = '2026-07-31') => {
    set({ historicalLoading: true, historicalError: null });
    try {
      const res = await fetch(`${API_BASE}/historical/snapshot?date=${date}`).then(r => r.json());
      if (res.error && !res.chain) throw new Error(res.error);

      const chain = res.chain || [];
      const spot  = res.spot  || get().spot;
      const atm   = res.atm   || (Math.round(spot / 50) * 50);
      const pcr   = res.pcr   || get().pcr;

      set({
        historicalDate: res.date || date,
        historicalLoading: false,
        optionChain: chain,
        spot,
        atm,
        pcr,
        lastChainUpdate: new Date().toLocaleTimeString('en-IN'),
      });

      // Also push the spot into replay engine state so VIX / day metrics update
      return res;
    } catch (e) {
      console.error('loadHistoricalData error:', e);
      set({ historicalLoading: false, historicalError: e.message });
      throw e;
    }
  },

  // ─── WebSocket Connection ──────────────────────
  connectWS: () => {
    const existing = get().ws;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return; // Already connecting or open
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      set({ ws, wsConnected: true, wsReconnecting: false });
      console.log('✅ WebSocket connected');
      get().fetchLiveData();
    };

    ws.onmessage = (event) => {
      try {
        const { channel, data } = JSON.parse(event.data);
        get()._handleMessage(channel, data);
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      set({ wsConnected: false, wsReconnecting: true });
      setTimeout(() => {
        if (!get().wsConnected) get().connectWS();
      }, 5000);
    };

    ws.onerror = (err) => console.error('WS error:', err);
    set({ ws });
  },

  _handleMessage: (channel, data) => {
    switch (channel) {
      case 'TICK_FEED':
        if (data.type === 'TICK' || data.symbol === 'NIFTY') {
          const ltp = data.ltp || data.spot;
          const atm = ltp ? Math.round(ltp / 50) * 50 : get().atm;
          set((state) => ({
            spot: ltp || state.spot,
            spotChange: data.change !== undefined ? data.change : state.spotChange,
            spotChangePercent: data.changePercent !== undefined ? data.changePercent : state.spotChangePercent,
            dayHigh: data.high || Math.max(state.dayHigh, ltp || 0),
            dayLow: data.low || Math.min(state.dayLow, ltp || Infinity),
            vix: data.vix || state.vix,
            atm,
            replayTime: data.time || state.replayTime,
            replayProgress: data.progressPct || state.replayProgress,
            replayMinute: data.replayMinute || state.replayMinute,
          }));
        } else if (data.securityId) {
          set((state) => ({
            ticks: {
              ...state.ticks,
              [data.securityId]: {
                ltp: data.ltp,
                change: data.change,
                changePercent: data.changePercent,
                oi: data.oi,
                volume: data.volume,
              },
            },
          }));
        }
        break;

      case 'SIGNAL_FEED':
        set((state) => ({
          latestSignal: data,
          signals: [data, ...state.signals].slice(0, 50),
        }));
        break;

      case 'ORDER_FEED':
        if (data.type === 'ORDER_PLACED') {
          set((state) => ({
            recentOrders: [data.order, ...state.recentOrders].slice(0, 30),
          }));
        }
        break;

      case 'PNL_FEED':
        if (data.type === 'RISK_STATUS') {
          set({
            todayPnl: -Math.abs(data.data?.dailyLoss || 0),
            tradingHalted: data.data?.tradingHalted,
            haltReason: data.data?.haltReason,
            paperMode: data.data?.paperMode,
          });
        }
        if (data.type === 'POSITIONS_SYNCED') {
          set({ positions: data.positions || [] });
        }
        break;

      case 'ALERT_FEED':
        set((state) => ({
          alerts: [data, ...state.alerts].slice(0, 20),
        }));
        break;

      case 'CHAIN_FEED':
        set((state) => ({
          optionChain: data.chain || state.optionChain,
          spot: data.spot || state.spot,
          spotChange: data.spotChange !== undefined ? data.spotChange : state.spotChange,
          spotChangePercent: data.spotChangePercent !== undefined ? data.spotChangePercent : state.spotChangePercent,
          atm: data.atm || state.atm,
          pcr: data.pcr !== undefined ? data.pcr : state.pcr,
          lastChainUpdate: data.updatedAt || new Date().toLocaleTimeString('en-IN'),
        }));
        break;

      case 'STATUS_FEED':
        if (data.type === 'MODE_CHANGED') {
          set({ paperMode: data.mode === 'PAPER' });
        }
        break;

      default:
        break;
    }
  },

  dismissAlert: (index) =>
    set((state) => ({
      alerts: state.alerts.filter((_, i) => i !== index),
    })),

  clearSignals: () => set({ signals: [], latestSignal: null }),
}));
