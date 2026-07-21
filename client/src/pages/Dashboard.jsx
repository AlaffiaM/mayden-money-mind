// Subscriber dashboard — today's episode player + "The Vault" library with mood search + subscription footer
// Loads today's episode and all episodes on mount, groups library by day type
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import api from "../services/api";
import AudioPlayer from "../components/ui/AudioPlayer";
import Carousel from "../components/ui/Carousel";
import EpisodeCard from "../components/ui/EpisodeCard";
import InstallBanner from "../components/ui/InstallBanner";
import SubscriberLayout from "../components/layout/SubscriberLayout";
import { ChevronDown, ChevronUp, CreditCard, Calendar } from "lucide-react";

// Day-based mood search tags for The Vault
const moodTags = [
  { label: "I want focus", query: "monday" },
  { label: "I want save", query: "tuesday" },
  { label: "I want peace", query: "wednesday" },
  { label: "I want inspiration", query: "thursday" },
  { label: "I want to celebrate", query: "friday" },
];

// Day pillar category labels
const dayCategories = {
  monday: "Motivation & Vision",
  tuesday: "Money Tactics",
  wednesday: "Nervous System Resets",
  thursday: "Success Stories",
  friday: "Financial Wins",
};

// Day names for the "Today: [Day] – [Title]" format
const dayNames = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [todayEpisode, setTodayEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const currentEpisodeId = useRef(null);

  useEffect(() => {
    api.get("/episodes/today").then(({ data }) => setTodayEpisode(data)).catch(() => {});
    api.get("/episodes/library").then(({ data }) => setEpisodes(data)).catch(() => {});
  }, []);

  // Filter episodes by mood search query (matches dayType)
  const filteredEpisodes = vaultSearch
    ? episodes.filter(
        (ep) =>
          ep.dayType?.toLowerCase() === vaultSearch.toLowerCase()
      )
    : episodes;

  // Build dynamic hero title: "Today: Tactical Tuesday – The Peace of Mind Fund"
  const todayDayName = dayNames[todayEpisode?.dayType] || new Date().toLocaleDateString("en-US", { weekday: "long" });
  const heroTitle = todayEpisode
    ? `Today: ${todayDayName} – ${todayEpisode.title}`
    : "";

  return (
    <SubscriberLayout>
      {/* Section 1: Welcome */}
      <div className={`mb-8 transition-all duration-500 ${playing ? "bg-gradient-to-b from-mayden-magenta/5 to-transparent rounded-2xl p-4 -mx-4" : ""}`}>
        <h1 className="text-2xl lg:text-3xl font-serif font-bold text-mayden-dark mb-2">
          Good morning, {user?.fullName?.split(" ")[0]}. Take a breath. Your day starts here.
        </h1>
      </div>

      {/* Section 2: Hero Audio Player */}
      {todayEpisode ? (
        <div id="hero-player" className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 mb-8">
          <p className="text-sm text-mayden-magenta font-semibold mb-2">
            {todayDayName}
          </p>
          <h2 className="text-xl lg:text-2xl font-serif font-bold text-mayden-dark mb-6">
            {heroTitle}
          </h2>
          <AudioPlayer
            src={todayEpisode.audioUrl}
            title={todayEpisode.title}
            large
            onPlayToggle={setPlaying}
            onPlayStart={() => {
              const id = currentEpisodeId.current || todayEpisode.id;
              api.post(`/episodes/${id}/listen`).catch(() => {});
            }}
          />

          {/* Section 3: Show Notes with expand/collapse */}
          {todayEpisode.showNotes && (
            <div className="mt-6 rounded-xl bg-gray-50 text-sm text-gray-600 leading-relaxed overflow-hidden transition-all duration-300">
              <div className={`${notesExpanded ? "" : "max-h-24"} relative`}>
                <div className="p-5" dangerouslySetInnerHTML={{ __html: todayEpisode.showNotes }} />
                {!notesExpanded && todayEpisode.showNotes.length > 200 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
                )}
              </div>
              {todayEpisode.showNotes.length > 200 && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 px-5 pb-4 text-xs font-medium text-mayden-magenta hover:underline"
                >
                  {notesExpanded ? (
                    <>Show less <ChevronUp size={14} /></>
                  ) : (
                    <>Read more <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8 text-center">
          <p className="text-gray-500">No episode for today yet. Check back soon!</p>
        </div>
      )}

      {/* Section 4: The Vault */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl lg:text-2xl font-serif font-bold text-mayden-dark mb-4">
          The Vault
        </h2>

        {/* Mood-based search */}
        <div className="flex flex-wrap gap-2 mb-4">
          {moodTags.map((tag) => (
            <button
              key={tag.label}
              onClick={() => setVaultSearch(vaultSearch === tag.query ? "" : tag.query)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                vaultSearch === tag.query
                  ? "bg-mayden-magenta text-white border-mayden-magenta"
                  : "border-gray-200 text-gray-600 hover:border-mayden-magenta hover:text-mayden-magenta"
              }`}
            >
              {tag.label}
            </button>
          ))}
          {vaultSearch && (
            <button
              onClick={() => setVaultSearch("")}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Episodes — grouped by day pillar, or flat list when searching */}
        {vaultSearch ? (
          <div className="space-y-3">
            {filteredEpisodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                onPlay={(episode) => {
                  currentEpisodeId.current = episode.id;
                  setTodayEpisode(episode);
                  document.getElementById("hero-player")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ))}
            {filteredEpisodes.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No episodes match your search.</p>
            )}
          </div>
        ) : (
          <>
            {Object.entries(dayCategories).map(([day, label]) => {
              const filtered = episodes.filter((ep) => ep.dayType === day);
              if (filtered.length === 0) return null;
              return (
                <Carousel key={day} title={label}>
                  {filtered.map((ep) => (
                    <EpisodeCard
                      key={ep.id}
                      episode={ep}
                      onPlay={(episode) => {
                        currentEpisodeId.current = episode.id;
                        setTodayEpisode(episode);
                        document.getElementById("hero-player")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                  ))}
                </Carousel>
              );
            })}
            {episodes.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">No episodes in the Vault yet.</p>
            )}
          </>
        )}
      </div>

      {/* Section 5: Subscription Management Footer */}
      {subscription && subscription.status === "active" && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-mayden-dark">
                Active – {subscription.plan === "weekly" ? "₦100/Weekly" : "₦350/Monthly"}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={11} />
                Next renewal: {new Date(subscription.nextRenewal).toLocaleDateString()}
              </div>
            </div>
          </div>
          <a
            href="/subscription"
            className="text-xs font-medium text-mayden-magenta hover:underline"
          >
            Manage
          </a>
        </div>
      )}

      <InstallBanner />
    </SubscriberLayout>
  );
}
