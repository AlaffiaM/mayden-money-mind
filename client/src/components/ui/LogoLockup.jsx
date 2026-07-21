// Logo lockup supporting vertical and horizontal orientations
// Vertical: icon centered above "Money & Mind" above "by Mayden Microfinance Bank"
// Horizontal: icon + "Money & Mind" + logo image
export default function LogoLockup({ className = "", orientation = "vertical" }) {
  if (orientation === "horizontal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src="/assets/logo.jpg"
          alt="Money & Mind"
          className="w-8 h-8 object-contain rounded-full"
        />
        <span className="font-serif font-semibold text-sm text-mayden-dark">
          Money <span className="text-mayden-magenta">&</span> Mind
        </span>
        <span className="text-[10px] text-gray-400">by Mayden Microfinance Bank</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src="/assets/logo.jpg"
        alt="Money & Mind by Mayden"
        className="w-28 h-28 lg:w-32 lg:h-32 object-contain mb-4 drop-shadow-sm"
      />
      <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl font-bold text-mayden-dark tracking-tight leading-tight">
        Money <span className="text-mayden-magenta">&</span> Mind
      </h1>
      <p className="text-sm lg:text-base text-gray-500 mt-2 tracking-wide">
        by <span className="font-semibold text-mayden-dark">Mayden Microfinance Bank</span>
      </p>
    </div>
  );
}
