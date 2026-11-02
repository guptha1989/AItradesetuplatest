/**
 * Backend Date & Time Formatter Utility for Indian Standard Time (IST)
 * Enforces standardized 'DD MMM YYYY, HH:MM:SS AM/PM' across all Dhan API feeds and routes.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIstDateObj(d = new Date()) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return new Date();
  const utcMs = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  return new Date(utcMs + (330 * 60000));
}

function getTodayDateStr() {
  const ist = getIstDateObj();
  const day = String(ist.getDate()).padStart(2, '0');
  const month = MONTHS[ist.getMonth()];
  const year = ist.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatIstDateTime(d = new Date()) {
  const ist = getIstDateObj(d);
  const day = String(ist.getDate()).padStart(2, '0');
  const month = MONTHS[ist.getMonth()];
  const year = ist.getFullYear();

  let hours = ist.getHours();
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const seconds = String(ist.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${hourStr}:${minutes}:${seconds} ${ampm}`;
}

function formatIstDateTimeMinute(d = new Date()) {
  const ist = getIstDateObj(d);
  const day = String(ist.getDate()).padStart(2, '0');
  const month = MONTHS[ist.getMonth()];
  const year = ist.getFullYear();

  let hours = ist.getHours();
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${hourStr}:${minutes} ${ampm}`;
}

function ensureDateInTimestamp(timeStr) {
  if (!timeStr) return formatIstDateTime();
  const str = String(timeStr).trim();

  // If already contains a 4-digit year, return as is
  if (/\b20\d\d\b/.test(str)) {
    return str;
  }

  // Prepend today's IST date
  return `${getTodayDateStr()}, ${str}`;
}

module.exports = {
  getIstDateObj,
  getTodayDateStr,
  formatIstDateTime,
  formatIstDateTimeMinute,
  ensureDateInTimestamp,
};
