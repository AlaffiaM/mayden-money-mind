export default function Loader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-mayden-magenta border-t-transparent" />
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-mayden-magenta border-t-transparent" />
  );
}