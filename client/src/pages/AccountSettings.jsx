import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import SubscriberLayout from "../components/layout/SubscriberLayout";
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
        <div>
          <h1 className="font-serif text-2xl font-bold text-mayden-dark">
            Account settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account and listening reminders.
          </p>
        </div>

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
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-mayden-dark">
              Daily listening email
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Active subscribers receive one email at 10:00 a.m. WAT when
              today&apos;s audio is ready. You can turn this reminder off
              anytime.
            </p>
            <label className="mt-5 flex cursor-pointer items-center gap-3">
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
