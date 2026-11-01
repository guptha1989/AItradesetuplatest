/**
 * Stock Universes and Instrument Master
 * Allows selecting the stock universe as:
 * - Nifty 50
 * - Nifty 100
 * - Nifty 200
 * - F&O stocks
 * - All stocks
 * - Nifty Options & Indices
 * - MCX Commodities
 */

export const STOCK_UNIVERSES = [
  {
    id: 'NIFTY_50',
    symbol: 'Nifty 50',
    name: 'Nifty 50 Universe',
    description: 'Top 50 high-liquidity benchmark bluechip stocks on NSE',
    stockCount: 50,
    icon: '🏆',
    badge: 'Large Cap',
    exchange: 'NSE',
    category: 'INDEX',
    sampleConstituents: ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 'ITC', 'LT', 'SBIN'],
  },
  {
    id: 'NIFTY_100',
    symbol: 'Nifty 100',
    name: 'Nifty 100 Universe',
    description: 'Top 100 large & mid-cap stocks covering ~70% of market turnover',
    stockCount: 100,
    icon: '📊',
    badge: 'Large & Mid Cap',
    exchange: 'NSE',
    category: 'INDEX',
    sampleConstituents: ['All Nifty 50', 'TRENT', 'BEL', 'HAL', 'VBL', 'DLF', 'SIEMENS', 'ZOMATO'],
  },
  {
    id: 'NIFTY_200',
    symbol: 'Nifty 200',
    name: 'Nifty 200 Universe',
    description: 'Top 200 broad market universe covering ~85% of market capitalization',
    stockCount: 200,
    icon: '📈',
    badge: 'Broad Market',
    exchange: 'NSE',
    category: 'INDEX',
    sampleConstituents: ['Nifty 100', 'DIXON', 'POLYCAB', 'PERSISTENT', 'COFORGE', 'VOLTAS', 'BSE', 'MCX'],
  },
  {
    id: 'FNO_STOCKS',
    symbol: 'F&O Stocks',
    name: 'All F&O Stocks Universe',
    description: 'Complete NSE Derivatives segment (~180 high-beta & high-volume liquid stocks)',
    stockCount: 182,
    icon: '⚡',
    badge: 'Derivatives / F&O',
    exchange: 'NSE F&O',
    category: 'FNO',
    sampleConstituents: ['All Active F&O Equities', 'Weekly & Monthly Options Eligible'],
  },
  {
    id: 'NIFTY_500',
    symbol: 'Nifty 500',
    name: 'Nifty 500 (Broad Market)',
    description: 'Top 500 liquid equities on NSE covering 96% of total market capitalization',
    stockCount: 500,
    icon: '📊',
    badge: 'Nifty 500',
    exchange: 'NSE Equity',
    category: 'EQUITY',
    sampleConstituents: ['Top 500 Liquid NSE Equities'],
  },
  {
    id: 'ALL_STOCKS',
    symbol: 'All Stocks',
    name: 'All Stocks (All 2,000+ NSE Equities)',
    description: 'Entire NSE listed cash market universe spanning 2,000+ large, mid, small, micro-cap equities (including TTML, BCG, Suzlon)',
    stockCount: 2200,
    icon: '🌐',
    badge: 'All 2,000+ Equities',
    exchange: 'NSE Equity',
    category: 'EQUITY',
    sampleConstituents: ['TTML', 'BCG', 'SUZLON', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'All NSE Cash Equities'],
  },
  {
    id: 'BSE_ALL',
    symbol: 'BSE All Stocks',
    name: 'BSE All Stocks (4,000+ BSE Equities)',
    description: 'Entire Bombay Stock Exchange listed universe (4,000+ Equities including BCG, TTML, Suzlon, Turnaround Stocks)',
    stockCount: 4500,
    icon: '🇮🇳',
    badge: 'BSE 4,000+ Equities',
    exchange: 'BSE Equity',
    category: 'BSE',
    sampleConstituents: ['TTML', 'BCG (Brightcom)', 'SUZLON', 'RPOWER', 'YESBANK', 'IDEA', 'RELIANCE', 'TCS'],
  },
  {
    id: 'BSE_SENSEX',
    symbol: 'BSE Sensex',
    name: 'BSE Sensex 30',
    description: 'Top 30 bluechip benchmark companies listed on Bombay Stock Exchange',
    stockCount: 30,
    icon: '🏛️',
    badge: 'BSE Benchmark',
    exchange: 'BSE',
    category: 'BSE',
    sampleConstituents: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'ITC', 'LT', 'SBIN'],
  },
  {
    id: 'BSE_PENNY_SMALLCAP',
    symbol: 'BSE Penny & Smallcap',
    name: 'BSE Penny & Smallcap Turnaround Stocks',
    description: 'High volatility, multi-bagger & turnaround penny stocks (TTML, BCG, Suzlon, RPower, Idea)',
    stockCount: 350,
    icon: '⚡',
    badge: 'Penny & Smallcap',
    exchange: 'BSE',
    category: 'BSE',
    sampleConstituents: ['TTML', 'BCG (Brightcom)', 'SUZLON', 'RPOWER', 'JPPOWER', 'INFIBEAM', 'SOUTHBANK'],
  },
  {
    id: 'TTML',
    symbol: 'TTML',
    name: 'TTML (Tata Teleservices Maharashtra)',
    description: 'Tata Teleservices - High volatility turnaround & breakout stock (BSE/NSE)',
    stockCount: 1,
    icon: '⚡',
    badge: 'Single Stock',
    exchange: 'BSE / NSE',
    category: 'BSE',
    sampleConstituents: ['TTML'],
  },
  {
    id: 'BCG',
    symbol: 'BCG',
    name: 'BCG (Brightcom Group Ltd.)',
    description: 'Brightcom Group - Digital adtech & turnaround stock (BSE/NSE)',
    stockCount: 1,
    icon: '⚡',
    badge: 'Single Stock',
    exchange: 'BSE / NSE',
    category: 'BSE',
    sampleConstituents: ['BCG'],
  },
  {
    id: 'INDICES_SPOTS_FUTURES',
    symbol: 'Indices Spots & Futures',
    name: 'Indices Spots & Futures (Nifty, BankNifty, FinNifty, Midcap, Sensex)',
    description: 'Major Benchmark Index Spot and Futures contracts (NSE & BSE)',
    stockCount: 10,
    icon: '🏛️',
    badge: 'Spot & Futures',
    exchange: 'NSE / BSE',
    category: 'INDICES',
    sampleConstituents: ['NIFTY Spot', 'BANKNIFTY Spot', 'FINNIFTY Spot', 'SENSEX Spot', 'NIFTY-FUT', 'BANKNIFTY-FUT', 'SENSEX-FUT'],
  },
  {
    id: 'INDICES_SPOTS',
    symbol: 'Indices Spots',
    name: 'Indices Cash Spots (Nifty 50, BankNifty, FinNifty, Sensex)',
    description: 'Underlying cash index benchmark spots',
    stockCount: 5,
    icon: '🎯',
    badge: 'Spot Cash',
    exchange: 'NSE / BSE',
    category: 'INDICES',
    sampleConstituents: ['NIFTY 50 Spot', 'BANKNIFTY Spot', 'FINNIFTY Spot', 'MIDCPNIFTY Spot', 'SENSEX Spot'],
  },
  {
    id: 'INDICES_FUTURES',
    symbol: 'Indices Futures',
    name: 'Indices Futures (NIFTY FUT, BANKNIFTY FUT, SENSEX FUT)',
    description: 'Near-Month & Next-Month Index Futures contracts',
    stockCount: 5,
    icon: '⚡',
    badge: 'Index Futures',
    exchange: 'NSE / BSE',
    category: 'INDICES',
    sampleConstituents: ['NIFTY-FUT', 'BANKNIFTY-FUT', 'FINNIFTY-FUT', 'MIDCPNIFTY-FUT', 'SENSEX-FUT'],
  },
  {
    id: 'NIFTY_OPTIONS',
    symbol: 'Nifty Options',
    name: 'Nifty Options & Indices',
    description: 'NIFTY 50, BANKNIFTY, FINNIFTY and ATM/ITM/OTM option chain contracts',
    stockCount: 4,
    icon: '🎯',
    badge: 'Index Options',
    exchange: 'NFO',
    category: 'OPTIONS',
    sampleConstituents: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'Weekly Expiries'],
  },
  {
    id: 'MCX_COMMODITIES',
    symbol: 'MCX Commodities',
    name: 'MCX Commodities Universe',
    description: 'Crude Oil, Natural Gas, Gold, Silver, Copper, Zinc, Aluminium',
    stockCount: 9,
    icon: '🛢️',
    badge: 'Commodities',
    exchange: 'MCX',
    category: 'MCX',
    sampleConstituents: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER'],
  },
];

