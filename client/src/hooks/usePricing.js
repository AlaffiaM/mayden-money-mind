import { useEffect, useState } from "react";
import api from "../services/api";

const DEFAULT_DAY_LABELS = {
  monday: "Motivation Mondays",
  tuesday: "Tactical Tuesdays",
  wednesday: "Wellness Wednesdays",
  thursday: "Testimonial Thursdays",
  friday: "Financial Fridays",
};

export function usePricing() {
  const [pricing, setPricing] = useState({ weeklyPrice: "100", monthlyPrice: "350" });
  const [dayLabels, setDayLabels] = useState(DEFAULT_DAY_LABELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/settings/pricing")
      .then(({ data }) => {
        setPricing({
          weeklyPrice: data.weeklyPrice || "100",
          monthlyPrice: data.monthlyPrice || "350",
        });
        setDayLabels({ ...DEFAULT_DAY_LABELS, ...data.dayLabels });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { pricing, dayLabels, loading };
}
