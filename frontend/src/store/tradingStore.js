import { create } from 'zustand';
import { ensureDateInTimestamp, formatDateTime } from '../utils/dateHelper';

const getWSUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3001/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  return `${proto}//${host}:3001/ws`;
};

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  const proto = window.location.protocol;
  const host = window.location.hostname || 'localhost';
  return `${proto}//${host}:3001/api`;
};

const API_BASE = getApiBase();

export const useTradingStore = create((set, get) => ({
  // ─── WebSocket ────────────────────────────────
  ws: null,
  wsConnected: false,
  wsReconnecting: false,

  // ─── Market Data ──────────────────────────────
  spot: 23053.10,
  spotChange: 299.90,
  spotChangePercent: 1.32,
  dayHigh: 23075.40,
  dayLow: 22780.15,
  vix: 13.12,
  pcr: 1.25,
  atm: 23050,
  lastWsTickTime: null,

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
  lastTick: null,

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
  policyAlerts: [],
  savedPolicies: [],
  unreadPolicyAlerts: 0,

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
  theme: typeof window !== 'undefined' ? (localStorage.getItem('app_theme') || 'light') : 'light',
  toggleTheme: () => set(state => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_theme', next);
      document.body.className = next === 'light' ? 'theme-light' : 'theme-darkblue';
    }
    return { theme: next };
  }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_theme', theme);
      document.body.className = theme === 'light' ? 'theme-light' : 'theme-darkblue';
    }
    set({ theme });
  },

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
          lastChainUpdate: ensureDateInTimestamp(chainRes.dhanTime || chainRes.timeFormatted || formatDateTime()),
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

    try {
      const url = getWSUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        set({ ws, wsConnected: true, wsReconnecting: false });
        console.log('✅ WebSocket connected to', url);
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
        set({ ws: null, wsConnected: false, wsReconnecting: true });
        setTimeout(() => {
          get().connectWS();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WS error/reconnecting:', err);
        try { ws.close(); } catch (_) {}
      };

      set({ ws });
    } catch (e) {
      console.error('WS instantiation failed:', e);
      setTimeout(() => get().connectWS(), 2000);
    }
  },

  _handleMessage: (channel, data) => {
    switch (channel) {
      case 'TICK_FEED': {
        const sym = data.symbol || (data.securityId === '13' ? 'NIFTY' : null);
        const ltp = Number(data.ltp || data.spot || 0);
        const timestamp = data.timestamp || Math.floor(Date.now() / 1000);
        const timeStr = ensureDateInTimestamp(data.time || formatDateTime());

        const tickObj = {
          symbol: sym,
          securityId: data.securityId,
          ltp: ltp > 0 ? ltp : undefined,
          spot: ltp > 0 ? ltp : undefined,
          change: data.change,
          changePercent: data.changePercent,
          high: data.high,
          low: data.low,
          volume: data.volume,
          timestamp,
          time: timeStr,
        };

        const isNifty = sym === 'NIFTY' || (!sym && (data.type === 'TICK' || data.spot));
        const atm = ltp > 0 ? Math.round(ltp / 50) * 50 : get().atm;

        set((state) => ({
          lastTick: tickObj,
          lastWsTickTime: timeStr,
          ...(isNifty && ltp > 0 ? {
            spot: ltp,
            spotChange: data.change !== undefined ? data.change : state.spotChange,
            spotChangePercent: data.changePercent !== undefined ? data.changePercent : state.spotChangePercent,
            dayHigh: data.high || Math.max(state.dayHigh, ltp),
            dayLow: data.low || Math.min(state.dayLow, ltp),
            vix: data.vix || state.vix,
            atm,
            replayTime: data.time || state.replayTime,
            replayProgress: data.progressPct || state.replayProgress,
            replayMinute: data.replayMinute || state.replayMinute,
          } : {}),
          ticks: {
            ...state.ticks,
            ...((sym || data.securityId) ? { [sym || data.securityId]: tickObj } : {}),
          },
        }));
        break;
      }

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
        if (data.type === 'POLICY_ALERT' && data.alert) {
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(659.25, ctx.currentTime);
              osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.35);
            }
          } catch (e) {}

          set((state) => ({
            policyAlerts: [data.alert, ...state.policyAlerts].slice(0, 150),
            unreadPolicyAlerts: state.unreadPolicyAlerts + 1,
            alerts: [data, ...state.alerts].slice(0, 30),
          }));
        } else {
          set((state) => ({
            alerts: [data, ...state.alerts].slice(0, 20),
          }));
        }
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

  fetchPolicyAlerts: async (months = 6, limit = 500) => {
    try {
      const res = await fetch(`${API_BASE}/policies/alerts?months=${months}&limit=${limit}`).then(r => r.json());
      if (res.alerts) {
        set({ policyAlerts: res.alerts });
      }
    } catch (e) {
      console.error('Error fetching policy alerts:', e);
    }
  },

  markAlertsRead: () => set({ unreadPolicyAlerts: 0 }),

  fetchSavedPolicies: async () => {
    try {
      const res = await fetch(`${API_BASE}/policies`).then(r => r.json());
      if (res.policies) set({ savedPolicies: res.policies });
    } catch (e) {
      console.error('Error fetching saved policies:', e);
    }
  },

  clearPolicyAlerts: async () => {
    try {
      await fetch(`${API_BASE}/policies/alerts/clear`, { method: 'POST' });
      set({ policyAlerts: [], unreadPolicyAlerts: 0 });
    } catch (e) {
      console.error('Error clearing alerts:', e);
    }
  },
}));
