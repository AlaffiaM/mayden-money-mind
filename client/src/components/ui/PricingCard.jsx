// Pricing card displaying monthly/weekly plans with features list and trust badge
import { Lock, Check } from "lucide-react";

export default function PricingCard({ plans, note, cta, trust, included }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-4 mb-6">
        {plans.map((plan, i) => {
          const isMonthly = plan.badge;
          return (
            <div
              key={plan.label}
              className={`relative rounded-xl border-2 p-6 text-center transition-all ${
                isMonthly
                  ? "border-mayden-magenta border-[3px] bg-mayden-pink-tint shadow-sm"
                  : "border-gray-200 hover:border-mayden-magenta/50 bg-white"
              }`}
            >
              {isMonthly && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-mayden-magenta text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  {plan.badge}
                </span>
              )}
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{plan.label}</p>
              <p className="text-4xl font-bold text-gray-900">
                {plan.price}
                <span className="text-base font-normal text-gray-400">{plan.period}</span>
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
        <div className="bg-gray-50 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What's Included</p>
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
