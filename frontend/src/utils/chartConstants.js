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

export const TF_SECONDS = {
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

