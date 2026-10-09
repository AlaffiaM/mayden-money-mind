import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const DEFAULT_DAY_LABELS = {
  monday: "Motivation Mondays",
  tuesday: "Tactical Tuesdays",
  wednesday: "Wellness Wednesdays",
  thursday: "Testimonial Thursdays",
  friday: "Financial Fridays",
};

const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function usePricing() {
  const [pricing, setPricing] = useState({ weeklyPrice: "100", monthlyPrice: "350" });
  const [dayLabels, setDayLabels] = useState(DEFAULT_DAY_LABELS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPricing = useCallback(async () => {
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const { data } = await api.get("/settings/pricing");
          setPricing({
            weeklyPrice: data.weeklyPrice || "100",
            monthlyPrice: data.monthlyPrice || "350",
          });
          setDayLabels({ ...DEFAULT_DAY_LABELS, ...data.dayLabels });
          setError(false);
          return;
        } catch (requestError) {
          const canRetry =
            (!requestError.response || requestError.response.status >= 500) &&
            attempt < RETRY_DELAYS_MS.length;
          if (!canRetry) {
            setError(true);
            return;
          }
          await wait(RETRY_DELAYS_MS[attempt]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    loadPricing();
  }, [loadPricing]);

  return { pricing, dayLabels, loading, error, reload };
}
