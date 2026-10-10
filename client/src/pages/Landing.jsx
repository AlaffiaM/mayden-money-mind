import {
  Sun,
  Target,
  Heart,
  Users,
  TrendingUp,
  Sparkles,
  Lock,
  Shield,
  Clock,
  ArrowRight,
  Radio,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LogoLockup from "../components/ui/LogoLockup";
import Button from "../components/ui/Button";
import AudioPlayer from "../components/ui/AudioPlayer";
import PricingCard from "../components/ui/PricingCard";
import FaqAccordion from "../components/ui/FaqAccordion";
import LoadError from "../components/ui/LoadError";
import { LANDING } from "../constants/copy";
import { usePricing } from "../hooks/usePricing";

const icons = { Sun, Target, Heart, Users, TrendingUp, Lock, Shield, Clock };

export default function Landing() {
  const navigate = useNavigate();
  const {
    pricing,
    dayLabels,
    loading: pricingLoading,
    error: pricingError,
    reload: reloadPricing,
  } = usePricing();

  const handleSubscribe = () => navigate("/register");
  const handlePlaySample = () =>
    document.getElementById("audio")?.scrollIntoView({ behavior: "smooth" });
  const createAccountLabel = LANDING.footer.newsletter.cta;

  return (
    <main className="relative min-h-screen bg-white pb-20 text-gray-800 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 px-4 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-3">
          <Link to="/" aria-label="Money & Mind home" className="shrink-0">
            <LogoLockup orientation="horizontal" />
          </Link>
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-7 sm:flex"
          >
            <a
              href="#audio"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-mayden-magenta"
            >
              Free sample
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-mayden-magenta"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-mayden-magenta"
            >
              Pricing
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-gray-600 transition-colors hover:text-mayden-magenta"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="rounded-full bg-mayden-magenta px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-mayden-magenta/20 transition-all hover:-translate-y-0.5 hover:bg-mayden-magenta/90 sm:px-5 sm:text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section
        className="relative isolate overflow-hidden bg-linear-to-br from-white via-[#fff7fa] to-[#fff0f6] px-4 py-9 sm:py-16 lg:min-h-[calc(100svh-4.5rem)] lg:py-20"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 82% 22%, rgba(236,38,143,0.11), transparent 36%), linear-gradient(135deg, #ffffff 0%, #fff7fa 60%, #fff0f6 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-mayden-magenta/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-rose-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="mx-auto mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-mayden-magenta/15 bg-white/80 px-3 py-2 text-[10px] font-semibold leading-4 text-mayden-magenta shadow-sm sm:mb-5 sm:px-3.5 sm:text-xs lg:mx-0">
              <Radio size={14} className="shrink-0" />
              <span>
                Mayden Microfinance Bank <span aria-hidden="true">×</span> Alaffia Media Ltd.
              </span>
            </p>
            <h1 className="text-[2.5rem] font-bold leading-[1.04] tracking-tighter text-mayden-dark sm:text-5xl lg:text-6xl">
              <span className="font-serif">{LANDING.hero.headlineBold}</span>{" "}
              <span className="font-serif font-medium text-gray-500">
                {LANDING.hero.headlineLight}
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-6 text-gray-600 sm:mt-6 sm:text-lg sm:leading-7 lg:mx-0">
              {LANDING.hero.subheadline}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6 lg:mx-0">
              Create a free account first, then choose your plan and payment
              method. Listening to the sample does not require an account.
            </p>
            <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center lg:justify-start">
              <Button
                onClick={handleSubscribe}
                pill
                className="shadow-xl shadow-mayden-magenta/25"
              >
                Create your free account
              </Button>
              <Button variant="outline" onClick={handlePlaySample} pill>
                {LANDING.hero.ctaPlay}
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2.5 sm:mt-8 sm:gap-x-5 sm:gap-y-3 lg:justify-start">
              {LANDING.hero.trust.map((item, i) => {
                const Icon = icons[item.icon] || Lock;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 sm:gap-2 sm:text-xs"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-mayden-magenta shadow-sm ring-1 ring-gray-100">
                      <Icon size={13} />
                    </span>
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white bg-white/85 p-3 shadow-[0_8px_24px_rgba(26,26,26,0.06)] lg:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mayden-pink-tint text-mayden-magenta">
              <Radio size={20} />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-mayden-dark">
                Five weekday themes
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                A fresh two-minute listen for your money and mind.
              </p>
            </div>
            <button
              onClick={handlePlaySample}
              className="shrink-0 rounded-lg bg-mayden-pink-tint px-3 py-2 text-[11px] font-semibold text-mayden-magenta transition-colors hover:bg-mayden-magenta/10"
            >
              Sample
            </button>
          </div>

          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-linear-to-br from-mayden-magenta/15 via-white/30 to-rose-200/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-4xl border border-white bg-white/90 p-6 shadow-[0_28px_80px_rgba(26,26,26,0.12)] backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-mayden-magenta">
                    A bank and media partnership
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-mayden-dark">
                    Small steps. A steadier you.
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mayden-pink-tint text-mayden-magenta">
                  <Heart size={21} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Short daily audio to support your financial confidence and
                wellbeing.
              </p>
              <div className="mt-7 space-y-2.5">
                {LANDING.blueprint.days.map((item) => {
                  const Icon = icons[item.icon] || Sun;
                  return (
                    <div
                      key={item.day}
                      className={`flex items-center gap-3 rounded-2xl border border-gray-100 px-3.5 py-3 ${item.tint}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/85 text-mayden-dark">
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {item.day}
                        </p>
                        <p className="truncate text-sm font-semibold text-mayden-dark">
                          {dayLabels[item.key] || item.day}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        2 min
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handlePlaySample}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mayden-dark px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-dark/90"
              >
                Listen to a free sample <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="audio" className="scroll-mt-24 bg-[#f7f7fa] px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Take a moment
          </p>
          <h2 className="mb-8 font-serif text-3xl font-bold text-mayden-dark lg:text-4xl">
            {LANDING.audio.headline}
          </h2>
          <div className="mx-auto max-w-xl rounded-3xl border border-gray-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(26,26,26,0.06)] lg:p-9">
            <p className="mb-1 text-base font-semibold text-mayden-dark">
              {LANDING.audio.title}
            </p>
            <p className="mb-6 text-xs text-gray-400">
              {LANDING.audio.subtitle}
            </p>
            <AudioPlayer
              src="/audio/Maiden Microfinance Bank MONDAY.mp3.mpeg"
              large
              runTimeSeconds={87}
            />
          </div>
          <Button
            onClick={handleSubscribe}
            pill
            className="mt-6"
          >
            {createAccountLabel}
          </Button>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-mayden-pink-tint text-mayden-magenta">
            <Sparkles size={24} />
          </div>
          <h2 className="mb-6 font-serif text-3xl font-bold text-mayden-dark lg:text-4xl">
            {LANDING.empathy.headline}
          </h2>
          <p
            className="mx-auto max-w-2xl text-lg leading-8 text-gray-600"
          >
            {LANDING.empathy.body}
          </p>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-[#f7f7fa] px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Simple by design
          </p>
          <h3 className="mb-9 text-center font-serif text-3xl font-bold text-mayden-dark">
            {LANDING.howItWorks.headline}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {LANDING.howItWorks.steps.map((step, i) => (
              <div
                key={i}
                className="relative rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-[0_2px_8px_rgba(26,26,26,0.03)] sm:p-6"
              >
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-mayden-pink-tint text-mayden-magenta">
                    <span className="text-lg font-bold">{step.step}</span>
                  </div>
                  <p className="text-sm font-bold text-mayden-dark">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="blueprint" className="bg-white px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Your week, at a glance
          </p>
          <h2 className="mb-10 text-center font-serif text-3xl font-bold text-mayden-dark lg:text-4xl">
            {LANDING.blueprint.headline}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {LANDING.blueprint.days.map((item) => {
              const Icon = icons[item.icon] || Sun;
              return (
                <div
                  key={item.day}
                  className={`min-w-40 max-w-55 flex-1 rounded-2xl border border-gray-200/70 p-6 text-center shadow-[0_2px_8px_rgba(26,26,26,0.03)] transition-all hover:-translate-y-1 hover:shadow-lg ${item.tint}`}
                >
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-mayden-dark">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-mayden-dark">
                    {dayLabels[item.key] || item.day}
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 lg:pb-24">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-mayden-magenta/10 bg-linear-to-br from-mayden-pink-tint/80 to-white p-7 text-center sm:p-10">
          <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-mayden-magenta">
            <Radio size={14} />
            Made together
          </span>
          <h2 className="mb-3 font-serif text-2xl font-bold text-mayden-dark sm:text-3xl">
            {LANDING.creators.headline}
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-gray-600">
            {LANDING.creators.body}
          </p>
        </div>
      </section>

      <section
        id="pricing"
        className="border-y border-gray-200/80 bg-[#f7f7fa] px-4 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Choose what works for you
          </p>
          <h2 className="mb-10 font-serif text-3xl font-bold text-mayden-dark lg:text-4xl">
            {LANDING.pricing.headline}
          </h2>
          {pricingError ? (
            <LoadError
              message="Current prices aren't available yet. The service may be waking up; please try again in a moment."
              onRetry={reloadPricing}
            />
          ) : pricingLoading ? (
            <p role="status" className="text-sm text-gray-500">
              Loading current plan prices…
            </p>
          ) : (
            <PricingCard
              plans={[
                {
                  label: "Weekly",
                  price: `₦${pricing.weeklyPrice}`,
                  period: "/week",
                },
                {
                  label: "Monthly",
                  price: `₦${pricing.monthlyPrice}`,
                  period: "/month",
                  badge: "Most Popular",
                  save: `Save ₦${parseInt(pricing.weeklyPrice) * 4 - parseInt(pricing.monthlyPrice)} vs. weekly`,
                },
              ]}
              note={LANDING.pricing.note}
              trust={LANDING.pricing.trust}
              included={LANDING.pricing.included}
            />
          )}
          <div className="mt-8">
            <Button
              pill
              className="text-lg px-12 py-4 w-full sm:w-auto"
              onClick={handleSubscribe}
            >
              {LANDING.pricing.cta}
            </Button>
          </div>
          <button
            onClick={handlePlaySample}
            className="mt-4 text-sm text-mayden-magenta hover:underline font-medium"
          >
            Not sure yet? Listen to a free sample
          </button>
        </div>
      </section>

      <section className="bg-white px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-mayden-magenta">
            Need to know
          </p>
          <h2 className="mb-8 text-center font-serif text-3xl font-bold text-mayden-dark">
            {LANDING.faq.headline}
          </h2>
          <FaqAccordion items={LANDING.faq.items} />
        </div>
      </section>

      <footer className="mt-0 border-t border-gray-200 bg-[#f7f7fa] px-4 pb-8 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 rounded-3xl border border-gray-200/80 bg-white p-7 text-center shadow-sm sm:p-9">
            <p className="mb-3 text-sm font-semibold text-mayden-dark">
              {LANDING.footer.newsletter.headline}
            </p>
            <Button
              onClick={handleSubscribe}
              pill
              className="px-7 py-2.5 text-sm lg:px-8 lg:py-3 lg:text-base"
            >
              {LANDING.footer.newsletter.cta}
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center mb-8">
            {LANDING.footer.delivery}
          </p>

          <div className="mb-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {LANDING.footer.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-500 hover:text-mayden-magenta transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-sm text-gray-400 text-center leading-relaxed">
            {LANDING.footer.copyright}
          </p>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden safe-area-bottom">
        <button
          onClick={handleSubscribe}
          className="w-full py-3 bg-mayden-magenta text-white rounded-xl font-semibold text-sm shadow-lg shadow-mayden-magenta/25 hover:bg-mayden-magenta/90 transition-colors"
        >
          Create a free account
        </button>
      </div>
    </main>
  );
}
