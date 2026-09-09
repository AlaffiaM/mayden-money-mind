import { Play, Pause, X } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";

const formatTime = (s) => {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function NowPlayingBar() {
  const { episode, playing, current, duration, loading, toggle, seek, close } =
    usePlayer();

  if (!episode) return null;

  const dayLabel = episode.dayType
    ? episode.dayType.charAt(0).toUpperCase() + episode.dayType.slice(1)
    : "";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 safe-area-bottom">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl bg-white/95 shadow-[0_12px_40px_rgba(26,26,26,0.18)] ring-1 ring-mayden-dark/10 backdrop-blur p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            disabled={loading}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-mayden-magenta text-white shadow-md shadow-mayden-magenta/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : playing ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-mayden-dark">
                {episode.title || "Playing"}
              </span>
              {dayLabel && (
                <span className="flex-shrink-0 rounded-full bg-mayden-magenta/10 px-2 py-0.5 text-[10px] font-semibold text-mayden-magenta">
                  {dayLabel}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="w-8 flex-shrink-0 text-right text-[10px] tabular-nums text-gray-400">
                {formatTime(current)}
              </span>
              <div
                className="h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-gray-200"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / rect.width),
                  );
                  seek(pct * (duration || 0));
                }}
              >
                <div
                  className="h-full rounded-full bg-mayden-magenta transition-all duration-150"
                  style={{
                    width: `${duration > 0 ? (current / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 flex-shrink-0 text-[10px] tabular-nums text-gray-400">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <button
            onClick={close}
            aria-label="Close player"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
