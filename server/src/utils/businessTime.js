// Business timezone for the Money & Mind scheduling calendar.
// Africa/Lagos (UTC+1, no DST). Every layer that books or displays an episode
// date uses this single timezone so no system-local timezone (the server host
// runs UTC; each admin browser may run its own) can shift a Mon-Fri episode to
// the previous/next calendar day via UTC conversion.
//
// Backend stores publishDate as a UTC-midnight instant (a date-only string
// parses to UTC midnight). Shown in Lagos (UTC+1) that instant is the same
// calendar date, so consistently formatting via the +1 offset is exact.

export const BUSINESS_UTC_OFFSET_MIN = 60; // Africa/Lagos = UTC+1 (no DST)
const OFFSET_MS = BUSINESS_UTC_OFFSET_MIN * 60000;

// Shift an absolute Date so its UTC fields represent the business calendar date.
export function toBusinessDate(date) {
  return new Date(date.getTime() + OFFSET_MS);
}

// Format as the business-calendar "YYYY-MM-DD" (Lagos civil date).
export function businessDateStr(date) {
  const shifted = toBusinessDate(date);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Business-calendar weekday (0=Sun..6=Sat) of an instant.
export function businessDayOfWeek(date) {
  return toBusinessDate(date).getUTCDay();
}

// The UTC instant that is Lagos midnight for the given UTC civil date
// (y, m 0-based, d). Lagos date (y,m+1,d) starts at UTC (y,m,d) 00:00 minus offset.
export function businessMidnightToUtc(date) {
  // date here is a Date whose UTC fields are the civil date
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - OFFSET_MS);
}

// The Lagos-midnight instant of "today" in the business timezone.
export function businessToday() {
  return businessMidnightToUtc(toBusinessDate(new Date()));
}
