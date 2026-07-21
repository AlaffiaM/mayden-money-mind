// Audio player component with play/pause, seek, volume, and animated waveform
import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";

function Waveform({ playing }) {
  return (
    <div className={`flex items-center justify-center gap-[3px] h-8 ${playing ? "waveform-playing" : ""}`}>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="waveform-bar w-[3px] rounded-full bg-mayden-magenta/60"
          style={{ height: "6px" }}
        />
      ))}
    </div>
  );
}

function RadialPulse({ active }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="w-48 h-48 lg:w-64 lg:h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(236,38,143,0.15) 0%, rgba(236,38,143,0.05) 40%, transparent 70%)",
          animation: active ? "radial-pulse 4s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

export default function AudioPlayer({ src, title = "", subtitle = "", large = false, onPlayToggle, onPlayStart }) {
  const { playing, currentTime, duration, error, audioRef, toggle, handleTimeUpdate, handleLoadedMetadata, handleError, seek, skip } = useAudio();
  const [loading, setLoading] = useState(true);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleToggle = () => {
    toggle();
    if (!playing && onPlayStart) onPlayStart();
    if (onPlayToggle) onPlayToggle(!playing);
  };

  const handleCanPlay = () => setLoading(false);

  return (
    <div className={`${large ? "w-full" : "w-full"}`}>
      <audio
        ref={audioRef}
        src={src || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => { handleLoadedMetadata(e); setLoading(false); }}
        onError={(e) => { handleError(e); setLoading(false); }}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />
      {!src && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-600">No audio file assigned to this episode.</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-600">{error}</div>
      )}
      <div className={`${large ? "flex flex-col items-center" : "flex items-center gap-4"}`}>
        {large && <Waveform playing={playing} />}

        {/* Player controls with radial pulse */}
        <div className={`relative flex items-center ${large ? "my-4" : ""}`}>
          {large && <RadialPulse active={playing} />}

          <div className="relative z-10 flex items-center gap-3 lg:gap-4">
            {/* Skip Back */}
            {large && (
              <button
                onClick={() => skip(-15)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipBack size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">15</span>
              </button>
            )}

            {/* Play/Pause */}
            <button
              onClick={handleToggle}
              disabled={loading || !!error}
              className={`flex-shrink-0 rounded-full bg-mayden-magenta text-white hover:bg-mayden-magenta/90 hover:scale-105 transition-all shadow-lg shadow-mayden-magenta/25 disabled:opacity-50 disabled:cursor-not-allowed ${
                large ? "w-20 h-20 lg:w-[120px] lg:h-[120px]" : "w-12 h-12"
              } flex items-center justify-center`}
            >
              {loading ? (
                <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${large ? "w-8 h-8" : "w-5 h-5"}`} />
              ) : playing ? (
                <Pause size={large ? 36 : 20} />
              ) : (
                <Play size={large ? 36 : 20} className="ml-1" />
              )}
            </button>

            {/* Skip Forward */}
            {large && (
              <button
                onClick={() => skip(15)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipForward size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">15</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={`flex-1 ${large ? "w-full mt-2" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seek(pct * duration);
              }}
            >
              <div
                className="h-full bg-mayden-magenta rounded-full transition-all duration-150"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
