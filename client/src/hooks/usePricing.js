

import { useEffect, useState } from "react";
import api from "../services/api";

export function usePricing() {
  const [pricing, setPricing] = useState({ weeklyPrice: "100", monthlyPrice: "350" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/settings/pricing")
      .then(({ data }) => {
        setPricing({
          weeklyPrice: data.weeklyPrice || "100",
          monthlyPrice: data.monthlyPrice || "350",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { pricing, loading };
}
