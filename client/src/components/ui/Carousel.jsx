import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({ title, children }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-8">
      {title && <h3 className="mb-4 text-base font-semibold text-mayden-dark">{title}</h3>}
      <div className="relative group">
        <button
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title || "episodes"} left`}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 opacity-0 shadow-md transition-all hover:text-mayden-magenta group-hover:opacity-100"
        >
          <ChevronLeft size={18} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
        >
          {children}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title || "episodes"} right`}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 opacity-0 shadow-md transition-all hover:text-mayden-magenta group-hover:opacity-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
