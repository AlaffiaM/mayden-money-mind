// Admin settings page — pricing, episode config, day labels, grace period
// All settings saved via PUT /api/admin/settings (upserts to Setting table)
import { useEffect, useState } from "react";
import api from "../../services/api";
import { Save, CreditCard, Clock, Tag } from "lucide-react";

// Default day-type display names (shown if no custom labels are set)
const DEFAULT_DAY_LABELS = {
  monday: "Motivation Mondays",
  tuesday: "Tactical Tuesdays",
  wednesday: "Wellness Wednesdays",
  thursday: "Testimonial Thursdays",
  friday: "Financial Fridays",
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-mayden-magenta/10 flex items-center justify-center">
          <Icon size={18} className="text-mayden-magenta" />
        </div>
        <h2 className="text-lg font-semibold text-mayden-dark">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dayLabels, setDayLabels] = useState(DEFAULT_DAY_LABELS);

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
      alert(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mayden-dark">Settings</h1>

      {/* Pricing */}
      <Section icon={CreditCard} title="Pricing">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Weekly Price (₦)">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">₦</span>
              <input type="number" value={settings.weeklyPrice || ""} onChange={(e) => update("weeklyPrice", e.target.value)} className={inputClass} />
            </div>
          </Field>
          <Field label="Monthly Price (₦)">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">₦</span>
              <input type="number" value={settings.monthlyPrice || ""} onChange={(e) => update("monthlyPrice", e.target.value)} className={inputClass} />
            </div>
          </Field>
        </div>
        <Field label="Currency" hint="ISO 4217 currency code">
          <input value={settings.currency || ""} onChange={(e) => update("currency", e.target.value)} className={inputClass} />
        </Field>
      </Section>

      {/* Episode & Renewal */}
      <Section icon={Clock} title="Episode & Renewal">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Episode Release Time" hint="Time of day episodes are published (24h format)">
            <input type="time" value={settings.episodeReleaseTime || "06:00"} onChange={(e) => update("episodeReleaseTime", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Grace Period (hours)" hint="Time after failed renewal before past_due status">
            <input type="number" value={settings.gracePeriodHours || "48"} onChange={(e) => update("gracePeriodHours", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <strong>Business Rule:</strong> Failed renewals enter "past_due" status for the configured grace period.
            During this time, 2 reminders are sent. After the grace period expires without payment, the subscription is automatically cancelled.
          </p>
        </div>
      </Section>

      {/* Day Type Labels */}
      <Section icon={Tag} title="Day-Type Labels">
        <p className="text-sm text-gray-500 mb-4">Customize the display names for each day's episode theme.</p>
        <div className="space-y-3">
          {Object.entries(DEFAULT_DAY_LABELS).map(([key, defaultVal]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-400 capitalize">{key}</span>
              <input
                value={dayLabels[key] || ""}
                onChange={(e) => setDayLabels({ ...dayLabels, [key]: e.target.value })}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-mayden-magenta text-white rounded-lg text-sm font-medium hover:bg-mayden-magenta/90 disabled:opacity-50 transition-colors"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save All Settings"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">All settings saved!</span>}
      </div>
    </div>
  );
}
