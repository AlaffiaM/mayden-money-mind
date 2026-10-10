import { Lock, Check } from "lucide-react";

export default function PricingCard({ plans, note, trust, included }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isMonthly = plan.badge;
          return (
            <div
              key={plan.label}
              className={`relative rounded-2xl border p-6 text-center transition-all ${
                isMonthly
                  ? "border-mayden-magenta/70 bg-gradient-to-br from-mayden-pink-tint/80 to-white shadow-[0_8px_24px_rgba(236,38,143,0.09)]"
                  : "border-gray-200/80 bg-white shadow-[0_3px_12px_rgba(26,26,26,0.035)] hover:border-mayden-magenta/40 hover:shadow-md"
              }`}
            >
              {isMonthly && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mayden-magenta px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {plan.badge}
                </span>
              )}
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">{plan.label}</p>
              <p className="text-3xl font-bold tracking-[-0.04em] text-gray-900 sm:text-4xl">
                {plan.price}
                <span className="ml-1 text-sm font-medium text-gray-400">{plan.period}</span>
              </p>
              {plan.save && (
                <p className="text-xs font-semibold text-mayden-magenta mt-2">{plan.save}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-center text-gray-600 mb-6">{note}</p>
      {included && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/80 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">What's Included</p>
          <ul className="space-y-2.5">
            {included.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <Check size={16} className="text-mayden-magenta flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Lock size={14} />
        {trust}
      </div>
    </div>
  );
}
