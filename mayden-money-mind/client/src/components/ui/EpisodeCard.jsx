// Episode card displaying day, title, duration, and play button with day-based color coding
import { Play } from "lucide-react";

export default function EpisodeCard({ episode, onPlay }) {
  const dayColors = {
    monday: "bg-blue-100 text-blue-600",
    tuesday: "bg-emerald-100 text-emerald-600",
    wednesday: "bg-purple-100 text-purple-600",
    thursday: "bg-amber-100 text-amber-600",
    friday: "bg-rose-100 text-rose-600",
  };

  const dayLabel = episode.dayType?.charAt(0).toUpperCase() + episode.dayType?.slice(1);

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${dayColors[episode.dayType] || "bg-gray-100 text-gray-600"}`}>
          {dayLabel}s
        </span>
        <span className="text-xs text-gray-400">{episode.runTimeSeconds ? `${Math.floor(episode.runTimeSeconds / 60)}:${String(episode.runTimeSeconds % 60).padStart(2, "0")}` : "2:00"}</span>
      </div>
      <h4 className="text-sm font-semibold text-mayden-dark mb-2 line-clamp-2">{episode.title}</h4>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{episode.showNotes}</p>
      <button
        onClick={() => onPlay?.(episode)}
        className="flex items-center gap-1.5 text-xs font-medium text-mayden-magenta hover:text-mayden-magenta/80 transition-colors"
      >
        <Play size={14} /> Play Episode
      </button>
    </div>
  );
}
