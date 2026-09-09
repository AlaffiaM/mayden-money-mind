import { useState, useEffect } from "react";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { Search, Play, Pause } from "lucide-react";
import SubscriberLayout from "../components/layout/SubscriberLayout";

const moodTags = [
  { label: "I want focus", query: "monday" },
  { label: "I want to save", query: "tuesday" },
  { label: "I want peace", query: "wednesday" },
  { label: "I want inspiration", query: "thursday" },
  { label: "I want to celebrate", query: "friday" },
];

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

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
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-mayden-magenta"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export default function Library() {
  const [episodes, setEpisodes] = useState([]);
  const [search, setSearch] = useState("");
  const { episode: activeEp, playing, playEpisode, toggle } = usePlayer();

  useEffect(() => {
    api
      .get("/episodes/my-library")
      .then(({ data }) => setEpisodes(data))
      .catch(() => {});
  }, []);

  const dayTypes = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const isDayType = dayTypes.includes(search.toLowerCase());

  const filtered = episodes.filter((ep) =>
    isDayType
      ? ep.dayType?.toLowerCase() === search.toLowerCase()
      : ep.title?.toLowerCase().includes(search.toLowerCase()) ||
        ep.showNotes?.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const canPlay = (ep) => ep.status === "published";

  const handleToggle = (ep) => {
    if (!canPlay(ep)) return;
    if (activeEp?.id === ep.id) toggle();
    else playEpisode(ep);
  };

  return (
    <SubscriberLayout>
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-serif font-bold text-mayden-dark lg:text-3xl">
          My Library
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Episodes you've listened to. Your library stays with you even if your
          subscription lapses — renew to play again.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {moodTags.map((tag) => (
            <button
              key={tag.label}
              onClick={() =>
                setSearch((s) => (s === tag.query ? "" : tag.query))
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                search === tag.query
                  ? "bg-mayden-magenta text-white border-mayden-magenta"
                  : "border-gray-200 text-gray-600 hover:border-mayden-magenta hover:text-mayden-magenta"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search your library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((ep) => {
          const isActive = activeEp?.id === ep.id;
          const isPlaying = isActive && playing;
          return (
            <div
              key={ep.id}
              className={`rounded-2xl border p-4 transition-all ${
                isActive
                  ? "border-mayden-magenta/50 bg-mayden-pink-tint/30 shadow-sm"
                  : "border-gray-100 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        dayColors[ep.dayType] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {dayLabels[ep.dayType] || ep.dayType}s
                    </span>
                    {isPlaying && <EqBars />}
                    {isActive && !isPlaying && (
                      <span className="text-xs font-medium text-mayden-magenta">
                        Paused
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1 text-base font-semibold text-mayden-dark">
                    {ep.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {ep.showNotes}
                  </p>
                  {ep.lastListened && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last listened: {formatDate(ep.lastListened)}
                    </p>
                  )}
                  {!canPlay(ep) && (
                    <p className="mt-1 text-xs text-gray-400">
                      Saved — playback requires an active subscription.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(ep)}
                  disabled={!canPlay(ep)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                    canPlay(ep)
                      ? "bg-mayden-magenta text-white shadow-md shadow-mayden-magenta/25 hover:scale-105"
                      : "cursor-not-allowed bg-gray-200 text-gray-400"
                  }`}
                >
                  {isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} className="ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-gray-400">
            {episodes.length === 0
              ? "Your library is empty. Start listening from the dashboard to build it."
              : "No episodes match your search."}
          </p>
        )}
      </div>
    </SubscriberLayout>
  );
}
