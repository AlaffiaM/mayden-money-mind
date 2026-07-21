// Shared utility functions — reference generation, duration formatting, date helpers
import { addDays, addMonths } from "date-fns";

// Generates unique payment references like "MNDM-1689012345678-A3B9K2"
export function generateReference() {
  return `MNDM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Converts seconds to "m:ss" format (e.g. 125 → "2:05")
export function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Returns today's day name in lowercase (e.g. "monday", "friday")
export function getTodayDayLabel() {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

// Calculates next renewal date based on plan type
export function calculateNextRenewal(plan) {
  const now = new Date();
  return plan === "weekly" ? addDays(now, 7) : addMonths(now, 1);
}
