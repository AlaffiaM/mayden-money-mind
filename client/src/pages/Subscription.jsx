import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { usePricing } from "../hooks/usePricing";
import Button from "../components/ui/Button";
import api from "../services/api";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import SubscriberLayout from "../components/layout/SubscriberLayout";

export default function Subscription() {
  const navigate = useNavigate();
  const { subscription, loading, subscribe, update, setAutoRenew, refetch } =
    useSubscription();
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

  useEffect(() => {
    if (urlReference) {
      setSearchParams({ status: "success" });
      api
        .post("/payments/verify", { reference: urlReference })
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

  useEffect(() => {
    if (!subscription) return;

    const checkExpiration = () => {
      const now = new Date();
      const nextRenewal = new Date(subscription.nextRenewal);
      if (nextRenewal < now) {
        refetch().catch(() => {});
      }
    };

    checkExpiration();

    const intervalId = setInterval(checkExpiration, 3600000);
    return () => clearInterval(intervalId);
  }, [subscription, refetch]);

  const handleSubscribe = async (plan) => {
    try {
      const sub = await subscribe(plan);
      const { data } = await api.post("/payments/initialize", {
        subscriptionId: sub.id,
      });

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        await api.post("/payments/verify", {
          reference: data.payment.reference,
        });
        navigate("/dashboard", { replace: true });
      }
    } catch {
      alert("We couldn't complete your subscription. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    try {
      await update(subscription.id, { status: "cancelled" });
      navigate("/subscription", { replace: true });
    } catch {
      alert("We couldn't update your subscription. Please try again.");
    }
  };

  const handleAutoRenewToggle = async () => {
    if (!subscription) return;
    try {
      if (subscription.autoRenew) {
        await setAutoRenew(subscription.id, false);
      } else {
        await setAutoRenew(subscription.id, true);
        const { data } = await api.post("/payments/initialize", {
          subscriptionId: subscription.id,
          forceCard: true,
        });
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          await api.post("/payments/verify", {
            reference: data.payment.reference,
          });
          navigate("/dashboard", { replace: true });
        }
      }
    } catch {
      alert("We couldn't update automatic renewal. Please try again.");
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

  const last4 =
    subscription?.payments?.find((p) => p.status === "success")?.last4 || null;
  const periodLabel = subscription?.plan === "weekly" ? "week" : "month";

  const statusBanner = (() => {
    if (polling) {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Clock
            size={20}
            className="flex-shrink-0 animate-pulse text-blue-600"
          />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Confirming payment…
            </p>
            <p className="text-xs text-blue-600">
              Checking with Paystack, please wait.
            </p>
          </div>
        </div>
      );
    }

    if (urlStatus === "success" && !polling) {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle size={20} className="flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Payment confirmed!
            </p>
            <p className="text-xs text-emerald-600">Redirecting you now...</p>
          </div>
        </div>
      );
    }

    if (urlStatus === "failed") {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <XCircle size={20} className="flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Payment was not completed
            </p>
            <p className="text-xs text-red-600">
              No worries — you can try again whenever you're ready.
            </p>
          </div>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs font-medium text-red-600 underline hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      );
    }

    if (subscription?.status === "cancelled") {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={20} className="flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Subscription cancelled
            </p>
            <p className="text-xs text-amber-600">
              Pick a new plan below to get back on track.
            </p>
          </div>
        </div>
      );
    }

    if (subscription?.status === "expired") {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={20} className="flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Payment expired
            </p>
            <p className="text-xs text-red-600">
              Your recurring payment failed. Choose a plan below to resubscribe.
            </p>
          </div>
        </div>
      );
    }

    if (subscription?.status === "pending") {
      return (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Clock size={20} className="flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Payment pending
            </p>
            <p className="text-xs text-amber-600">
              Complete your payment or choose a new plan below.
            </p>
          </div>
        </div>
      );
    }

    return null;
  })();

  return (
    <SubscriberLayout>
      <div className="mx-auto max-w-lg">
        {statusBanner}

        <h1 className="mb-6 text-2xl font-serif font-bold text-mayden-dark">
          My Subscription
        </h1>

        {subscription?.status === "active" && !polling ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-mayden-pink-tint/80 to-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Active
                </span>
                <span className="text-sm font-medium text-mayden-dark">
                  {subscription.plan === "weekly"
                    ? `₦${pricing.weeklyPrice} / Week`
                    : `₦${pricing.monthlyPrice} / Month`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5">
                  <Calendar size={14} className="flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      Started
                    </p>
                    <p className="text-gray-600">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5">
                  <RotateCcw
                    size={14}
                    className="flex-shrink-0 text-gray-400"
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      Next renewal
                    </p>
                    <p className="text-gray-600">
                      {new Date(subscription.nextRenewal).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-mayden-dark">
                      Auto-renew
                    </p>
                    <p className="text-xs text-gray-500">
                      {subscription.autoRenew
                        ? `Charged automatically to your card${last4 ? ` (•••• ${last4})` : ""} each ${periodLabel}`
                        : "Off — your access ends when this billing period expires"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoRenewToggle}
                  aria-pressed={subscription.autoRenew}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${subscription.autoRenew ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${subscription.autoRenew ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {subscription.autoRenew && (
                <Button
                  variant="outline"
                  className="w-full text-sm !border-red-200 !text-red-500 hover:!bg-red-50"
                  onClick={handleCancel}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!polling && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSubscribe("weekly")}
                    className="group rounded-2xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-mayden-magenta hover:shadow-md"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Weekly
                    </p>
                    <p className="mt-1 text-3xl font-bold text-mayden-dark">
                      ₦{pricing.weeklyPrice}
                    </p>
                    <p className="text-xs text-gray-500">per week</p>
                    <span className="mt-3 inline-block rounded-full bg-mayden-magenta/10 px-3 py-1 text-[10px] font-semibold text-mayden-magenta opacity-0 transition-opacity group-hover:opacity-100">
                      Choose this plan
                    </span>
                  </button>
                  <button
                    onClick={() => handleSubscribe("monthly")}
                    className="group relative rounded-2xl border-[3px] border-mayden-magenta bg-mayden-pink-tint/40 p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-mayden-magenta px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </span>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mayden-magenta">
                      Monthly
                    </p>
                    <p className="mt-1 text-3xl font-bold text-mayden-dark">
                      ₦{pricing.monthlyPrice}
                    </p>
                    <p className="text-xs text-gray-500">per month</p>
                    <p className="mt-2 text-[11px] font-semibold text-mayden-magenta">
                      Save ₦
                      {parseInt(pricing.weeklyPrice) * 4 -
                        parseInt(pricing.monthlyPrice)}{" "}
                      vs. weekly
                    </p>
                  </button>
                </div>

                <p className="mt-2 text-center text-xs text-gray-400">
                  Pay by card, bank transfer, or USSD. Only card payments renew
                  automatically.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </SubscriberLayout>
  );
}
