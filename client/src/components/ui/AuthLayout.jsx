export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mayden-gray px-4 py-12">
      <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-mayden-magenta/10 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-mayden-pink-tint blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(26,26,26,0.08)] ring-1 ring-mayden-dark/5">
          <div className="mb-8 text-center">
            <img
              src="/assets/logo.jpg"
              alt="Money & Mind"
              className="mx-auto mb-4 h-14 w-14 rounded-full object-contain ring-4 ring-mayden-pink-tint"
            />
            <h1 className="font-serif text-2xl font-bold text-mayden-dark">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}