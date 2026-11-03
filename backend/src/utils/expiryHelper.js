/**
 * Expiry Helper for Indian Financial Markets (NSE, BSE, MCX)
 * Incorporates SEBI Revised Index Expiry Schedule:
 * - Nifty 50 (NSE): Expires every Tuesday of the week.
 * - Sensex (BSE): Expires every Thursday of the week.
 * - Bank Nifty, FinNifty, Midcap Nifty, Nifty Next 50 (NSE): Monthly contracts only (last Tuesday of the month).
 * - Bankex, Sensex 50 (BSE): Monthly contracts only (last Thursday of the month).
 * - NSE / BSE Equities: Monthly contracts only (last Thursday of the month).
 * - Holiday Rule: If an expiry day falls on a market or trading holiday,
 *   the expiry shifts to the previous valid trading day.
 * - Auto-rollover occurs on expiry day at 15:40 IST (after market close).
 */

const { shiftToPreviousTradingDay, isTradingHoliday } = require('../config/tradingHolidays');

function toDateString(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmt(dt) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labelDate = `${dd} ${months[dt.getMonth()]} ${yyyy}`;
  const formatted = `${dd}-${months[dt.getMonth()]}-${yyyy}`;
  return {
    iso: `${yyyy}-${mm}-${dd}`,
    formatted,
    labelDate,
  };
}

function getLastDayOfWeekInMonth(year, monthIndex, targetDow) {
  // Start from last day of month at midday to avoid DST/tz issues
  const lastDay = new Date(year, monthIndex + 1, 0, 12, 0, 0);
  const diff = (lastDay.getDay() - targetDow + 7) % 7;
  lastDay.setDate(lastDay.getDate() - diff);
  return shiftToPreviousTradingDay(lastDay);
}

/**
 * Returns dynamic contract expiries for any instrument according to SEBI regulations & holidays.
 * @param {string} symbol - e.g. 'NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'RELIANCE'
 * @param {Date|string} refDate - Reference date (defaults to current time)
 * @returns {Array<{id: string, date: string, formatted: string, label: string, type: string}>}
 */
function getContractExpiries(symbol = 'NIFTY', refDate = new Date()) {
  const sym = (symbol || 'NIFTY').toUpperCase();
  const d = new Date(refDate);
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  const ist = new Date(utcMs + (330 * 60000));
  
  const day = ist.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const hh = ist.getHours();
  const mm = ist.getMinutes();

  const isNifty = sym === 'NIFTY';
  const isSensex = sym === 'SENSEX';
  const isMonthlyTuesday = ['BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50'].includes(sym);
  const isMonthlyThursday = ['BANKEX', 'SENSEX50'].includes(sym) || (!isNifty && !isSensex && !isMonthlyTuesday);

  // 1. Monthly Contracts Only (Bank Nifty, FinNifty, Midcap Nifty, Bankex, Equities)
  if (isMonthlyTuesday || isMonthlyThursday) {
    const targetDow = isMonthlyTuesday ? 2 : 4; // 2 = Tuesday, 4 = Thursday
    let m0 = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth(), targetDow);
    const todayStr = toDateString(ist);
    const m0Str = toDateString(m0);
    
    // If current month's expiry date has passed (or is today after 15:40 market close)
    let startMonthOffset = 0;
    if (m0Str < todayStr || (m0Str === todayStr && (hh > 15 || (hh === 15 && mm >= 40)))) {
      startMonthOffset = 1;
    }

    const cM = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth() + startMonthOffset, targetDow);
    const nM = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth() + startMonthOffset + 1, targetDow);
    const fM = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth() + startMonthOffset + 2, targetDow);

    const fCM = fmt(cM);
    const fNM = fmt(nM);
    const fFM = fmt(fM);

    return [
      { id: fCM.iso, date: fCM.iso, formatted: fCM.formatted, label: `${fCM.labelDate} (Current Month)`, type: 'CURRENT_MONTH' },
      { id: fNM.iso, date: fNM.iso, formatted: fNM.formatted, label: `${fNM.labelDate} (Next Month)`, type: 'NEXT_MONTH' },
      { id: fFM.iso, date: fFM.iso, formatted: fFM.formatted, label: `${fFM.labelDate} (Far Month)`, type: 'FAR_MONTH' },
    ];
  }

  // 2. Weekly Contracts (Nifty 50 = Tuesday, Sensex = Thursday)
  const targetDow = isNifty ? 2 : 4;
  let daysToTarget = (targetDow - day + 7) % 7;
  // If today is target day and after 15:40 IST market close, advance to next week
  if (daysToTarget === 0 && (hh > 15 || (hh === 15 && mm >= 40))) {
    daysToTarget = 7;
  }

  const curr = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate() + daysToTarget, 12, 0, 0);
  const currTarget = shiftToPreviousTradingDay(curr);

  const next = new Date(curr);
  next.setDate(next.getDate() + 7);
  const nextTarget = shiftToPreviousTradingDay(next);

  let currMonth = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth(), targetDow);
  if (toDateString(currMonth) < toDateString(currTarget)) {
    currMonth = getLastDayOfWeekInMonth(ist.getFullYear(), ist.getMonth() + 1, targetDow);
  }
  const nextMonth = getLastDayOfWeekInMonth(currMonth.getFullYear(), currMonth.getMonth() + 1, targetDow);

  const cW = fmt(currTarget);
  const nW = fmt(nextTarget);
  const cM = fmt(currMonth);
  const nM = fmt(nextMonth);

  return [
    { id: cW.iso, date: cW.iso, formatted: cW.formatted, label: `${cW.labelDate} (Current Week)`, type: 'CURRENT_WEEK' },
    { id: nW.iso, date: nW.iso, formatted: nW.formatted, label: `${nW.labelDate} (Next Week)`, type: 'NEXT_WEEK' },
    { id: cM.iso, date: cM.iso, formatted: cM.formatted, label: `${cM.labelDate} (Current Month)`, type: 'CURRENT_MONTH' },
    { id: nM.iso, date: nM.iso, formatted: nM.formatted, label: `${nM.labelDate} (Next Month)`, type: 'NEXT_MONTH' },
  ];
}

/**
 * Returns the default active expiry date for a symbol ('YYYY-MM-DD').
 */
function getDefaultExpiry(symbol = 'NIFTY', refDate = new Date()) {
  const expiries = getContractExpiries(symbol, refDate);
  return expiries[0].id;
}

/**
 * Legacy compatibility functions
 */
function getThursdayExpiries(refDate = new Date()) {
  return getContractExpiries('SENSEX', refDate);
}

function getNextThursdayExpiry(refDate = new Date()) {
  return getDefaultExpiry('NIFTY', refDate);
}

module.exports = {
  getContractExpiries,
  getDefaultExpiry,
  getThursdayExpiries,
  getNextThursdayExpiry,
  fmt,
};
