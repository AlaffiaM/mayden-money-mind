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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    <main className="min-h-screen bg-white text-gray-800 relative pb-20 sm:pb-0">
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
          <nav
            aria-label="Page sections"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
          >
            <a
              href="#audio"
              className="text-xs sm:text-sm text-gray-500 hover:text-mayden-magenta transition-colors font-medium"
            >
              Free sample
            </a>
            <a
              href="#how-it-works"
              className="text-xs sm:text-sm text-gray-500 hover:text-mayden-magenta transition-colors font-medium"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-xs sm:text-sm text-gray-500 hover:text-mayden-magenta transition-colors font-medium"
            >
              Pricing
            </a>
          </nav>
          <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-500 hover:text-mayden-magenta transition-colors font-medium"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm px-4 py-2 rounded-full bg-mayden-magenta text-white font-semibold hover:bg-mayden-magenta/90 transition-colors"
          >
            Get Started
          </button>
          </div>
        </div>
      </div>

      <section
        className="relative overflow-hidden min-h-screen flex items-center px-4 py-20 lg:py-24"
        style={{
          background:
            "linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 30%, #FFF5F8 60%, #FFF5F8 80%, #FFFFFF 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
          >
            <path
              d="M0,500 C360,200 720,700 1440,400 L1440,900 L0,900 Z"
              fill="#EC268F"
            />
            <path
              d="M0,600 C240,400 600,800 1440,500 L1440,900 L0,900 Z"
              fill="#EC268F"
              opacity="0.6"
            />
          </svg>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <LogoLockup className="mb-8" />
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-serif leading-tight mb-4">
            <span className="font-extrabold text-mayden-dark">
              {LANDING.hero.headlineBold}
            </span>{" "}
            <span className="font-semibold text-gray-600">
              {LANDING.hero.headlineLight}
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 leading-relaxed">
            {LANDING.hero.subheadline}
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Create a free account first, then choose your plan and payment
            method. Listening to the sample does not require an account.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 mb-10">
            {LANDING.hero.trust.map((item, i) => {
              const Icon = icons[item.icon] || Lock;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs text-gray-500"
                >
                  <Icon size={14} className="text-mayden-magenta" />
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={handleSubscribe}
              pill
              className="shadow-xl shadow-mayden-magenta/30"
            >
              Create your free account
            </Button>
            <Button variant="outline" onClick={handlePlaySample} pill>
              {LANDING.hero.ctaPlay}
            </Button>
          </div>
        </div>
      </section>

      <section id="audio" className="bg-gray-50 px-4 py-16 lg:py-20 scroll-mt-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-mayden-dark mb-8">
            {LANDING.audio.headline}
          </h2>
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-mayden-dark mb-1">
              {LANDING.audio.title}
            </p>
            <p className="text-xs text-gray-400 mb-6">
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

      <section className="bg-gray-50 border-t border-gray-100 px-4 py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-mayden-magenta/10 text-mayden-magenta flex items-center justify-center mx-auto mb-6">
            <Sparkles size={24} />
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-mayden-dark mb-6">
            {LANDING.empathy.headline}
          </h2>
          <p
            className="text-gray-700 leading-relaxed text-lg max-w-2xl mx-auto"
            style={{ lineHeight: "1.7" }}
          >
            {LANDING.empathy.body}
          </p>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-4 py-12 lg:py-16 scroll-mt-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">
            {LANDING.howItWorks.headline}
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0">
            {LANDING.howItWorks.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4 sm:gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-mayden-magenta/10 text-mayden-magenta flex items-center justify-center mb-2">
                    <span className="text-lg font-bold">{step.step}</span>
                  </div>
                  <p className="text-sm font-semibold text-mayden-dark">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {i < LANDING.howItWorks.steps.length - 1 && (
                  <ArrowRight
                    size={20}
                    className="text-gray-300 flex-shrink-0 hidden sm:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="blueprint" className="bg-white px-4 py-16 lg:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-mayden-dark text-center mb-12">
            {LANDING.blueprint.headline}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {LANDING.blueprint.days.map((item) => {
              const Icon = icons[item.icon] || Sun;
              return (
                <div
                  key={item.day}
                  className={`flex-1 min-w-[160px] max-w-[220px] rounded-xl p-6 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all text-center ${item.tint}`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/80 text-mayden-dark flex items-center justify-center mx-auto mb-3">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-mayden-dark text-sm mb-2">
                    {dayLabels[item.key] || item.day}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 lg:pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-mayden-pink-tint/30 p-6 text-center sm:p-8">
          <h2 className="mb-3 text-2xl font-serif font-bold text-mayden-dark">
            {LANDING.creators.headline}
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-600">
            {LANDING.creators.body}
          </p>
        </div>
      </section>

      <section
        id="pricing"
        className="bg-gray-50 border-t border-gray-100 px-4 py-16 lg:py-20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-mayden-dark mb-10">
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

      <section className="bg-white px-4 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-serif font-bold text-mayden-dark text-center mb-8">
            {LANDING.faq.headline}
          </h2>
          <FaqAccordion items={LANDING.faq.items} />
        </div>
      </section>

      <footer className="bg-gray-50 border-t border-gray-200 px-4 pt-12 pb-8 mt-0">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center">
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

          <div className="flex flex-wrap justify-center gap-8 mb-8">
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

      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
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
