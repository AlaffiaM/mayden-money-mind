// Subscription management page — plan selection, status banners, payment flow
// Handles Paystack redirect → callback polling → auto-redirect to /dashboard on success
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { usePricing } from "../hooks/usePricing";
import Button from "../components/ui/Button";
import api from "../services/api";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import SubscriberLayout from "../components/layout/SubscriberLayout";

export default function Subscription() {
  const navigate = useNavigate();
  const { subscription, loading, subscribe, update } = useSubscription();
  const { pricing } = usePricing();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlReference = searchParams.get("reference");
  const [polling, setPolling] = useState(false);

  const pollForActivation = useCallback(async () => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 15;

    const check = async () => {
      try {
        const { data } = await api.get("/subscriptions/mine/status");
        if (data.status === "active") {
          setPolling(false);
          setSearchParams({});
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data.status === "failed" || attempts >= maxAttempts) {
          setPolling(false);
          setSearchParams({ status: "failed" });
          return;
        }
        attempts++;
        setTimeout(check, 2000);
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          setPolling(false);
          setSearchParams({ status: "failed" });
        } else {
          setTimeout(check, 2000);
        }
      }
    };

    check();
  }, [navigate, setSearchParams]);

  // Returning from Paystack — verify payment, then poll for activation
  useEffect(() => {
    if (urlReference) {
      setSearchParams({ status: "success" });
      api.post("/payments/verify", { reference: urlReference })
        .then(() => pollForActivation())
        .catch(() => pollForActivation());
    }
  }, [urlReference]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (urlStatus === "success" && !urlReference) {
      pollForActivation();
    }
  }, [urlStatus, urlReference, pollForActivation]);

  useEffect(() => {
    if (urlStatus && urlStatus !== "success") {
      const timer = setTimeout(() => setSearchParams({}), 5000);
      return () => clearTimeout(timer);
    }
  }, [urlStatus, setSearchParams]);

  const handleSubscribe = async (plan) => {
    try {
      const sub = await subscribe(plan);
      const { data } = await api.post("/payments/initialize", {
        subscriptionId: sub.id,
      });

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // Dev mode — no Paystack key, verify directly and go to dashboard
        await api.post("/payments/verify", { reference: data.payment.reference });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong");
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    try {
      await update(subscription.id, { status: "cancelled" });
      navigate("/subscription", { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong");
    }
  };

  if (loading) {
    return (
      <SubscriberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
        </div>
      </SubscriberLayout>
    );
  }

  const statusBanner = (() => {
    if (polling) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
          <Clock size={20} className="text-blue-600 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Confirming payment...</p>
            <p className="text-xs text-blue-600">Checking with Paystack, please wait.</p>
          </div>
        </div>
      );
    }

    if (urlStatus === "success" && !polling) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Payment confirmed!</p>
            <p className="text-xs text-emerald-600">Redirecting you now...</p>
          </div>
        </div>
      );
    }

    if (urlStatus === "failed") {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <XCircle size={20} className="text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Payment was not completed</p>
            <p className="text-xs text-red-600">No worries — you can try again whenever you're ready.</p>
          </div>
          <button onClick={() => setSearchParams({})} className="text-xs font-medium text-red-600 hover:text-red-800 underline">Dismiss</button>
        </div>
      );
    }

    if (subscription?.status === "cancelled") {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Subscription cancelled</p>
            <p className="text-xs text-amber-600">Pick a new plan below to get back on track.</p>
          </div>
        </div>
      );
    }

    if (subscription?.status === "expired") {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Payment expired</p>
            <p className="text-xs text-red-600">Your recurring payment failed. Choose a plan below to resubscribe.</p>
          </div>
        </div>
      );
    }

    if (subscription?.status === "pending") {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <Clock size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Payment pending</p>
            <p className="text-xs text-amber-600">Complete your payment or choose a new plan below.</p>
          </div>
        </div>
      );
    }

    return null;
  })();

  return (
    <SubscriberLayout>
      <div className="max-w-lg mx-auto">
        {statusBanner}

        <h1 className="text-2xl font-serif font-bold text-mayden-dark mb-6">My Subscription</h1>

        {(subscription?.status === "active") && !polling ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700`}>
                Active
              </span>
              <span className="text-sm text-gray-500">
                {subscription.plan === "weekly" ? `₦${pricing.weeklyPrice} / Week` : `₦${pricing.monthlyPrice} / Month`}
              </span>
            </div>
            <div className="text-sm text-gray-500 space-y-2 mb-6">
              <p>Started: {new Date(subscription.startDate).toLocaleDateString()}</p>
              <p>Next renewal: {new Date(subscription.nextRenewal).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-sm !border-red-200 !text-red-500 hover:!bg-red-50"
                onClick={handleCancel}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!polling && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSubscribe("weekly")}
                  className="rounded-xl border-2 border-gray-200 p-6 text-center hover:border-mayden-magenta transition-colors"
                >
                  <p className="text-2xl font-bold text-mayden-dark">₦{pricing.weeklyPrice}</p>
                  <p className="text-sm text-gray-500">Weekly</p>
                </button>
                <button
                  onClick={() => handleSubscribe("monthly")}
                  className="rounded-xl border-2 border-mayden-magenta p-6 text-center bg-mayden-magenta/5"
                >
                  <p className="text-2xl font-bold text-mayden-dark">₦{pricing.monthlyPrice}</p>
                  <p className="text-sm text-gray-500">Monthly</p>
                </button>
              </div>
            )}

            {!polling && (
              <p className="text-xs text-center text-gray-400 mt-2">
                Auto-deducted from your Mayden account. Cancel anytime.
              </p>
            )}
          </div>
        )}
      </div>
    </SubscriberLayout>
  );
}
