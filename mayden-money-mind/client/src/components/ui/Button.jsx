// Reusable button component with primary, outline, ghost, and pill variants
export default function Button({ children, variant = "primary", className = "", pill = false, ...props }) {
  const base = "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = "px-8 py-3 text-base lg:px-10 lg:py-4 lg:text-lg";
  const shape = pill ? "rounded-full" : "rounded-lg";
  const variants = {
    primary: "bg-mayden-magenta text-white hover:bg-mayden-magenta/90 shadow-lg shadow-mayden-magenta/25 hover:shadow-mayden-magenta/40 hover:scale-[1.02]",
    outline: "border-2 border-mayden-magenta text-mayden-magenta hover:bg-mayden-magenta hover:text-white",
    ghost: "text-mayden-dark hover:text-mayden-magenta",
  };

  return (
    <button className={`${base} ${sizes} ${shape} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
