/**
 * Universe Stock Constituents Master
 * Provides constituent stocks with realistic base prices, lot sizes, and names
 * for all 7 stock universes.
 */

const UNIVERSE_STOCKS = {
  'NIFTY_50': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'ITC', name: 'ITC Ltd.', basePrice: 480, lotSize: 1600 },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', basePrice: 3640, lotSize: 150 },
    { symbol: 'SBIN', name: 'State Bank of India', basePrice: 820, lotSize: 750 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', basePrice: 1620, lotSize: 475 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', basePrice: 980, lotSize: 700 },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', basePrice: 1760, lotSize: 400 },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', basePrice: 1190, lotSize: 625 },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', basePrice: 2450, lotSize: 300 },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', basePrice: 7100, lotSize: 125 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', basePrice: 12300, lotSize: 50 },
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ltd.', basePrice: 1840, lotSize: 350 },
    { symbol: 'TITAN', name: 'Titan Company Ltd.', basePrice: 3450, lotSize: 175 },
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', basePrice: 160, lotSize: 5500 },
    { symbol: 'NTPC', name: 'NTPC Ltd.', basePrice: 410, lotSize: 1500 },
    { symbol: 'POWERGRID', name: 'Power Grid Corp.', basePrice: 330, lotSize: 1800 },
    { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', basePrice: 2850, lotSize: 200 },
    { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', basePrice: 3050, lotSize: 300 },
    { symbol: 'COALINDIA', name: 'Coal India Ltd.', basePrice: 490, lotSize: 1200 },
    { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', basePrice: 940, lotSize: 675 },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd.', basePrice: 290, lotSize: 2600 },
    { symbol: 'TRENT', name: 'Trent Ltd.', basePrice: 7400, lotSize: 100 },
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', basePrice: 11200, lotSize: 50 },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corp.', basePrice: 290, lotSize: 2250 },
    { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd.', basePrice: 1720, lotSize: 500 },
    { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', basePrice: 2650, lotSize: 250 },
  ],
  'NIFTY_100': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', basePrice: 980, lotSize: 700 },
    { symbol: 'TRENT', name: 'Trent Ltd.', basePrice: 7400, lotSize: 100 },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd.', basePrice: 290, lotSize: 2600 },
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', basePrice: 4650, lotSize: 150 },
    { symbol: 'VBL', name: 'Varun Beverages Ltd.', basePrice: 1480, lotSize: 450 },
    { symbol: 'ZOMATO', name: 'Zomato Ltd.', basePrice: 260, lotSize: 3000 },
    { symbol: 'DLF', name: 'DLF Ltd.', basePrice: 840, lotSize: 825 },
    { symbol: 'SIEMENS', name: 'Siemens Ltd.', basePrice: 7100, lotSize: 75 },
    { symbol: 'PFC', name: 'Power Finance Corp.', basePrice: 480, lotSize: 1300 },
    { symbol: 'RECLTD', name: 'REC Ltd.', basePrice: 530, lotSize: 1400 },
    { symbol: 'CHOLAFIN', name: 'Cholamandalam Inv.', basePrice: 1450, lotSize: 500 },
    { symbol: 'VEDL', name: 'Vedanta Ltd.', basePrice: 460, lotSize: 1500 },
    { symbol: 'TVSMOTOR', name: 'TVS Motor Co.', basePrice: 2450, lotSize: 350 },
    { symbol: 'BANKBARODA', name: 'Bank of Baroda', basePrice: 250, lotSize: 2925 },
    { symbol: 'HAVELLS', name: 'Havells India Ltd.', basePrice: 1820, lotSize: 500 },
  ],
  'NIFTY_200': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'DIXON', name: 'Dixon Technologies Ltd.', basePrice: 12800, lotSize: 50 },
    { symbol: 'BSE', name: 'BSE Ltd.', basePrice: 4450, lotSize: 150 },
    { symbol: 'MCX', name: 'Multi Commodity Exchange', basePrice: 6100, lotSize: 100 },
    { symbol: 'COFORGE', name: 'Coforge Ltd.', basePrice: 7600, lotSize: 75 },
    { symbol: 'VOLTAS', name: 'Voltas Ltd.', basePrice: 1740, lotSize: 300 },
    { symbol: 'FEDERALBNK', name: 'Federal Bank Ltd.', basePrice: 195, lotSize: 3000 },
    { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank', basePrice: 72, lotSize: 7500 },
    { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd.', basePrice: 220, lotSize: 3000 },
    { symbol: 'MPHASIS', name: 'Mphasis Ltd.', basePrice: 2850, lotSize: 275 },
    { symbol: 'JUBLFOOD', name: 'Jubilant FoodWorks', basePrice: 610, lotSize: 1250 },
    { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd.', basePrice: 1950, lotSize: 300 },
    { symbol: 'ASTRAL', name: 'Astral Ltd.', basePrice: 1850, lotSize: 275 },
    { symbol: 'CONCOR', name: 'Container Corp. of India', basePrice: 910, lotSize: 625 },
  ],
  'FNO_STOCKS': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', basePrice: 980, lotSize: 700 },
    { symbol: 'SBIN', name: 'State Bank of India', basePrice: 820, lotSize: 750 },
    { symbol: 'TRENT', name: 'Trent Ltd.', basePrice: 7400, lotSize: 100 },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd.', basePrice: 290, lotSize: 2600 },
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', basePrice: 4650, lotSize: 150 },
    { symbol: 'DIXON', name: 'Dixon Technologies Ltd.', basePrice: 12800, lotSize: 50 },
    { symbol: 'MCX', name: 'Multi Commodity Exchange', basePrice: 6100, lotSize: 100 },
    { symbol: 'COFORGE', name: 'Coforge Ltd.', basePrice: 7600, lotSize: 75 },
    { symbol: 'BSE', name: 'BSE Ltd.', basePrice: 4450, lotSize: 150 },
    { symbol: 'ZOMATO', name: 'Zomato Ltd.', basePrice: 260, lotSize: 3000 },
    { symbol: 'VEDL', name: 'Vedanta Ltd.', basePrice: 460, lotSize: 1500 },
    { symbol: 'TATAPOWER', name: 'Tata Power Co. Ltd.', basePrice: 420, lotSize: 1350 },
    { symbol: 'IRCTC', name: 'Indian Railway Catering', basePrice: 880, lotSize: 875 },
    { symbol: 'CANBK', name: 'Canara Bank', basePrice: 105, lotSize: 6750 },
    { symbol: 'PNB', name: 'Punjab National Bank', basePrice: 110, lotSize: 8000 },
  ],
  'ALL_STOCKS': [
    { symbol: 'NIFTY', name: 'Nifty 50 Index Spot', basePrice: 23053.10, lotSize: 25 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty Index Spot', basePrice: 51820.40, lotSize: 15 },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', basePrice: 980, lotSize: 700 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', basePrice: 75, lotSize: 1000 },
    { symbol: 'BCG', name: 'Brightcom Group Ltd.', basePrice: 12, lotSize: 2000 },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', basePrice: 65, lotSize: 1000 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'TRENT', name: 'Trent Ltd.', basePrice: 7400, lotSize: 100 },
    { symbol: 'TATAPOWER', name: 'Tata Power Co. Ltd.', basePrice: 420, lotSize: 500 },
    { symbol: 'IRFC', name: 'Indian Railway Finance', basePrice: 150, lotSize: 1000 },
    { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', basePrice: 440, lotSize: 500 },
    { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders', basePrice: 4200, lotSize: 100 },
    { symbol: 'BHEL', name: 'Bharat Heavy Electricals', basePrice: 240, lotSize: 1000 },
    { symbol: 'IREDA', name: 'Indian Renewable Energy', basePrice: 210, lotSize: 1000 },
    { symbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd.', basePrice: 1650, lotSize: 200 },
    { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers India', basePrice: 690, lotSize: 500 },
    { symbol: 'FACT', name: 'Fertilizers & Chemicals', basePrice: 850, lotSize: 500 },
    { symbol: 'NHPC', name: 'NHPC Ltd.', basePrice: 88, lotSize: 2000 },
    { symbol: 'HUDCO', name: 'Housing & Urban Dev.', basePrice: 230, lotSize: 1000 },
    { symbol: 'ZOMATO', name: 'Zomato Ltd.', basePrice: 260, lotSize: 1000 },
  ],
  'BSE_ALL': [
    { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', basePrice: 75, lotSize: 1000 },
    { symbol: 'BCG', name: 'Brightcom Group Ltd.', basePrice: 12, lotSize: 2000 },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', basePrice: 65, lotSize: 1000 },
    { symbol: 'RPOWER', name: 'Reliance Power Ltd.', basePrice: 42, lotSize: 1500 },
    { symbol: 'YESBANK', name: 'Yes Bank Ltd.', basePrice: 20, lotSize: 2000 },
    { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', basePrice: 8, lotSize: 5000 },
    { symbol: 'JPPOWER', name: 'Jaiprakash Power Ventures', basePrice: 18, lotSize: 3000 },
    { symbol: 'INFIBEAM', name: 'Infibeam Avenues Ltd.', basePrice: 28, lotSize: 2000 },
    { symbol: 'SOUTHBANK', name: 'South Indian Bank Ltd.', basePrice: 24, lotSize: 2500 },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'SBIN', name: 'State Bank of India', basePrice: 820, lotSize: 750 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', basePrice: 980, lotSize: 700 },
    { symbol: 'ITC', name: 'ITC Ltd.', basePrice: 480, lotSize: 1600 },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', basePrice: 3640, lotSize: 150 },
  ],
  'BSE_SENSEX': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', basePrice: 2980, lotSize: 250 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', basePrice: 4120, lotSize: 175 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', basePrice: 1680, lotSize: 550 },
    { symbol: 'INFY', name: 'Infosys Ltd.', basePrice: 1820, lotSize: 400 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', basePrice: 1240, lotSize: 700 },
    { symbol: 'SBIN', name: 'State Bank of India', basePrice: 820, lotSize: 750 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', basePrice: 1620, lotSize: 475 },
    { symbol: 'ITC', name: 'ITC Ltd.', basePrice: 480, lotSize: 1600 },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', basePrice: 3640, lotSize: 150 },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', basePrice: 1760, lotSize: 400 },
  ],
  'BSE_PENNY_SMALLCAP': [
    { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', basePrice: 75, lotSize: 1000 },
    { symbol: 'BCG', name: 'Brightcom Group Ltd.', basePrice: 12, lotSize: 2000 },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', basePrice: 65, lotSize: 1000 },
    { symbol: 'RPOWER', name: 'Reliance Power Ltd.', basePrice: 42, lotSize: 1500 },
    { symbol: 'YESBANK', name: 'Yes Bank Ltd.', basePrice: 20, lotSize: 2000 },
    { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', basePrice: 8, lotSize: 5000 },
    { symbol: 'JPPOWER', name: 'Jaiprakash Power Ventures', basePrice: 18, lotSize: 3000 },
    { symbol: 'INFIBEAM', name: 'Infibeam Avenues Ltd.', basePrice: 28, lotSize: 2000 },
    { symbol: 'SOUTHBANK', name: 'South Indian Bank Ltd.', basePrice: 24, lotSize: 2500 },
  ],
  'INDICES_ALL': [
    { symbol: 'NIFTY', name: 'Nifty 50 Index Spot', basePrice: 23053.10, lotSize: 25 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty Index Spot', basePrice: 51820.40, lotSize: 15 },
    { symbol: 'FINNIFTY', name: 'Fin Nifty Index Spot', basePrice: 23612.30, lotSize: 25 },
    { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select Spot', basePrice: 12800, lotSize: 50 },
    { symbol: 'SENSEX', name: 'BSE Sensex Index Spot', basePrice: 79800, lotSize: 10 },
    { symbol: 'NIFTY-FUT', name: 'Nifty 50 Futures', basePrice: 23115.00, lotSize: 25 },
    { symbol: 'BANKNIFTY-FUT', name: 'Bank Nifty Futures', basePrice: 51950, lotSize: 15 },
    { symbol: 'FINNIFTY-FUT', name: 'Fin Nifty Futures', basePrice: 23680, lotSize: 25 },
    { symbol: 'MIDCPNIFTY-FUT', name: 'Nifty Midcap Futures', basePrice: 12850, lotSize: 50 },
    { symbol: 'SENSEX-FUT', name: 'BSE Sensex Futures', basePrice: 80050, lotSize: 10 },
  ],
  'INDICES_SPOTS': [
    { symbol: 'NIFTY', name: 'Nifty 50 Index Spot', basePrice: 23053.10, lotSize: 25 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty Index Spot', basePrice: 51820.40, lotSize: 15 },
    { symbol: 'FINNIFTY', name: 'Fin Nifty Index Spot', basePrice: 23612.30, lotSize: 25 },
    { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select Spot', basePrice: 12800, lotSize: 50 },
    { symbol: 'SENSEX', name: 'BSE Sensex Index Spot', basePrice: 79800, lotSize: 10 },
  ],
  'INDICES_FUTURES': [
    { symbol: 'NIFTY-FUT', name: 'Nifty 50 Futures', basePrice: 24280, lotSize: 25 },
    { symbol: 'BANKNIFTY-FUT', name: 'Bank Nifty Futures', basePrice: 51950, lotSize: 15 },
    { symbol: 'FINNIFTY-FUT', name: 'Fin Nifty Futures', basePrice: 23680, lotSize: 25 },
    { symbol: 'MIDCPNIFTY-FUT', name: 'Nifty Midcap Futures', basePrice: 12850, lotSize: 50 },
    { symbol: 'SENSEX-FUT', name: 'BSE Sensex Futures', basePrice: 80050, lotSize: 10 },
  ],
  'TTML': [
    { symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', basePrice: 75, lotSize: 1000 },
  ],
  'BCG': [
    { symbol: 'BCG', name: 'Brightcom Group Ltd.', basePrice: 12, lotSize: 2000 },
  ],
  'NIFTY_OPTIONS': [
    { symbol: 'NIFTY 24200 CE', name: 'Nifty 24200 Call Option', basePrice: 210, lotSize: 25 },
    { symbol: 'NIFTY 24200 PE', name: 'Nifty 24200 Put Option', basePrice: 185, lotSize: 25 },
    { symbol: 'BANKNIFTY 52000 CE', name: 'BankNifty 52000 Call Option', basePrice: 380, lotSize: 15 },
    { symbol: 'BANKNIFTY 52000 PE', name: 'BankNifty 52000 Put Option', basePrice: 340, lotSize: 15 },
    { symbol: 'FINNIFTY 23500 CE', name: 'FinNifty 23500 Call Option', basePrice: 160, lotSize: 25 },
    { symbol: 'FINNIFTY 23500 PE', name: 'FinNifty 23500 Put Option', basePrice: 145, lotSize: 25 },
  ],
  'MCX_COMMODITIES': [
    { symbol: 'CRUDEOIL', name: 'MCX Crude Oil Future', basePrice: 6250, lotSize: 100 },
    { symbol: 'NATURALGAS', name: 'MCX Natural Gas Future', basePrice: 245, lotSize: 1250 },
    { symbol: 'GOLD', name: 'MCX Gold 1kg Future', basePrice: 78500, lotSize: 1 },
    { symbol: 'SILVER', name: 'MCX Silver 30kg Future', basePrice: 94000, lotSize: 30 },
    { symbol: 'COPPER', name: 'MCX Copper Future', basePrice: 840, lotSize: 2500 },
  ],
};

function getSingleUniverseConstituents(universeName = 'All Stocks') {
  const norm = String(universeName).toUpperCase().replace(/[^A-Z0-9]/g, '_');

  // Direct specific stock matches (TTML, BCG, Suzlon, etc.)
  if (norm.includes('TTML') || norm === '532371') {
    return [{ symbol: 'TTML', name: 'Tata Teleservices (Maharashtra) Ltd.', basePrice: 75, lotSize: 1000 }];
  }
  if (norm.includes('BCG') || norm === '532368') {
    return [{ symbol: 'BCG', name: 'Brightcom Group Ltd.', basePrice: 12, lotSize: 2000 }];
  }

  // Indices Spots and Futures
  if (norm.includes('INDICES_SPOT') || norm.includes('INDEX_SPOT') || norm === 'INDICES_SPOTS') {
    return UNIVERSE_STOCKS['INDICES_SPOTS'];
  }
  if (norm.includes('INDICES_FUT') || norm.includes('INDEX_FUT') || norm === 'INDICES_FUTURES') {
    return UNIVERSE_STOCKS['INDICES_FUTURES'];
  }
  if (norm.includes('INDICE') || norm.includes('SPOT') && norm.includes('FUT')) {
    return UNIVERSE_STOCKS['INDICES_ALL'];
  }

  // BSE Universes
  if (norm.includes('PENNY') || norm.includes('SMALLCAP')) return UNIVERSE_STOCKS['BSE_PENNY_SMALLCAP'];
  if (norm.includes('SENSEX')) return UNIVERSE_STOCKS['BSE_SENSEX'];
  if (norm.includes('BSE')) return UNIVERSE_STOCKS['BSE_ALL'];

  // NSE Universes
  if (norm.includes('50') && !norm.includes('500')) return UNIVERSE_STOCKS['NIFTY_50'];
  if (norm.includes('100')) return UNIVERSE_STOCKS['NIFTY_100'];
  if (norm.includes('200')) return UNIVERSE_STOCKS['NIFTY_200'];
  if (norm.includes('500')) return UNIVERSE_STOCKS['ALL_STOCKS'];
  if (norm.includes('FNO') || norm.includes('DERIVATIVE')) return UNIVERSE_STOCKS['FNO_STOCKS'];
  if (norm.includes('OPTION')) return UNIVERSE_STOCKS['NIFTY_OPTIONS'];
  if (norm.includes('MCX') || norm.includes('COMMODIT')) return UNIVERSE_STOCKS['MCX_COMMODITIES'];
  if (norm.includes('ALL')) return UNIVERSE_STOCKS['ALL_STOCKS'];

  // Match by symbol name if exact ticker passed
  for (const list of Object.values(UNIVERSE_STOCKS)) {
    const match = list.find(s => s.symbol.toUpperCase() === norm);
    if (match) return [match];
  }

  // Fallback: If user specified a custom stock symbol, evaluate that single stock directly
  const cleanName = norm.replace(/_NS|_BO/g, '');
  return [{ symbol: cleanName, name: `${cleanName} Equity`, basePrice: 100, lotSize: 500 }];
}

function getConstituentStocks(universeInput = 'All Stocks') {
  if (Array.isArray(universeInput)) {
    const map = new Map();
    for (const u of universeInput) {
      const items = getSingleUniverseConstituents(u);
      for (const it of items) map.set(it.symbol, it);
    }
    return Array.from(map.values());
  }

  if (typeof universeInput === 'string' && universeInput.includes(',')) {
    const parts = universeInput.split(',').map(s => s.trim()).filter(Boolean);
    return getConstituentStocks(parts);
  }

  return getSingleUniverseConstituents(universeInput);
}

module.exports = {
  UNIVERSE_STOCKS,
  getConstituentStocks,
};

