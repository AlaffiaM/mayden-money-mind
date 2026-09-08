



export const BUSINESS_UTC_OFFSET_MIN = 60; 
const OFFSET_MS = BUSINESS_UTC_OFFSET_MIN * 60000;


export function toBusinessDate(date) {
  return new Date(date.getTime() + OFFSET_MS);
}


export function businessDateStr(date) {
  const shifted = toBusinessDate(date);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


export function businessDayOfWeek(date) {
  return toBusinessDate(date).getUTCDay();
}


export function businessToday() {
  const shifted = toBusinessDate(new Date());
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - OFFSET_MS);
}