/**
 * Official NSE, BSE & MCX Trading Holidays Master for 2026 - 2027
 * Incorporates SEBI rules: If an expiry day falls on a market or trading holiday,
 * the expiry shifts to the previous valid trading day.
 */

const NSE_BSE_HOLIDAYS_2026 = {
  '2026-01-15': 'Municipal Corporation Election - Maharashtra',
  '2026-01-26': 'Republic Day',
  '2026-03-03': 'Holi',
  '2026-03-26': 'Shri Ram Navami',
  '2026-03-31': 'Shri Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-10': 'Diwali-Balipratipada',
  '2026-11-24': 'Prakash Gurpurb Sri Guru Nanak Dev',
  '2026-12-25': 'Christmas',
  '2027-01-26': 'Republic Day',
};

const MCX_HOLIDAYS_2026 = {
  '2026-01-26': { morning: false, evening: false, name: 'Republic Day' },
  '2026-03-03': { morning: false, evening: true, name: 'Holi (Evening session open 17:00)' },
  '2026-04-03': { morning: false, evening: false, name: 'Good Friday' },
  '2026-04-14': { morning: false, evening: true, name: 'Dr. Ambedkar Jayanti' },
  '2026-05-01': { morning: false, evening: true, name: 'Maharashtra Day' },
  '2026-10-02': { morning: false, evening: false, name: 'Mahatma Gandhi Jayanti' },
  '2026-11-10': { morning: false, evening: true, name: 'Diwali-Balipratipada' },
  '2026-11-24': { morning: false, evening: true, name: 'Guru Nanak Jayanti' },
  '2026-12-25': { morning: false, evening: false, name: 'Christmas' },
  '2027-01-26': { morning: false, evening: false, name: 'Republic Day' },
};

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isTradingHoliday(dateStr, exchange = 'NSE') {
  if (exchange === 'MCX') {
    const hol = MCX_HOLIDAYS_2026[dateStr];
    return hol && !hol.morning && !hol.evening;
  }
  return !!NSE_BSE_HOLIDAYS_2026[dateStr];
}

/**
 * Holiday Rule: If an expiry falls on a holiday or weekend,
 * shifts backward to the previous valid trading day.
 */
function shiftToPreviousTradingDay(dateObj, exchange = 'NSE') {
  const cur = new Date(dateObj);
  while (true) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (isWeekend(cur) || isTradingHoliday(dateStr, exchange)) {
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return cur;
}

function getHolidayList() {
  return Object.entries(NSE_BSE_HOLIDAYS_2026).map(([date, description]) => {
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      date,
      day: dayNames[dateObj.getDay()],
      description,
      isWeekend: isWeekend(dateObj),
      mcxOpenEvening: MCX_HOLIDAYS_2026[date]?.evening || false,
    };
  });
}

module.exports = {
  NSE_BSE_HOLIDAYS_2026,
  MCX_HOLIDAYS_2026,
  isTradingHoliday,
  shiftToPreviousTradingDay,
  getHolidayList,
};
