import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import { usePlayer } from "../context/usePlayer";
import api from "../services/api";
import AudioPlayer from "../components/ui/AudioPlayer";
import Carousel from "../components/ui/Carousel";
import EpisodeCard from "../components/ui/EpisodeCard";
import InstallBanner from "../components/ui/InstallBanner";
import SubscriberLayout from "../components/layout/SubscriberLayout";
import { usePricing } from "../hooks/usePricing";
import { ChevronDown, ChevronUp, CreditCard, Calendar } from "lucide-react";
import { businessDayOfWeek } from "../utils/businessTime.js";

const moodTags = [
  { label: "I want focus", query: "monday" },
  { label: "I want to save", query: "tuesday" },
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

const businessWeekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  const {
    pricing,
    loading: pricingLoading,
    error: pricingError,
    reload: reloadPricing,
  } = usePricing();
  const { episode: activeEp, playing: anyPlaying } = usePlayer();
  const [todayEpisode, setTodayEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [vaultSearch, setVaultSearch] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    api
      .get("/episodes/today")
      .then(({ data }) => setTodayEpisode(data))
      .catch(() => {});
    api
      .get("/episodes/library")
      .then(({ data }) => setEpisodes(data))
      .catch(() => {});
  }, []);

  const filteredEpisodes = vaultSearch
    ? episodes.filter(
        (ep) => ep.dayType?.toLowerCase() === vaultSearch.toLowerCase(),
      )
    : episodes;

  const todayDayName =
    dayNames[todayEpisode?.dayType] ||
    businessWeekdayNames[businessDayOfWeek(new Date())];
  const heroTitle = todayEpisode
    ? `Today: ${todayDayName} – ${todayEpisode.title}`
    : "";
  const isTodayPlaying =
    todayEpisode && activeEp?.id === todayEpisode.id && anyPlaying;

  const scrollToHero = () =>
    document
      .getElementById("hero-player")
      ?.scrollIntoView({ behavior: "smooth" });

  return (
    <SubscriberLayout>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Your listening space
          </p>
          <h1 className="font-serif text-2xl font-bold tracking-[-0.03em] text-mayden-dark sm:text-3xl">
            {greeting()}, {user?.fullName?.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
          Your gentle reset starts here — two thoughtful minutes at a time.
          </p>
        </div>
        {subscription?.status === "active" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Membership active
          </div>
        )}
      </div>

      {todayEpisode ? (
        <div
          id="hero-player"
          className={`relative mb-8 overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-linear-to-br ${dayTints[todayEpisode.dayType] || "from-white"} to-white p-5 shadow-[0_8px_32px_rgba(26,26,26,0.05)] transition-all duration-500 sm:p-7 lg:p-9 ${
            isTodayPlaying ? "ring-2 ring-mayden-magenta/15" : ""
          }`}
        >
          <div className="relative z-10 mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-mayden-magenta shadow-sm">
              {todayDayName}
            </span>
            <span className="text-xs font-medium text-gray-500">Today’s focus</span>
          </div>
          <h2 className="relative z-10 mb-6 max-w-3xl font-serif text-xl font-bold tracking-[-0.02em] text-mayden-dark sm:text-2xl lg:text-3xl">
            {heroTitle}
          </h2>

          <div className="relative z-10 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-6">
            <AudioPlayer episode={todayEpisode} large />
          </div>

          {todayEpisode.showNotes && (
            <div className="relative z-10 mt-5 overflow-hidden rounded-2xl border border-white/80 bg-white/65 text-sm leading-relaxed text-gray-600 transition-all duration-300">
              <div className={`${notesExpanded ? "" : "max-h-24"} relative`}>
                <div
                  className="p-5"
                  dangerouslySetInnerHTML={{ __html: todayEpisode.showNotes }}
                />
                {!notesExpanded && todayEpisode.showNotes.length > 200 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white to-transparent" />
                )}
              </div>
              {todayEpisode.showNotes.length > 200 && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 px-5 pb-4 text-xs font-medium text-mayden-magenta hover:underline"
                >
                  {notesExpanded ? (
                    <>
                      Show less <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-mayden-dark">
            Your next gentle reset is on the way.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            A fresh episode will appear here soon.
          </p>
        </div>
      )}

      <div className="mb-8 rounded-[1.75rem] border border-gray-200/80 bg-white p-5 shadow-[0_4px_18px_rgba(26,26,26,0.04)] sm:p-7 lg:p-8">
        <div className="mb-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-mayden-magenta">
            Explore more
          </p>
          <h2 className="font-serif text-xl font-bold text-mayden-dark lg:text-2xl">
            The Vault
          </h2>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {moodTags.map((tag) => (
            <button
              key={tag.label}
              onClick={() =>
                setVaultSearch(vaultSearch === tag.query ? "" : tag.query)
              }
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
              <p className="text-center text-sm text-gray-500 py-8">
                No episodes match that mood right now. Try another theme.
              </p>
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
                      onPlay={scrollToHero}
                    />
                  ))}
                </Carousel>
              );
            })}
            {episodes.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">
                Your vault is empty right now. New recordings will appear here
                soon.
              </p>
            )}
          </>
        )}
      </div>

      {subscription && subscription.status === "active" && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_4px_18px_rgba(26,26,26,0.04)]">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200/80">
              <CreditCard size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-mayden-dark">
                Active –{" "}
                {pricingError
                  ? "Current price unavailable"
                  : pricingLoading
                  ? "Loading current price…"
                  : subscription.plan === "weekly"
                  ? `₦${pricing.weeklyPrice}/Weekly`
                  : `₦${pricing.monthlyPrice}/Monthly`}
              </p>
              {pricingError && (
                <button
                  onClick={reloadPricing}
                  className="mt-1 text-xs text-mayden-magenta hover:underline"
                >
                  Retry loading price
                </button>
              )}
              {pricingLoading && (
                <p role="status" className="mt-1 text-xs text-gray-500">
                  Loading current price…
                </p>
              )}
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={11} />
                Next renewal:{" "}
                {new Date(subscription.nextRenewal).toLocaleDateString()}
              </div>
            </div>
          </div>
          <a
            href="/subscription"
            className="text-xs font-medium text-mayden-magenta transition-colors hover:text-mayden-magenta/80"
          >
            Manage
          </a>
        </div>
      )}

      <InstallBanner />
    </SubscriberLayout>
  );
}
