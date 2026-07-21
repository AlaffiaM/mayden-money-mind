// FAQ accordion with single-expand behavior and chevron toggle
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-mayden-dark pr-4">{item.question}</span>
            <ChevronDown
              size={18}
              className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
