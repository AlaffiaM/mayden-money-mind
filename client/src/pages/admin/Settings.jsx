import { useEffect, useState } from "react";
import api from "../../services/api";
import { Save, CreditCard, Clock, Tag } from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminCard from "../../components/admin/AdminCard";
import Loader from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast";

const DEFAULT_DAY_LABELS = {
  monday: "Motivation Mondays",
  tuesday: "Tactical Tuesdays",
  wednesday: "Wellness Wednesdays",
  thursday: "Testimonial Thursdays",
  friday: "Financial Fridays",
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mayden-magenta/10">
          <Icon size={18} className="text-mayden-magenta" />
        </div>
        <h2 className="font-serif text-lg font-bold text-mayden-dark">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dayLabels, setDayLabels] = useState(DEFAULT_DAY_LABELS);
  const toast = useToast();

  useEffect(() => {
    api.get("/admin/settings")
      .then(({ data }) => {
        setSettings(data);
        try { setDayLabels(JSON.parse(data.dayLabels || "{}")); } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setSettings({ ...settings, [key]: value });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { ...settings, dayLabels: JSON.stringify(dayLabels) };
      const { data } = await api.put("/admin/settings", payload);
      setSettings(data);
      try { setDayLabels(JSON.parse(data.dayLabels || "{}")); } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading settings…" />;

  const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20";

  return (
    <div className="space-y-6">
      <AdminPageHeading title="Settings" subtitle="Pricing, episode schedule and day-type labels." />

      <Section icon={CreditCard} title="Pricing">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Weekly Price (₦)">
            <input type="number" value={settings.weeklyPrice || ""} onChange={(e) => update("weeklyPrice", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Monthly Price (₦)">
            <input type="number" value={settings.monthlyPrice || ""} onChange={(e) => update("monthlyPrice", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Currency" hint="ISO 4217 currency code">
          <input value={settings.currency || ""} onChange={(e) => update("currency", e.target.value)} className={inputClass} />
        </Field>
      </Section>

      <Section icon={Clock} title="Episode & Renewal">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Episode Release Time" hint="Time of day episodes are published (24h format)">
            <input type="time" value={settings.episodeReleaseTime || "06:00"} onChange={(e) => update("episodeReleaseTime", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Grace Period (hours)" hint="Time after failed renewal before past_due status">
            <input type="number" value={settings.gracePeriodHours || "48"} onChange={(e) => update("gracePeriodHours", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">
            <strong>Business Rule:</strong> Failed renewals enter "past_due" status for the configured grace period.
            During this time, 2 reminders are sent. After the grace period expires without payment, the subscription is automatically cancelled.
          </p>
        </div>
      </Section>

      <Section icon={Tag} title="Day-Type Labels">
        <p className="mb-4 text-sm text-gray-500">Customize the display names for each day's episode theme.</p>
        <div className="space-y-3">
          {Object.entries(DEFAULT_DAY_LABELS).map(([key]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-xs capitalize text-gray-400">{key}</span>
              <input
                value={dayLabels[key] || ""}
                onChange={(e) => setDayLabels({ ...dayLabels, [key]: e.target.value })}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-mayden-magenta px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save All Settings"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">All settings saved!</span>}
      </div>
    </div>
  );
}