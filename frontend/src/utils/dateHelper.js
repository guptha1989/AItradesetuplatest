/**
 * Unified Date & Time Formatter for Indian Financial Markets (IST)
 * Enforces inclusion of both date and time across all charts, tables, badges & tooltips
 * Example: '02 Nov 2026, 11:08 AM' or '02 Nov 2026, 12:16:39 PM'
 */

export function getTodayDateStr() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d = new Date()) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  } catch (_) {
    return String(d);
  }
}

export function formatDateTimeMinute(d = new Date()) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  } catch (_) {
    return String(d);
  }
}

export function ensureDateInTimestamp(timeStr, defaultDate = null) {
  if (!timeStr) return formatDateTime();
  const datePrefix = defaultDate || getTodayDateStr();
  // Check if string already contains a year/month
  if (/\b(202\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(timeStr)) {
    return timeStr;
  }
  return `${datePrefix}, ${timeStr}`;
}
