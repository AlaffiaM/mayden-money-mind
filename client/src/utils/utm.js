// UTM tracking — captures utm_* params from the landing URL and persists them
// in sessionStorage so they survive the in-app navigation to the register page.
// getUtm() returns the captured params for attaching to the signup request.
const STORAGE_KEY = "utmParams";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const captured = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) captured[key] = value.slice(0, 100);
    }
    if (Object.keys(captured).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    }
  } catch {
    // sessionStorage unavailable — UTM capture is best-effort
  }
}

export function getUtm() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
