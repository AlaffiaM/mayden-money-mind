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

  // Refetch subscription
  const refetch = async () => {
    try {
      const { data } = await api.get("/subscriptions/mine");
      setSubscription(data);
      return data;
    } catch (err) {
      setSubscription(null);
      throw err;
    }
  };

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

  // Toggle automatic card renewal on/off
  const setAutoRenew = async (id, autoRenew) => {
    const { data } = await api.patch(`/subscriptions/${id}/auto-renew`, { autoRenew });
    setSubscription(data);
    return data;
  };

  return { subscription, loading, subscribe, update, setAutoRenew, refetch };
}
