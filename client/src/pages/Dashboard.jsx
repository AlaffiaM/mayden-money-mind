import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { usePlayer } from "../context/PlayerContext";
import api from "../services/api";
import AudioPlayer from "../components/ui/AudioPlayer";
import Carousel from "../components/ui/Carousel";
import EpisodeCard from "../components/ui/EpisodeCard";
import InstallBanner from "../components/ui/InstallBanner";
import SubscriberLayout from "../components/layout/SubscriberLayout";
import { ChevronDown, ChevronUp, CreditCard, Calendar } from "lucide-react";
import { businessDayOfWeek } from "../utils/businessTime.js";

const moodTags = [
  { label: "I want focus", query: "monday" },
  { label: "I want save", query: "tuesday" },
  { label: "I want peace", query: "wednesday" },
  { label: "I want inspiration", query: "thursday" },
  { label: "I want to celebrate", query: "friday" },
];

const dayCategories = {
  monday: "Motivation & Vision",
  tuesday: "Money Tactics",
  wednesday: "Nervous System Resets",
  thursday: "Success Stories",
  friday: "Financial Wins",
};

const dayNames = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

const businessWeekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dayTints = {
  monday: "from-blue-50",
  tuesday: "from-emerald-50",
  wednesday: "from-purple-50",
  thursday: "from-amber-50",
  friday: "from-rose-50",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { episode: activeEp, playing: anyPlaying } = usePlayer();
  const [todayEpisode, setTodayEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [vaultSearch, setVaultSearch] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    api.get("/episodes/today").then(({ data }) => setTodayEpisode(data)).catch(() => {});
    api.get("/episodes/library").then(({ data }) => setEpisodes(data)).catch(() => {});
  }, []);

  const filteredEpisodes = vaultSearch
    ? episodes.filter((ep) => ep.dayType?.toLowerCase() === vaultSearch.toLowerCase())
    : episodes;

  const todayDayName = dayNames[todayEpisode?.dayType] || businessWeekdayNames[businessDayOfWeek(new Date())];
  const heroTitle = todayEpisode ? `Today: ${todayDayName} – ${todayEpisode.title}` : "";
  const isTodayPlaying = todayEpisode && activeEp?.id === todayEpisode.id && anyPlaying;

  const scrollToHero = () => document.getElementById("hero-player")?.scrollIntoView({ behavior: "smooth" });

  return (
    <SubscriberLayout>
      <div
        className={`mb-8 rounded-2xl p-4 -mx-4 transition-all duration-500 ${
          isTodayPlaying ? "bg-gradient-to-b from-mayden-magenta/5 to-transparent" : ""
        }`}
      >
        <h1 className="text-2xl lg:text-3xl font-serif font-bold text-mayden-dark mb-1">
          {greeting()}, {user?.fullName?.split(" ")[0]}. Take a breath.
        </h1>
        <p className="text-sm text-gray-500">Your day starts here — one gentle minute at a time.</p>
      </div>

      {todayEpisode ? (
        <div
          id="hero-player"
          className={`mb-8 rounded-2xl border border-gray-100 bg-gradient-to-br ${dayTints[todayEpisode.dayType] || "from-white"} to-white p-6 shadow-sm lg:p-8`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-mayden-magenta/10 px-3 py-1 text-xs font-semibold text-mayden-magenta">
              {todayDayName}
            </span>
            <span className="text-xs text-gray-400">Today's episode</span>
          </div>
          <h2 className="mb-6 text-xl font-serif font-bold text-mayden-dark lg:text-2xl">{heroTitle}</h2>

          <AudioPlayer episode={todayEpisode} large />

          {todayEpisode.showNotes && (
            <div className="mt-6 rounded-xl bg-white/60 text-sm text-gray-600 leading-relaxed overflow-hidden transition-all duration-300">
              <div className={`${notesExpanded ? "" : "max-h-24"} relative`}>
                <div className="p-5" dangerouslySetInnerHTML={{ __html: todayEpisode.showNotes }} />
                {!notesExpanded && todayEpisode.showNotes.length > 200 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
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
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No episode for today yet. Check back soon!</p>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="mb-4 text-xl font-serif font-bold text-mayden-dark lg:text-2xl">The Vault</h2>

        <div className="mb-4 flex flex-wrap gap-2">
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

        {vaultSearch ? (
          <div className="space-y-3">
            {filteredEpisodes.map((ep) => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={scrollToHero} />
            ))}
            {filteredEpisodes.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No episodes match your search.</p>
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
                    <EpisodeCard key={ep.id} episode={ep} onPlay={scrollToHero} />
                  ))}
                </Carousel>
              );
            })}
            {episodes.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No episodes in the Vault yet.</p>
            )}
          </>
        )}
      </div>

      {subscription && subscription.status === "active" && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
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
          <a href="/subscription" className="text-xs font-medium text-mayden-magenta hover:underline">
            Manage
          </a>
        </div>
      )}

      <InstallBanner />
    </SubscriberLayout>
  );
}