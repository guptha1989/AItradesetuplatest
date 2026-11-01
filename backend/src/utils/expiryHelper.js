/**
 * Expiry Helper for Indian Financial Markets (NSE, BSE, MCX)
 * Manages Thursday Weekly Expiries and Monthly Expiries:
 * - Current Week: Upcoming Thursday (e.g. 05 Nov 2026)
 * - Next Week: Following Thursday (e.g. 12 Nov 2026)
 * - Current Month: Last Thursday of Current Month (e.g. 26 Nov 2026)
 * - Next Month: Last Thursday of Next Month (e.g. 31 Dec 2026)
 * 
 * Auto-rollover occurs every Thursday at 15:30 IST (market close).
 */

function getThursdayExpiries(refDate = new Date()) {
  const d = new Date(refDate);
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  const ist = new Date(utcMs + (330 * 60000));
  
  const day = ist.getDay(); // 0: Sun, 1: Mon, ..., 4: Thu, 5: Fri, 6: Sat
  const hh = ist.getHours();
  const mm = ist.getMinutes();
  
  // Days to upcoming Thursday (day 4)
  let daysToThu = (4 - day + 7) % 7;
  // If today is Thursday after 15:30 IST market close, advance to next week
  if (daysToThu === 0 && (hh > 15 || (hh === 15 && mm >= 30))) {
    daysToThu = 7;
  }
  
  const currThu = new Date(ist);
  currThu.setDate(currThu.getDate() + daysToThu);
  
  const nextThu = new Date(currThu);
  nextThu.setDate(nextThu.getDate() + 7);
  
  function getLastThursday(year, monthIndex) {
    // Start from last day of month and walk backwards to Thursday (day 4)
    const lastDay = new Date(year, monthIndex + 1, 0);
    const lastDayDow = lastDay.getDay();
    const diff = (lastDayDow - 4 + 7) % 7;
    lastDay.setDate(lastDay.getDate() - diff);
    return lastDay;
  }
  
  let currMonthThu = getLastThursday(ist.getFullYear(), ist.getMonth());
  // If current month's last Thursday has already passed (after 15:30 IST), roll to next month
  if (currMonthThu < currThu) {
    currMonthThu = getLastThursday(ist.getFullYear(), ist.getMonth() + 1);
  }
  
  const nextMonthThu = getLastThursday(currMonthThu.getFullYear(), currMonthThu.getMonth() + 1);
  
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
  
  const cW = fmt(currThu);
  const nW = fmt(nextThu);
  const cM = fmt(currMonthThu);
  const nM = fmt(nextMonthThu);
  
  return [
    { id: cW.iso, date: cW.iso, formatted: cW.formatted, label: `${cW.labelDate} (Current Week)`, type: 'CURRENT_WEEK' },
    { id: nW.iso, date: nW.iso, formatted: nW.formatted, label: `${nW.labelDate} (Next Week)`, type: 'NEXT_WEEK' },
    { id: cM.iso, date: cM.iso, formatted: cM.formatted, label: `${cM.labelDate} (Current Month)`, type: 'CURRENT_MONTH' },
    { id: nM.iso, date: nM.iso, formatted: nM.formatted, label: `${nM.labelDate} (Next Month)`, type: 'NEXT_MONTH' },
  ];
}

function getNextThursdayExpiry(refDate = new Date()) {
  const expiries = getThursdayExpiries(refDate);
  return expiries[0].id; // 'YYYY-MM-DD'
}

module.exports = {
  getThursdayExpiries,
  getNextThursdayExpiry,
};

