import { Play, Pause } from "lucide-react";
import { usePlayer } from "../../context/usePlayer";

const dayColors = {
  monday: "bg-blue-100 text-blue-600",
  tuesday: "bg-emerald-100 text-emerald-600",
  wednesday: "bg-purple-100 text-purple-600",
  thursday: "bg-amber-100 text-amber-600",
  friday: "bg-rose-100 text-rose-600",
};

function EqBars() {
  const heights = [7, 12, 9, 14];
  return (
    <div className="flex h-4 items-end gap-[3px]">
      {heights.map((h, i) => (
        <span key={i} className="eq-bar w-[3px] rounded-full bg-mayden-magenta" style={{ height: h }} />
      ))}
    </div>
  );
}

export default function EpisodeCard({ episode, onPlay }) {
  const { episode: activeEp, playing, playEpisode, toggle } = usePlayer();

  const isActive = activeEp?.id === episode.id;
  const isPlaying = isActive && playing;
  const dayLabel = episode.dayType?.charAt(0).toUpperCase() + episode.dayType?.slice(1);
  const duration = episode.runTimeSeconds
    ? `${Math.floor(episode.runTimeSeconds / 60)}:${String(episode.runTimeSeconds % 60).padStart(2, "0")}`
    : "2:00";

  const handleToggle = () => {
    if (isActive) {
      toggle();
      return;
    }
    playEpisode(episode);
    onPlay?.(episode);
  };

  return (
    <div
      className={`flex w-64 flex-shrink-0 flex-col rounded-2xl border p-5 transition-all ${
        isActive
          ? "border-mayden-magenta/60 bg-mayden-pink-tint/40 shadow-md"
          : "border-gray-100 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            dayColors[episode.dayType] || "bg-gray-100 text-gray-600"
          }`}
        >
          {dayLabel}s
        </span>
        <span className="text-xs text-gray-400">{duration}</span>
      </div>

      <h4 className="mb-2 text-sm font-semibold text-mayden-dark line-clamp-2">{episode.title}</h4>
      <p className="mb-4 text-xs text-gray-500 line-clamp-2">{episode.showNotes}</p>

      <div className="mt-auto flex items-center justify-between">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-mayden-magenta text-white shadow-md shadow-mayden-magenta/25 transition-all hover:scale-105"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <div className="flex items-center gap-2">
          {isActive && !isPlaying && (
            <span className="text-xs font-medium text-mayden-magenta">Paused</span>
          )}
          {isPlaying && <EqBars />}
        </div>
      </div>
    </div>
  );
}