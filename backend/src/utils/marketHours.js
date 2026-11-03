/**
 * Market Hours Utility for Indian Exchanges (MCX, NSE, BSE)
 *
 * Rules:
 * - MCX: 9:00 AM IST to 11:30 PM IST (09:00 to 23:30 IST)
 * - NSE & BSE: 9:15 AM IST to 3:40 PM IST (09:15 to 15:40 IST)
 */

const MCX_SYMBOLS = new Set([
  'CRUDEOIL', 'GOLD', 'SILVER', 'NATURALGAS', 'COPPER',
  'ALUMINIUM', 'ZINC', 'LEAD', 'NICKEL'
]);

const BSE_SYMBOLS = new Set([
  'SENSEX', 'BANKEX', 'TTML', 'BCG', 'SUZLON'
]);

function getExchangeForSymbol(symbol = '') {
  if (!symbol) return 'NSE';
  const sym = String(symbol).toUpperCase().trim();
  if (MCX_SYMBOLS.has(sym)) return 'MCX';
  if (BSE_SYMBOLS.has(sym)) return 'BSE';
  return 'NSE';
}

function getMarketHours(symbolOrExchange = 'NSE') {
  const str = String(symbolOrExchange || 'NSE').toUpperCase().trim();
  const isMcx = str === 'MCX' || MCX_SYMBOLS.has(str);

  if (isMcx) {
    return {
      exchange: 'MCX',
      openHour: 9,
      openMin: 0,
      openMins: 9 * 60, // 540 (09:00 AM)
      closeHour: 23,
      closeMin: 30,
      closeMins: 23 * 60 + 30, // 1410 (11:30 PM)
      totalTradingMins: (23 * 60 + 30) - (9 * 60), // 870 minutes
      openLabel: '9:00 AM',
      closeLabel: '11:30 PM',
      openTimeStr: '09:00:00',
      closeTimeStr: '23:30:00',
    };
  }

  const isBse = str === 'BSE' || BSE_SYMBOLS.has(str);
  return {
    exchange: isBse ? 'BSE' : 'NSE',
    openHour: 9,
    openMin: 15,
    openMins: 9 * 60 + 15, // 555 (09:15 AM)
    closeHour: 15,
    closeMin: 40,
    closeMins: 15 * 60 + 40, // 940 (03:40 PM)
    totalTradingMins: (15 * 60 + 40) - (9 * 60 + 15), // 385 minutes
    openLabel: '9:15 AM',
    closeLabel: '3:40 PM',
    openTimeStr: '09:15:00',
    closeTimeStr: '15:40:00',
  };
}

function getIstDate(d = new Date()) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return new Date();
  const utcMs = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  return new Date(utcMs + (330 * 60000));
}

function isMarketOpen(symbolOrExchange = 'NSE', d = new Date()) {
  const ist = getIstDate(d);
  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  const currentMins = ist.getHours() * 60 + ist.getMinutes();
  const hours = getMarketHours(symbolOrExchange);
  return currentMins >= hours.openMins && currentMins <= hours.closeMins;
}

function getElapsedMinsToday(symbolOrExchange = 'NSE', d = new Date(), stepMins = 1) {
  const ist = getIstDate(d);
  const hours = getMarketHours(symbolOrExchange);
  const currentMins = ist.getHours() * 60 + ist.getMinutes();

  if (currentMins <= hours.openMins) {
    return Math.max(1, stepMins);
  }
  if (currentMins >= hours.closeMins) {
    return hours.totalTradingMins;
  }
  return Math.min(hours.totalTradingMins, Math.max(stepMins, currentMins - hours.openMins));
}

function getIntradaySlots(symbolOrExchange = 'NSE', intervalMins = 5) {
  const hours = getMarketHours(symbolOrExchange);
  const slots = [];
  for (let m = hours.openMins; m <= hours.closeMins; m += intervalMins) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  }
  return slots;
}

module.exports = {
  MCX_SYMBOLS,
  BSE_SYMBOLS,
  getExchangeForSymbol,
  getMarketHours,
  getIstDate,
  isMarketOpen,
  getElapsedMinsToday,
  getIntradaySlots,
};

