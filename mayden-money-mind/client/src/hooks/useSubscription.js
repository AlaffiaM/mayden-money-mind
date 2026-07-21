// Hook: fetches the current user's subscription from the API
// Provides subscribe/update actions that sync state automatically
import { useState, useEffect } from "react";
import api from "../services/api";

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's subscription on mount
  useEffect(() => {
    api
      .get("/subscriptions/mine")
      .then(({ data }) => setSubscription(data))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, []);

  // Create a new subscription (weekly/monthly)
  const subscribe = async (plan) => {
    const { data } = await api.post("/subscriptions", { plan });
    setSubscription(data);
    return data;
  };

  // Update subscription status or plan (pause/cancel)
  const update = async (id, updates) => {
    const { data } = await api.patch(`/subscriptions/${id}`, updates);
    setSubscription(data);
    return data;
  };

  return { subscription, loading, subscribe, update };
}