export const INSTRUMENT_CATEGORIES = [
  { id: 'ALL', label: 'All Universes' },
  { id: 'INDICES', label: '🏛️ Indices Spots & Futures' },
  { id: 'BSE', label: '🇮🇳 BSE Stocks' },
  { id: 'NIFTY50', label: 'Nifty 50' },
  { id: 'NIFTY100', label: 'Nifty 100' },
  { id: 'NIFTY200', label: 'Nifty 200' },
  { id: 'FNO', label: 'F&O Stocks' },
  { id: 'NIFTY500', label: 'Nifty 500' },
  { id: 'ALL_STOCKS', label: 'All Stocks' },
  { id: 'OPTIONS', label: 'Nifty Options' },
  { id: 'MCX', label: 'MCX Commodities' },
];

/**
 * Filter universes by search query and category
 */
export function filterUniverses(universes, search = '', category = 'ALL') {
  return universes.filter(item => {
    if (category === 'INDICES' && item.category !== 'INDICES' && !item.symbol.includes('Indices')) return false;
    if (category === 'BSE' && item.category !== 'BSE' && !item.symbol.includes('BSE')) return false;
    if (category === 'NIFTY50' && item.id !== 'NIFTY_50') return false;
    if (category === 'NIFTY100' && item.id !== 'NIFTY_100') return false;
    if (category === 'NIFTY200' && item.id !== 'NIFTY_200') return false;
    if (category === 'FNO' && item.id !== 'FNO_STOCKS') return false;
    if (category === 'NIFTY500' && item.id !== 'NIFTY_500') return false;
    if (category === 'ALL_STOCKS' && item.id !== 'ALL_STOCKS') return false;
    if (category === 'OPTIONS' && item.id !== 'NIFTY_OPTIONS') return false;
    if (category === 'MCX' && item.id !== 'MCX_COMMODITIES') return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchSymbol = item.symbol.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchSymbol || matchName || matchDesc;
    }

    return true;
  });
}
