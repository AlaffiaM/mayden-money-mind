import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { Bell } from "lucide-react";
import SubscriberLayout from "../components/layout/SubscriberLayout";
import UserPageHeading from "../components/ui/UserPageHeading";
import Loader from "../components/admin/Loader";
import LoadError from "../components/ui/LoadError";

export default function AccountSettings() {
  const { user } = useAuth();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadPreferences = useCallback(() => {
    api
      .get("/account/preferences")
      .then(({ data }) => {
        setReminderEnabled(data.dailyListeningReminderEnabled);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updateReminderPreference = async (event) => {
    const enabled = event.target.checked;
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await api.patch("/account/preferences", {
        dailyListeningReminderEnabled: enabled,
      });
      setReminderEnabled(data.dailyListeningReminderEnabled);
    } catch (err) {
      setSaveError(
        err.response?.data?.error || "Could not update your email preference.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubscriberLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <UserPageHeading
          title="Account settings"
          subtitle="Manage your account and listening reminders."
        />

        {loading ? (
          <Loader label="Loading account settings…" />
        ) : loadError ? (
          <LoadError
            message="Couldn't load your account settings."
            onRetry={() => {
              setLoading(true);
              setLoadError(false);
              loadPreferences();
            }}
          />
        ) : (
          <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-[0_8px_28px_rgba(26,26,26,0.045)] sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mayden-pink-tint text-mayden-magenta">
                <Bell size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-mayden-dark">
                  Daily listening email
                </h2>
                <p className="mt-1 text-xs font-medium text-mayden-magenta">
                  A gentle reminder at 10:00 a.m. WAT
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Active subscribers receive one email at 10:00 a.m. WAT when
              today&apos;s audio is ready. You can turn this reminder off
              anytime.
            </p>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={updateReminderPreference}
                disabled={saving}
                className="h-4 w-4 rounded border-gray-300 text-mayden-magenta focus:ring-mayden-magenta"
              />
              <span className="text-sm font-medium text-gray-700">
                Email me a daily listening reminder
              </span>
              {saving && (
                <span className="text-xs text-gray-400">Saving…</span>
              )}
            </label>
            {saveError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {saveError}
              </p>
            )}
            <p className="mt-4 text-xs text-gray-400">
              Account: {user?.email}
            </p>
          </section>
        )}
      </div>
    </SubscriberLayout>
  );
}
