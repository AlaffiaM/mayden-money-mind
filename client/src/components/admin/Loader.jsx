export default function Loader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mayden-magenta/20 border-t-mayden-magenta" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-mayden-magenta border-t-transparent" />
  );
}