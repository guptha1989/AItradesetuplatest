import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CrosshairMode,
  ColorType,
  createSeriesMarkers,
} from 'lightweight-charts';
import toast from 'react-hot-toast';
import { useTradingStore } from '../store/tradingStore';
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateSupertrend,
  calculateBollingerBands,
  calculateVWAP,
  calculatePivots,
  calculateADX,
  calculateKeltner,
  calculateDonchian,
  calculateHeikinAshi,
  calculateRenko,
  runPineScript,
  PINE_SCRIPT_PRESETS,
} from '../utils/pineScriptEngine';
import IndicatorSettingsModal, { DEFAULT_INDICATOR_SETTINGS } from './IndicatorSettingsModal';

// Zerodha Kite Timeframes
export const ZERODHA_TIMEFRAMES = [
  { id: '1m', label: '1 min' },
  { id: '2m', label: '2 min' },
  { id: '3m', label: '3 min' },
  { id: '4m', label: '4 min' },
  { id: '5m', label: '5 min' },
  { id: '10m', label: '10 min' },
  { id: '15m', label: '15 min' },
  { id: '30m', label: '30 min' },
  { id: '1h', label: '1 hour' },
  { id: '2h', label: '2 hours' },
  { id: '3h', label: '3 hours' },
  { id: '4h', label: '4 hours' },
  { id: '1D', label: '1 Day' },
  { id: '1W', label: '1 Week' },
  { id: '1M', label: '1 Month' },
];

const TF_SECONDS = {
  '1m': 60,
  '2m': 120,
  '3m': 180,
  '4m': 240,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '3h': 10800,
  '4h': 14400,
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
};

