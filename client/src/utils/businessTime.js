// Business calendar timezone for Money & Mind: Africa/Lagos (UTC+1, no DST).
// Mirrors server/src/utils/businessTime.js so every layer — backend services,
// the admin schedule (Episodes.jsx) and the subscriber dashboard — computes
// dates/weekdays from one timezone, regardless of the browser/system timezone.
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

// The Lagos-midnight instant of "today" in the business timezone.
export function businessToday() {
  const shifted = toBusinessDate(new Date());
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - OFFSET_MS);
}