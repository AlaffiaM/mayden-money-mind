// Library page — searchable episode list with mood-tag quick filters
// Episodes expand inline with an audio player when play is clicked
import { useState, useEffect } from "react";
import api from "../services/api";
import AudioPlayer from "../components/ui/AudioPlayer";
import { Search } from "lucide-react";
import SubscriberLayout from "../components/layout/SubscriberLayout";

// Day-based mood search tags
const moodTags = [
  { label: "I want focus", query: "monday" },
  { label: "I want save", query: "tuesday" },
  { label: "I want peace", query: "wednesday" },
  { label: "I want inspiration", query: "thursday" },
  { label: "I want to celebrate", query: "friday" },
];

export default function Library() {
  const [episodes, setEpisodes] = useState([]);
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState(null);
  const [hasLogged, setHasLogged] = useState({});

  useEffect(() => {
    api.get("/episodes/library").then(({ data }) => setEpisodes(data)).catch(() => {});
  }, []);

  const dayTypes = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const isDayType = dayTypes.includes(search.toLowerCase());

  const filtered = episodes.filter(
    (ep) =>
      isDayType
        ? ep.dayType?.toLowerCase() === search.toLowerCase()
        : ep.title?.toLowerCase().includes(search.toLowerCase()) ||
          ep.showNotes?.toLowerCase().includes(search.toLowerCase())
  );

  const dayLabels = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
  };

  return (
    <SubscriberLayout>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-serif font-bold text-mayden-dark mb-4">
          The Mayden Library
        </h1>
        <div className="flex flex-wrap gap-2 mb-4">
          {moodTags.map((tag) => (
            <button
              key={tag.label}
              onClick={() => setSearch(tag.query)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:border-mayden-magenta hover:text-mayden-magenta transition-colors"
            >
              {tag.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search episodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((ep) => (
          <div key={ep.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-mayden-magenta px-2 py-0.5 rounded-full bg-mayden-magenta/10">
                  {dayLabels[ep.dayType] || ep.dayType}s
                </span>
                <h3 className="text-base font-semibold text-mayden-dark mt-2 mb-1">{ep.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{ep.showNotes}</p>
              </div>
              <button
                onClick={() => {
                  const isPlaying = playing === ep.id;
                  setPlaying(isPlaying ? null : ep.id);
                  if (!isPlaying && !hasLogged[ep.id]) {
                    api.post(`/episodes/${ep.id}/listen`).catch(() => {});
                    setHasLogged((prev) => ({ ...prev, [ep.id]: true }));
                  }
                }}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-mayden-magenta text-white flex items-center justify-center hover:bg-mayden-magenta/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {playing === ep.id ? (
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
              </button>
            </div>
            {playing === ep.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <AudioPlayer src={ep.audioUrl} title={ep.title} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No episodes match your search.</p>
        )}
      </div>
    </SubscriberLayout>
  );
}