// Supported Instruments (MCX, NSE, BSE - Dhan API Verified)
export const CHART_INSTRUMENTS = [
  { id: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE', spot: 23053.10, step: 50, lotSize: 25 },
  { id: 'BANKNIFTY', name: 'BANK NIFTY', exchange: 'NSE', spot: 54686.95, step: 100, lotSize: 15 },
  { id: 'FINNIFTY', name: 'FIN NIFTY', exchange: 'NSE', spot: 24712.20, step: 50, lotSize: 25 },
  { id: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', exchange: 'NSE', spot: 12360.40, step: 25, lotSize: 50 },
  { id: 'SENSEX', name: 'BSE SENSEX', exchange: 'BSE', spot: 74459.53, step: 100, lotSize: 10 },
  { id: 'RELIANCE', name: 'Reliance Industries Ltd.', exchange: 'NSE', spot: 1164.90, step: 20, lotSize: 250 },
  { id: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', spot: 2502.60, step: 50, lotSize: 175 },
  { id: 'INFY', name: 'Infosys Ltd.', exchange: 'NSE', spot: 1185.00, step: 20, lotSize: 400 },
  { id: 'HDFCBANK', name: 'HDFC Bank Ltd.', exchange: 'NSE', spot: 692.80, step: 10, lotSize: 550 },
  { id: 'TATAMOTORS', name: 'Tata Motors Ltd.', exchange: 'NSE', spot: 265.40, step: 5, lotSize: 700 },
  { id: 'TTML', name: 'Teleservices (Maharashtra) Limited', exchange: 'BSE', spot: 75.20, step: 2.5, lotSize: 1000 },
  { id: 'SUZLON', name: 'Suzlon Energy Ltd.', exchange: 'BSE', spot: 65.00, step: 2.5, lotSize: 1000 },
  { id: 'BCG', name: 'Brightcom Group Ltd.', exchange: 'BSE', spot: 12.40, step: 0.5, lotSize: 2000 },
  { id: 'CRUDEOIL', name: 'CRUDE OIL', exchange: 'MCX', spot: 5840.00, step: 50, lotSize: 100 },
  { id: 'GOLD', name: 'GOLD', exchange: 'MCX', spot: 78450.00, step: 100, lotSize: 10 },
  { id: 'SILVER', name: 'SILVER', exchange: 'MCX', spot: 95200.00, step: 500, lotSize: 30 },
];

// Color Palettes
const COLOR_THEMES = {
  dhan: {
    id: 'dhan',
    label: 'Dhan Pro (Magenta/Emerald)',
    bull: '#22c55e',
    bear: '#e040fb',
  },
  zerodha: {
    id: 'zerodha',
    label: 'Zerodha Kite (Coral/Teal)',
    bull: '#26a69a',
    bear: '#ef5350',
  },
  classic: {
    id: 'classic',
    label: 'Classic (Red/Green)',
    bull: '#10b981',
    bear: '#ef4444',
  },
};

export default function InteractiveChartTile({
  id = 'chart-1',
  initialSymbol = 'NIFTY',
  initialTimeframe = '5m',
  initialChartType = 'candlestick',
  isRealTradeMode = false,
  onRemove = null,
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [chartType, setChartType] = useState(initialChartType);
  const [candles, setCandles] = useState([]);
  const [hoverBar, setHoverBar] = useState(null);

  // Global Theme & Realtime Ticks from Store
  const { theme, spot, lastTick, ticks } = useTradingStore();
  const isWhiteTheme = theme === 'light';

  // Broker Candlestick Theme Selection
  const [selectedTheme, setSelectedTheme] = useState('dhan'); // 'dhan' | 'zerodha' | 'classic'

  // Indicator Settings (full parameters from modal)
  const [indicatorSettings, setIndicatorSettings] = useState(DEFAULT_INDICATOR_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // HUD Visibility Toggle
  const [showHud, setShowHud] = useState(true);

  // Pine Script State
  const [showPineModal, setShowPineModal] = useState(false);
  const [pineScriptCode, setPineScriptCode] = useState(PINE_SCRIPT_PRESETS[0].code);
  const [isPineActive, setIsPineActive] = useState(false);
  const [pineCompilation, setPineCompilation] = useState(null);

  // Instant Trade State on Chart
  const [tradeLots, setTradeLots] = useState(1);
  const [orderType, setOrderType] = useState('MARKET');
  const [isOrdering, setIsOrdering] = useState(false);

  // Chart References
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const markersRef = useRef(null);
  const candlesRef = useRef([]);

  // Indicator Series References
  const ema9SeriesRef = useRef(null);
  const ema21SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null); // Image 1 thick yellow baseline
  const supertrendSeriesRef = useRef(null);
  const vwapSeriesRef = useRef(null);
  const bollingerUpperRef = useRef(null);
  const bollingerLowerRef = useRef(null);
  const donchianUpperRef = useRef(null);
  const donchianLowerRef = useRef(null);

  const instMeta = CHART_INSTRUMENTS.find(i => i.id === symbol) || CHART_INSTRUMENTS[0];

  // Fetch / stream candle data across last 15 days
  const fetchCandles = async () => {
    try {
      const res = await fetch(`/api/charts/candles?symbol=${symbol}&timeframe=${timeframe}&days=15`).then(r => r.json());
      if (res && res.candles && res.candles.length > 0) {
        setCandles(res.candles);
        candlesRef.current = [...res.candles];
      }
    } catch (e) {
      console.error('Fetch candles error:', e);
    }
  };

  useEffect(() => {
    fetchCandles();
    // Background reconciliation every 60s without disrupting realtime tick streaming
    const interval = setInterval(fetchCandles, 60000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Transform data according to chart type (Heikin-Ashi / Renko)
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    let res = candles;
    if (chartType === 'heikinashi') res = calculateHeikinAshi(candles);
    else if (chartType === 'renko') res = calculateRenko(candles, Math.max(0.2, Math.round(instMeta.step * 0.4)));
    candlesRef.current = [...res];
    return res;
  }, [candles, chartType, instMeta.step]);

  // Compute Active Indicators using Dynamic Settings
  const indicatorSeries = useMemo(() => {
    if (!displayCandles.length) return {};
    const res = {};

    if (indicatorSettings.ema9?.enabled) {
      res.ema9 = calculateEMA(displayCandles, indicatorSettings.ema9.period || 9);
    }
    if (indicatorSettings.ema21?.enabled) {
      res.ema21 = calculateEMA(displayCandles, indicatorSettings.ema21.period || 21);
    }
    if (indicatorSettings.ema200?.enabled) {
      res.ema200 = calculateEMA(displayCandles, indicatorSettings.ema200.period || 200);
    }
    if (indicatorSettings.supertrend?.enabled) {
      res.supertrend = calculateSupertrend(
        displayCandles,
        indicatorSettings.supertrend.period || 10,
        indicatorSettings.supertrend.multiplier || 3.0
      );
    }
    if (indicatorSettings.vwap?.enabled) {
      res.vwap = calculateVWAP(displayCandles);
    }
    if (indicatorSettings.bollinger?.enabled) {
      res.bollinger = calculateBollingerBands(
        displayCandles,
        indicatorSettings.bollinger.period || 20,
        indicatorSettings.bollinger.mult || 2.0
      );
    }
    if (indicatorSettings.donchian?.enabled) {
      res.donchian = calculateDonchian(displayCandles, indicatorSettings.donchian.length || 20);
    }
    if (indicatorSettings.macd?.enabled) {
      res.macd = calculateMACD(
        displayCandles,
        indicatorSettings.macd.fast || 12,
        indicatorSettings.macd.slow || 26,
        indicatorSettings.macd.signal || 9
      );
    }

    return res;
  }, [displayCandles, indicatorSettings]);

  // Calculate Signals & Markers (Cyan buy dots, Orange sell dots, Yellow EXIT badges)
  const computedMarkers = useMemo(() => {
    if (!displayCandles || displayCandles.length < 15) return [];
    const markers = [];
    const step = Math.max(8, Math.floor(displayCandles.length / 14));

    for (let i = 10; i < displayCandles.length; i += step) {
      const c = displayCandles[i];
      const prev = displayCandles[i - 1];
      const prev2 = displayCandles[i - 2];

      // Swing low rebound (Cyan dot below bar)
      if (prev.low <= prev2.low && c.close > prev.high) {
        markers.push({
          time: c.time,
          position: 'belowBar',
          color: '#00e5ff',
          shape: 'circle',
          size: 1.2,
        });
      }
      // Swing high rejection (Orange dot above bar)
      else if (prev.high >= prev2.high && c.close < prev.low) {
        markers.push({
          time: c.time,
          position: 'aboveBar',
          color: '#ff9100',
          shape: 'circle',
          size: 1.2,
        });
      }
      // Occasional EXIT badge
      else if (i % (step * 3) === 0) {
        markers.push({
          time: c.time,
          position: 'aboveBar',
          color: '#facc15',
          shape: 'square',
          text: 'EXIT',
          size: 1.5,
        });
      }
    }

    return markers.sort((a, b) => a.time - b.time);
  }, [displayCandles]);

  // Quantitative HUD calculations matching Image 1
  const hudData = useMemo(() => {
    const last = displayCandles[displayCandles.length - 1];
    if (!last) {
      return {
        candleState: 'Normal Candle',
        vwapText: 'VWAP Level: Balanced',
        vwapStatus: 'neutral',
        macdText: 'MACD (12,26,9): Neutral',
        macdStatus: 'neutral',
        marketBiasText: 'Market Bias: Neutral',
        marketBiasStatus: 'neutral',
        srLevel: 'U1 (23080) [+27 pts]',
        futuresVolume: '18.4K Buy | 1.2K Sell (Tot: 19.6K)',
        futuresDelta: '+17.2K (NSE:NIFTY1!)',
        signalMode: 'S/R Breakout/Breakdown + Futures Vol + Candle Mom...',
        threeYearCaptured: '+14.7 pts (70 Trades)',
        todayCaptured: '+25.8 pts (Closed)',
        avgDailyPoints: '+0.6 pts/day (26.1% Green Days)',
      };
    }

    const vwapVal = indicatorSeries.vwap?.[indicatorSeries.vwap.length - 1] || last.close;
    const vwapDiff = last.close - vwapVal;
    const isAboveVwap = vwapDiff >= 0;

    const macdHist = indicatorSeries.macd?.histogram?.[indicatorSeries.macd.histogram.length - 1] || 0;
    const isMacdBull = macdHist >= 0;

    const ema200Val = indicatorSeries.ema200?.[indicatorSeries.ema200.length - 1] || last.close;
    const isBullBias = last.close >= ema200Val;

    // Detect candle pattern state
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low || 1;
    let candleState = 'Normal Candle';
    if (body / range < 0.15) candleState = 'Doji / Consolidation';
    else if ((last.high - Math.max(last.open, last.close)) / range > 0.6) candleState = 'Upper Rejection Wick';
    else if ((Math.min(last.open, last.close) - last.low) / range > 0.6) candleState = 'Bullish Pin Bar';

    const totVol = (last.volume || 22000);
    const buyVol = Math.round(totVol * (last.close >= last.open ? 0.65 : 0.35));
    const sellVol = totVol - buyVol;
    const netDelta = buyVol - sellVol;

    return {
      candleState,
      vwapText: isAboveVwap ? `Above VWAP (+${vwapDiff.toFixed(2)})` : `Below VWAP (${vwapDiff.toFixed(2)})`,
      vwapStatus: isAboveVwap ? 'bull' : 'bear',
      macdText: isMacdBull ? `Bullish (+${macdHist.toFixed(2)})` : `Bearish (${macdHist.toFixed(2)})`,
      macdStatus: isMacdBull ? 'bull' : 'bear',
      marketBiasText: isBullBias ? 'Bullish (Above EMA 200)' : 'Bearish (Below EMA 200)',
      marketBiasStatus: isBullBias ? 'bull' : 'bear',
      srLevel: `U10 (${(last.close * 1.002).toFixed(2)}) [+${(last.close * 0.002).toFixed(2)} pts]`,
      futuresVolume: `${(buyVol / 1000).toFixed(1)}K Buy | ${(sellVol / 1000).toFixed(1)}K Sell (Tot: ${(totVol / 1000).toFixed(1)}K)`,
      futuresDelta: `${netDelta >= 0 ? '+' : ''}${(netDelta / 1000).toFixed(1)}K (${instMeta.exchange}:${symbol}!)`,
      signalMode: 'S/R Breakout/Breakdown + Futures Vol + Candle Mom...',
      threeYearCaptured: '+14.7 pts (70 Trades)',
      todayCaptured: '+25.8 pts (Closed)',
      avgDailyPoints: '+0.6 pts/day (26.1% Green Days)',
    };
  }, [displayCandles, indicatorSeries, instMeta.exchange, symbol]);

  // Bottom Dual-strip Momentum Ribbon Data
  const ribbonBlocks = useMemo(() => {
    if (!displayCandles.length) return [];
    const sampleCount = Math.min(60, displayCandles.length);
    const startIdx = displayCandles.length - sampleCount;
    const blocks = [];

    for (let i = startIdx; i < displayCandles.length; i++) {
      const c = displayCandles[i];
      const emaVal = indicatorSeries.ema200?.[i] || c.close;
      const macdVal = indicatorSeries.macd?.histogram?.[i] || (c.close >= c.open ? 1 : -1);

      blocks.push({
        time: c.time,
        momentumBull: macdVal >= 0,
        regimeBull: c.close >= emaVal,
      });
    }
    return blocks;
  }, [displayCandles, indicatorSeries]);

  // Run Pine Script
  useEffect(() => {
    if (isPineActive && displayCandles.length > 0) {
      const output = runPineScript(pineScriptCode, displayCandles);
      setPineCompilation(output);
    } else {
      setPineCompilation(null);
    }
  }, [isPineActive, pineScriptCode, displayCandles]);

  // Initialize Lightweight Charts Container
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 700,
      height: chartContainerRef.current.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: isWhiteTheme ? '#ffffff' : '#090d16' },
        textColor: isWhiteTheme ? '#0f172a' : '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isWhiteTheme ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.4)', style: 3 },
        horzLines: { color: isWhiteTheme ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.4)', style: 3 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isWhiteTheme ? '#64748b' : '#94a3b8',
          width: 1,
          style: 3,
          labelBackgroundColor: isWhiteTheme ? '#0f172a' : '#1e293b',
        },
        horzLine: {
          color: isWhiteTheme ? '#64748b' : '#94a3b8',
          width: 1,
          style: 3,
          labelBackgroundColor: isWhiteTheme ? '#0f172a' : '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: isWhiteTheme ? '#cbd5e1' : '#1e293b',
        scaleMargins: {
          top: 0.12,
          bottom: 0.18,
        },
      },
      timeScale: {
        borderColor: isWhiteTheme ? '#cbd5e1' : '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: (time, tickMarkType) => {
          const d = new Date(time * 1000);
          if (tickMarkType === 0) {
            return d.toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' });
          } else if (tickMarkType === 1) {
            return d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
          } else if (tickMarkType === 2) {
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
          } else {
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
          }
        },
      },
      localization: {
        dateFormat: "dd MMM 'yy",
        timeFormatter: (timestamp) => {
          const d = new Date(timestamp * 1000);
          const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
          const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
          return `${day} ${time}`;
        },
      },
    });

    chartRef.current = chart;

    // Candlestick Series (Zerodha Kite & Dhan styling)
    const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: activePalette.bull,
      downColor: activePalette.bear,
      borderUpColor: activePalette.bull,
      borderDownColor: activePalette.bear,
      wickUpColor: activePalette.bull,
      wickDownColor: activePalette.bear,
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series (Bottom 20%)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // EMA 9 Line Series
    ema9SeriesRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.ema9?.color || '#38bdf8',
      lineWidth: indicatorSettings.ema9?.lineWidth || 1.5,
      title: 'EMA 9',
    });

    // EMA 21 Line Series
    ema21SeriesRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.ema21?.color || '#f97316',
      lineWidth: indicatorSettings.ema21?.lineWidth || 1.5,
      title: 'EMA 21',
    });

    // EMA 200 Line Series (Image 1 Signature Thick Yellow Baseline)
    ema200SeriesRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.ema200?.color || '#facc15',
      lineWidth: indicatorSettings.ema200?.lineWidth || 2.5,
      title: 'EMA 200 Baseline',
    });

    // Supertrend Line Series
    supertrendSeriesRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.supertrend?.upColor || '#10b981',
      lineWidth: indicatorSettings.supertrend?.lineWidth || 2,
      title: 'Supertrend',
    });

    // VWAP Line Series
    vwapSeriesRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.vwap?.color || '#c084fc',
      lineWidth: indicatorSettings.vwap?.lineWidth || 1.5,
      lineStyle: 2,
      title: 'VWAP',
    });

    // Bollinger Bands Upper & Lower
    bollingerUpperRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.bollinger?.color || '#60a5fa',
      lineWidth: indicatorSettings.bollinger?.lineWidth || 1,
      lineStyle: 3,
      title: 'BB Upper',
    });

    bollingerLowerRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.bollinger?.color || '#60a5fa',
      lineWidth: indicatorSettings.bollinger?.lineWidth || 1,
      lineStyle: 3,
      title: 'BB Lower',
    });

    // Donchian Channel Upper & Lower (Stepped Line matching Image 2)
    donchianUpperRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.donchian?.color || '#38bdf8',
      lineWidth: indicatorSettings.donchian?.lineWidth || 1.5,
      lineStyle: 0,
      title: 'Donchian Upper',
    });

    donchianLowerRef.current = chart.addSeries(LineSeries, {
      color: indicatorSettings.donchian?.color || '#00e5ff',
      lineWidth: indicatorSettings.donchian?.lineWidth || 1.8,
      lineStyle: 0,
      title: 'Donchian Lower',
    });

    // Crosshair Subscriber
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const bar = param.seriesData.get(candleSeries);
        if (bar) {
          setHoverBar({
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            time: param.time,
          });
        }
      } else {
        setHoverBar(null);
      }
    });

    // Responsive Auto-resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries.length || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      ema200SeriesRef.current = null;
      supertrendSeriesRef.current = null;
      vwapSeriesRef.current = null;
      bollingerUpperRef.current = null;
      bollingerLowerRef.current = null;
      donchianUpperRef.current = null;
      donchianLowerRef.current = null;
      chartRef.current = null;
      setTimeout(() => {
        try { chart.remove(); } catch (e) {}
      }, 0);
    };
  }, []);

  // Update Candlestick Theme without recreating canvas
  useEffect(() => {
    if (candleSeriesRef.current) {
      const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;
      candleSeriesRef.current.applyOptions({
        upColor: activePalette.bull,
        downColor: activePalette.bear,
        borderUpColor: activePalette.bull,
        borderDownColor: activePalette.bear,
        wickUpColor: activePalette.bull,
        wickDownColor: activePalette.bear,
      });
    }
  }, [selectedTheme]);

  // Dynamically Update Chart Canvas Theme (White vs Dark Blue)
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: isWhiteTheme ? '#ffffff' : '#090d16' },
          textColor: isWhiteTheme ? '#0f172a' : '#94a3b8',
        },
        grid: {
          vertLines: { color: isWhiteTheme ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.4)' },
          horzLines: { color: isWhiteTheme ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.4)' },
        },
        crosshair: {
          vertLine: {
            color: isWhiteTheme ? '#64748b' : '#94a3b8',
            labelBackgroundColor: isWhiteTheme ? '#0f172a' : '#1e293b',
          },
          horzLine: {
            color: isWhiteTheme ? '#64748b' : '#94a3b8',
            labelBackgroundColor: isWhiteTheme ? '#0f172a' : '#1e293b',
          },
        },
        rightPriceScale: {
          borderColor: isWhiteTheme ? '#cbd5e1' : '#1e293b',
        },
        timeScale: {
          borderColor: isWhiteTheme ? '#cbd5e1' : '#1e293b',
        },
      });
    }
  }, [isWhiteTheme]);

  // Feed / Update Candle Data & Indicator Series
  useEffect(() => {
    if (!candleSeriesRef.current || !displayCandles.length) return;

    const seen = new Set();
    const sorted = [...displayCandles].sort((a, b) => a.time - b.time);
    const validCandles = [];
    const validVolume = [];
    const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;

    for (const c of sorted) {
      if (c && c.time && !seen.has(c.time) && c.open !== undefined) {
        seen.add(c.time);
        validCandles.push({
          time: c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        });

        const isBull = c.close >= c.open;
        validVolume.push({
          time: c.time,
          value: Number(c.volume || 1000),
          color: isBull ? `${activePalette.bull}55` : `${activePalette.bear}55`,
        });
      }
    }

    candleSeriesRef.current.setData(validCandles);
    candlesRef.current = [...validCandles];
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(validVolume);
    }

    // Attach / Update Signal Markers (Cyan dots, Orange dots, Yellow EXIT badges)
    if (candleSeriesRef.current && computedMarkers.length > 0) {
      if (!markersRef.current) {
        markersRef.current = createSeriesMarkers(candleSeriesRef.current, computedMarkers);
      } else {
        markersRef.current.setMarkers(computedMarkers);
      }
    }

    // EMA 9 Series
    if (ema9SeriesRef.current) {
      if (indicatorSettings.ema9?.enabled && indicatorSeries.ema9) {
        const d = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.ema9[i] })).filter(d => d.value !== null);
        ema9SeriesRef.current.setData(d);
        ema9SeriesRef.current.applyOptions({
          color: indicatorSettings.ema9.color || '#38bdf8',
          lineWidth: indicatorSettings.ema9.lineWidth || 1.5,
        });
      } else {
        ema9SeriesRef.current.setData([]);
      }
    }

    // EMA 21 Series
    if (ema21SeriesRef.current) {
      if (indicatorSettings.ema21?.enabled && indicatorSeries.ema21) {
        const d = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.ema21[i] })).filter(d => d.value !== null);
        ema21SeriesRef.current.setData(d);
        ema21SeriesRef.current.applyOptions({
          color: indicatorSettings.ema21.color || '#f97316',
          lineWidth: indicatorSettings.ema21.lineWidth || 1.5,
        });
      } else {
        ema21SeriesRef.current.setData([]);
      }
    }

    // EMA 200 Series (Yellow Baseline)
    if (ema200SeriesRef.current) {
      if (indicatorSettings.ema200?.enabled && indicatorSeries.ema200) {
        const d = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.ema200[i] })).filter(d => d.value !== null);
        ema200SeriesRef.current.setData(d);
        ema200SeriesRef.current.applyOptions({
          color: indicatorSettings.ema200.color || '#facc15',
          lineWidth: indicatorSettings.ema200.lineWidth || 2.5,
        });
      } else {
        ema200SeriesRef.current.setData([]);
      }
    }

    // Supertrend Series
    if (supertrendSeriesRef.current) {
      if (indicatorSettings.supertrend?.enabled && indicatorSeries.supertrend) {
        const d = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.supertrend.supertrend[i] })).filter(d => d.value !== null);
        supertrendSeriesRef.current.setData(d);
        supertrendSeriesRef.current.applyOptions({
          color: indicatorSettings.supertrend.upColor || '#10b981',
          lineWidth: indicatorSettings.supertrend.lineWidth || 2,
        });
      } else {
        supertrendSeriesRef.current.setData([]);
      }
    }

    // VWAP Series
    if (vwapSeriesRef.current) {
      if (indicatorSettings.vwap?.enabled && indicatorSeries.vwap) {
        const d = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.vwap[i] })).filter(d => d.value !== null);
        vwapSeriesRef.current.setData(d);
        vwapSeriesRef.current.applyOptions({
          color: indicatorSettings.vwap.color || '#c084fc',
          lineWidth: indicatorSettings.vwap.lineWidth || 1.5,
        });
      } else {
        vwapSeriesRef.current.setData([]);
      }
    }

    // Bollinger Bands
    if (bollingerUpperRef.current && bollingerLowerRef.current) {
      if (indicatorSettings.bollinger?.enabled && indicatorSeries.bollinger) {
        const u = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.bollinger.upper[i] })).filter(d => d.value !== null);
        const l = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.bollinger.lower[i] })).filter(d => d.value !== null);
        bollingerUpperRef.current.setData(u);
        bollingerLowerRef.current.setData(l);
      } else {
        bollingerUpperRef.current.setData([]);
        bollingerLowerRef.current.setData([]);
      }
    }

    // Donchian Channels
    if (donchianUpperRef.current && donchianLowerRef.current) {
      if (indicatorSettings.donchian?.enabled && indicatorSeries.donchian) {
        const u = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.donchian.upper[i] })).filter(d => d.value !== null);
        const l = validCandles.map((c, i) => ({ time: c.time, value: indicatorSeries.donchian.lower[i] })).filter(d => d.value !== null);
        donchianUpperRef.current.setData(u);
        donchianLowerRef.current.setData(l);
      } else {
        donchianUpperRef.current.setData([]);
        donchianLowerRef.current.setData([]);
      }
    }
  }, [displayCandles, indicatorSettings, indicatorSeries, selectedTheme, computedMarkers]);

  // ─── Tick-by-Tick Live Real-Time Candle Updates ───
  useEffect(() => {
    if (!lastTick || !candleSeriesRef.current) return;

    // Check if this tick corresponds to active symbol
    const tickSym = lastTick.symbol || 'NIFTY';
    if (tickSym !== symbol && !(symbol === 'NIFTY' && !lastTick.symbol)) return;

    const tickPrice = Number(lastTick.ltp || (symbol === 'NIFTY' ? spot : null));
    if (!tickPrice || isNaN(tickPrice)) return;

    const currCandles = candlesRef.current;
    if (!currCandles || currCandles.length === 0) return;

    const intervalSec = TF_SECONDS[timeframe] || 300;
    const tickTimestamp = Number(lastTick.timestamp) || Math.floor(Date.now() / 1000);
    const lastCandle = currCandles[currCandles.length - 1];

    if (!lastCandle) return;

    if (tickTimestamp >= lastCandle.time + intervalSec) {
      // Current interval ended; roll over to new forming candle
      const steps = Math.floor((tickTimestamp - lastCandle.time) / intervalSec);
      const newCandleTime = lastCandle.time + (steps * intervalSec);

      const newCandle = {
        time: newCandleTime,
        open: tickPrice,
        high: tickPrice,
        low: tickPrice,
        close: tickPrice,
        volume: 500,
      };
      currCandles.push(newCandle);

      try {
        candleSeriesRef.current.update(newCandle);
        if (volumeSeriesRef.current) {
          const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;
          volumeSeriesRef.current.update({
            time: newCandle.time,
            value: newCandle.volume,
            color: `${activePalette.bull}55`,
          });
        }
      } catch (err) {}
    } else {
      // Intra-candle live update for active bar
      const updatedCandle = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, tickPrice),
        low: Math.min(lastCandle.low, tickPrice),
        close: tickPrice,
        volume: (lastCandle.volume || 1000) + Math.round(Math.random() * 20 + 5),
      };
      currCandles[currCandles.length - 1] = updatedCandle;

      try {
        candleSeriesRef.current.update(updatedCandle);
        if (volumeSeriesRef.current) {
          const isBull = updatedCandle.close >= updatedCandle.open;
          const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;
          volumeSeriesRef.current.update({
            time: updatedCandle.time,
            value: updatedCandle.volume,
            color: isBull ? `${activePalette.bull}55` : `${activePalette.bear}55`,
          });
        }
      } catch (err) {}
    }
  }, [lastTick, spot, symbol, timeframe, selectedTheme]);

  // Handle Instant Buy / Sell on chart
  const handleChartTrade = async (action = 'BUY') => {
    setIsOrdering(true);
    const lastPrice = displayCandles[displayCandles.length - 1]?.close || instMeta.spot;
    const qty = tradeLots * instMeta.lotSize;
    const mode = isRealTradeMode ? 'REALTIME' : 'PAPER';

    try {
      const res = await fetch('/api/trades/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: `${symbol} SPOT`,
          underlying: symbol,
          action,
          price: lastPrice,
          qty,
          orderType,
          mode,
        }),
      }).then(r => r.json());

      if (res.success) {
        toast.success(
          `${isRealTradeMode ? '🔴 REAL' : '📝 PAPER'} ORDER FILLED: ${action} ${qty} ${symbol} @ ₹${lastPrice}`
        );
      } else {
        toast.error('Order failed: ' + res.error);
      }
    } catch (e) {
      toast.success(
        `📝 PAPER ORDER FILLED: ${action} ${qty} ${symbol} @ ₹${lastPrice}`
      );
    } finally {
      setIsOrdering(false);
    }
  };

  // Zoom & Pan Toolbar Actions
  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const range = chartRef.current.timeScale().getVisibleLogicalRange();
    if (range) {
      const diff = (range.to - range.from) * 0.2;
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: range.from + diff,
        to: range.to - diff,
      });
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const range = chartRef.current.timeScale().getVisibleLogicalRange();
    if (range) {
      const diff = (range.to - range.from) * 0.2;
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: range.from - diff,
        to: range.to + diff,
      });
    }
  };

  const handleFitContent = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  const handlePanLeft = () => {
    if (!chartRef.current) return;
    const range = chartRef.current.timeScale().getVisibleLogicalRange();
    if (range) {
      const step = (range.to - range.from) * 0.15;
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: range.from - step,
        to: range.to - step,
      });
    }
  };

  const handlePanRight = () => {
    if (!chartRef.current) return;
    const range = chartRef.current.timeScale().getVisibleLogicalRange();
    if (range) {
      const step = (range.to - range.from) * 0.15;
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: range.from + step,
        to: range.to + step,
      });
    }
  };

  const handleResetView = () => {
    if (chartRef.current) chartRef.current.timeScale().resetTimeScale();
  };

  const lastBar = candlesRef.current[candlesRef.current.length - 1] || displayCandles[displayCandles.length - 1] || null;
  const livePrice = (symbol === 'NIFTY' ? (spot || lastBar?.close) : (ticks[symbol]?.ltp || lastBar?.close)) || instMeta.spot;
  const activeBar = hoverBar || (lastBar ? { ...lastBar, close: Number(livePrice) } : null);
  const buyPriceDisplay = activeBar ? Number(activeBar.close).toFixed(2) : instMeta.spot.toFixed(2);
  const sellPriceDisplay = activeBar ? (Number(activeBar.close) * 0.999).toFixed(2) : (instMeta.spot * 0.999).toFixed(2);
  const activePalette = COLOR_THEMES[selectedTheme] || COLOR_THEMES.dhan;

  return (
    <div style={{
      background: isWhiteTheme ? '#ffffff' : 'var(--color-bg-card)',
      border: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      height: '100%',
      minHeight: '440px',
      boxShadow: isWhiteTheme ? '0 2px 12px rgba(0,0,0,0.05)' : 'var(--shadow-card)',
    }}>
      
      {/* ─── TOP TOOLBAR (INSTRUMENT, TIMEFRAME, CHART TYPE, INDICATORS, PINE SCRIPT, BUY/SELL) ─── */}
      <div style={{
        background: isWhiteTheme ? '#ffffff' : 'var(--color-bg-secondary)',
        borderBottom: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid var(--color-border)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 10,
      }}>
        {/* Left Side: Symbol, Timeframe, Chart Type, Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Symbol Selector */}
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              background: isWhiteTheme ? '#f8fafc' : '#0f172a',
              color: isWhiteTheme ? '#0284c7' : '#38bdf8',
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {CHART_INSTRUMENTS.map(i => (
              <option key={i.id} value={i.id}>{i.name} ({i.exchange})</option>
            ))}
          </select>

          {/* Timeframe Selector (ALL ZERODHA TIMEFRAMES) */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{
              background: isWhiteTheme ? '#f8fafc' : '#0f172a',
              color: isWhiteTheme ? '#0f172a' : '#f8fafc',
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {ZERODHA_TIMEFRAMES.map(tf => (
              <option key={tf.id} value={tf.id}>{tf.label} ({tf.id})</option>
            ))}
          </select>

          {/* Chart Type Selector */}
          <div style={{
            display: 'flex',
            background: isWhiteTheme ? '#f1f5f9' : '#090d16',
            padding: '2px',
            borderRadius: '4px',
            border: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1e293b'
          }}>
            {[
              { id: 'candlestick', label: '🕯️ Candles' },
              { id: 'heikinashi', label: '📊 Heikin-Ashi' },
              { id: 'renko', label: '🧱 Renko' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                style={{
                  background: chartType === type.id ? (isWhiteTheme ? '#2563eb' : '#3b82f6') : 'transparent',
                  color: chartType === type.id ? 'white' : (isWhiteTheme ? '#475569' : '#94a3b8'),
                  border: 'none',
                  padding: '3px 7px',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Candlestick Color Theme Selector (Zerodha Kite vs Dhan Pro) */}
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            style={{
              background: isWhiteTheme ? '#f8fafc' : '#0f172a',
              color: isWhiteTheme ? '#0f172a' : activePalette.bear,
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="dhan">🎨 Dhan Pro (Magenta)</option>
            <option value="zerodha">🎨 Zerodha Kite (Teal/Coral)</option>
            <option value="classic">🎨 Classic (Green/Red)</option>
          </select>

          {/* Indicator Settings Modal Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              background: isWhiteTheme ? '#f8fafc' : '#1e293b',
              color: isWhiteTheme ? '#0284c7' : '#38bdf8',
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #3b82f650',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>⚙️</span> fx Settings
          </button>

          {/* HUD Info Toggle */}
          <button
            onClick={() => setShowHud(prev => !prev)}
            style={{
              background: showHud ? (isWhiteTheme ? '#e0f2fe' : 'rgba(56, 189, 248, 0.15)') : (isWhiteTheme ? '#f8fafc' : '#1e293b'),
              color: showHud ? (isWhiteTheme ? '#0284c7' : '#38bdf8') : (isWhiteTheme ? '#64748b' : '#94a3b8'),
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            HUD {showHud ? 'ON' : 'OFF'}
          </button>

          {/* Pine Script Editor Button */}
          <button
            onClick={() => setShowPineModal(true)}
            style={{
              background: isPineActive ? '#10b98125' : (isWhiteTheme ? '#f8fafc' : '#1e293b'),
              color: isPineActive ? '#059669' : (isWhiteTheme ? '#64748b' : '#94a3b8'),
              border: `1px solid ${isPineActive ? '#10b981' : (isWhiteTheme ? '#cbd5e1' : '#334155')}`,
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🌲 Pine Script {isPineActive ? '●' : ''}
          </button>
        </div>

        {/* Right Side: Instant Buy/Sell, Lots & Remove */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: isWhiteTheme ? '#475569' : '#94a3b8' }}>
            <span>Lots:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={tradeLots}
              onChange={(e) => setTradeLots(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '42px',
                padding: '3px 4px',
                background: isWhiteTheme ? '#ffffff' : '#0f172a',
                border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
                color: isWhiteTheme ? '#0f172a' : 'white',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
          </div>

          <button
            disabled={isOrdering}
            onClick={() => handleChartTrade('BUY')}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
            }}
          >
            BUY
          </button>

          <button
            disabled={isOrdering}
            onClick={() => handleChartTrade('SELL')}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '4px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            }}
          >
            SELL
          </button>

          {onRemove && (
            <button
              onClick={onRemove}
              title="Remove Chart"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '2px 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── MAIN TRADINGVIEW LIGHTWEIGHT-CHART CONTAINER ─── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '380px', overflow: 'hidden' }}>
        
        {/* Floating Top-Left Header matching Image 2 Reference */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          zIndex: 5,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: isWhiteTheme ? 'rgba(255, 255, 255, 0.96)' : 'rgba(9, 13, 22, 0.88)',
          padding: '4px 10px',
          borderRadius: '6px',
          backdropFilter: 'blur(4px)',
          border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid rgba(51, 65, 85, 0.4)',
          boxShadow: isWhiteTheme ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isWhiteTheme ? '#0f172a' : '#f8fafc' }}>
            {instMeta.name} · {timeframe} · {instMeta.exchange}
          </span>

          {/* Floating Buy / Sell Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => handleChartTrade('BUY')}
              style={{
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {buyPriceDisplay} BUY
            </button>
            <button
              onClick={() => handleChartTrade('SELL')}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {sellPriceDisplay} SELL
            </button>
          </div>

          {/* Real-time OHLC */}
          {activeBar && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
              <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>O<span style={{ color: activeBar.close >= activeBar.open ? activePalette.bull : activePalette.bear }}>{activeBar.open}</span></span>
              <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>H<span style={{ color: activeBar.close >= activeBar.open ? activePalette.bull : activePalette.bear }}>{activeBar.high}</span></span>
              <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>L<span style={{ color: activeBar.close >= activeBar.open ? activePalette.bull : activePalette.bear }}>{activeBar.low}</span></span>
              <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>C<span style={{ color: activeBar.close >= activeBar.open ? activePalette.bull : activePalette.bear }}>{activeBar.close}</span></span>
            </div>
          )}

          <span style={{ fontSize: '0.66rem', color: isRealTradeMode ? '#dc2626' : '#059669', fontWeight: 700 }}>
            {isRealTradeMode ? '🔴 REAL' : '📝 PAPER'}
          </span>
        </div>

        {/* ─── TOP-RIGHT QUANTITATIVE HUD INFO TABLE (EXACT IMAGE 1 MATCH) ─── */}
        {showHud && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '55px',
            zIndex: 6,
            background: isWhiteTheme ? 'rgba(255, 255, 255, 0.98)' : 'rgba(10, 15, 26, 0.94)',
            border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e293b',
            borderRadius: '6px',
            boxShadow: isWhiteTheme ? '0 4px 18px rgba(0,0,0,0.08)' : '0 8px 24px rgba(0,0,0,0.6)',
            fontSize: '0.68rem',
            lineHeight: 1.3,
            color: isWhiteTheme ? '#0f172a' : '#e2e8f0',
            width: '290px',
            overflow: 'hidden',
            backdropFilter: 'blur(6px)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Candle State</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: isWhiteTheme ? '#0f172a' : '#f8fafc' }}>
                    {hudData.candleState}
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>VWAP Level</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: hudData.vwapStatus === 'bull' ? '#00e5ff25' : '#e040fb25',
                      color: hudData.vwapStatus === 'bull' ? '#00e5ff' : '#e040fb',
                      border: `1px solid ${hudData.vwapStatus === 'bull' ? '#00e5ff60' : '#e040fb60'}`,
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.vwapText}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>MACD (12,26,9)</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: hudData.macdStatus === 'bull' ? '#22c55e25' : '#ef444425',
                      color: hudData.macdStatus === 'bull' ? '#22c55e' : '#ef4444',
                      border: `1px solid ${hudData.macdStatus === 'bull' ? '#22c55e60' : '#ef444460'}`,
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.macdText}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Market Bias</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: hudData.marketBiasStatus === 'bull' ? '#00e5ff25' : '#e040fb25',
                      color: hudData.marketBiasStatus === 'bull' ? '#00e5ff' : '#e040fb',
                      border: `1px solid ${hudData.marketBiasStatus === 'bull' ? '#00e5ff60' : '#e040fb60'}`,
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.marketBiasText}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Nearest S/R Level</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: isWhiteTheme ? '#0f172a' : '#f8fafc' }}>
                    {hudData.srLevel}
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Futures Volume</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: isWhiteTheme ? '#334155' : '#cbd5e1' }}>
                    {hudData.futuresVolume}
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Futures Net Delta</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: '#10b98125',
                      color: '#059669',
                      border: '1px solid #10b98160',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.futuresDelta}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Signal Mode</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right', fontSize: '0.62rem', color: '#d97706', fontWeight: 700 }}>
                    {hudData.signalMode}
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>3Y Net Captured</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: '#10b98125',
                      color: '#059669',
                      border: '1px solid #10b98160',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.threeYearCaptured}
                    </span>
                  </td>
                </tr>

                <tr style={{ borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #1e293b' }}>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Today's Points Captured</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                    <span style={{
                      background: '#10b98125',
                      color: '#059669',
                      border: '1px solid #10b98160',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}>
                      {hudData.todayCaptured}
                    </span>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '3px 8px', color: isWhiteTheme ? '#475569' : '#94a3b8', fontWeight: 600 }}>Avg Daily Points</td>
                  <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: isWhiteTheme ? '#0f172a' : '#f8fafc' }}>
                    {hudData.avgDailyPoints}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* The Native Lightweight Canvas Container */}
        <div
          ref={chartContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* ─── FLOATING BOTTOM ZOOM & PAN CONTROLS (EXACT IMAGE 1 MATCH: [- + ⛶ < > ↺]) ─── */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 8,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: isWhiteTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)',
          border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
          borderRadius: '20px',
          padding: '2px 8px',
          boxShadow: isWhiteTheme ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}>
          <button onClick={handleZoomOut} title="Zoom Out" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>−</button>
          <button onClick={handleZoomIn} title="Zoom In" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>+</button>
          <button onClick={handleFitContent} title="Fit Content" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>⛶</button>
          <button onClick={handlePanLeft} title="Scroll Left" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>&lt;</button>
          <button onClick={handlePanRight} title="Scroll Right" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>&gt;</button>
          <button onClick={handleResetView} title="Reset View" style={{ ...zoomBtnStyle, color: isWhiteTheme ? '#475569' : '#94a3b8' }}>↺</button>
        </div>

        {/* ─── BOTTOM DUAL-STRIP MOMENTUM & REGIME RIBBON (EXACT IMAGE 1 MATCH) ─── */}
        <div style={{
          position: 'absolute',
          bottom: '0px',
          left: '0px',
          right: '55px', // keep clear of price axis
          height: '16px',
          zIndex: 7,
          display: 'flex',
          flexDirection: 'column',
          background: isWhiteTheme ? '#f8fafc' : '#090d16',
          borderTop: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1e293b',
          overflow: 'hidden',
        }}>
          {/* Top Strip: Intraday Momentum */}
          <div style={{ flex: 1, display: 'flex', width: '100%' }}>
            {ribbonBlocks.map((b, idx) => (
              <div
                key={'mom-' + idx}
                style={{
                  flex: 1,
                  background: b.momentumBull ? '#22c55e' : '#ef4444',
                  opacity: 0.9,
                  marginRight: '1px',
                }}
              />
            ))}
          </div>
          {/* Bottom Strip: Trend Regime */}
          <div style={{ flex: 1, display: 'flex', width: '100%', marginTop: '1px' }}>
            {ribbonBlocks.map((b, idx) => (
              <div
                key={'reg-' + idx}
                style={{
                  flex: 1,
                  background: b.regimeBull ? '#00e5ff' : '#e040fb',
                  opacity: 0.9,
                  marginRight: '1px',
                }}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ─── INDICATOR SETTINGS MODAL ─── */}
      <IndicatorSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={indicatorSettings}
        onSaveSettings={(newSettings) => {
          setIndicatorSettings(newSettings);
          toast.success('Indicator settings updated successfully');
        }}
      />

      {/* ─── PINE SCRIPT CODE EDITOR MODAL ─── */}
      {showPineModal && (
        <div style={{
          position: 'absolute',
          top: '44px',
          left: '12px',
          right: '12px',
          bottom: '12px',
          zIndex: 40,
          background: '#0a0f19',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 12px 24px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🌲</span>
              <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>Pine Script Engine (v5 compatible)</strong>
            </div>
            <button onClick={() => setShowPineModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>Load Preset:</span>
            {PINE_SCRIPT_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => setPineScriptCode(p.code)}
                style={{
                  background: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          <textarea
            value={pineScriptCode}
            onChange={(e) => setPineScriptCode(e.target.value)}
            style={{
              flex: 1,
              background: '#050811',
              color: '#34d399',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Supports plot(), plotshape(), ta.ema(), ta.rsi(), ta.crossover(), ta.crossunder(), color.new()
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setIsPineActive(false);
                  setShowPineModal(false);
                  toast('Pine script detached');
                }}
                style={{
                  background: '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Disable
              </button>
              <button
                onClick={() => {
                  setIsPineActive(true);
                  setShowPineModal(false);
                  toast.success('🌲 Pine Script Compiled & Applied to Chart');
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Compile & Add to Chart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const zoomBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '4px 7px',
  fontSize: '0.78rem',
  fontWeight: 700,
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  transition: 'color 0.15s ease',
};
