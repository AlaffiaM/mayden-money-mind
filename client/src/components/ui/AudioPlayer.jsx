import { useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useAudio } from "../../hooks/useAudio";
import { usePlayer } from "../../context/usePlayer";
import { useToast } from "../admin/useToast";

function Waveform({ playing, loading = false }) {
  return (
    <div
      className={`flex h-8 items-center justify-center gap-[3px] ${
        playing ? "waveform-playing" : loading ? "waveform-loading" : ""
      }`}
    >
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="waveform-bar w-[3px] rounded-full bg-mayden-magenta/60"
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
          background:
            "radial-gradient(circle, rgba(236,38,143,0.15) 0%, rgba(236,38,143,0.05) 40%, transparent 70%)",
          animation: active ? "radial-pulse 4s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

const formatTime = (s) => {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const preventSave = (e) => e.preventDefault();

function GlobalPlayer({ episode, large = false }) {
  const {
    playing,
    current,
    duration,
    loading,
    buffering,
    fetching,
    episode: activeEp,
    playEpisode,
    toggle,
    seek,
    skip,
  } = usePlayer();

  const isActive = activeEp?.id === episode.id;
  const isPlaying = isActive && playing;
  const isBuffering = loading || (isActive && buffering);
  const displayDuration = isActive
    ? duration || episode?.runTimeSeconds || 0
    : episode?.runTimeSeconds || 0;

  const handleToggle = () => {
    if (!isActive) playEpisode(episode);
    else toggle();
  };

  return (
    <div
      className="w-full select-none"
      onContextMenu={preventSave}
      onDragStart={preventSave}
    >
      <div
        className={
          large ? "flex flex-col items-center" : "flex items-center gap-4"
        }
      >
        {large && (
          <div className="flex flex-col items-center">
            <Waveform playing={isPlaying && !isBuffering} loading={isBuffering} />
            <p role="status" aria-live="polite" className="text-xs text-gray-500">
              {isBuffering
                ? "Buffering audio…"
                : isPlaying
                  ? "Now playing"
                  : ""}
            </p>
          </div>
        )}

        <div className={`relative flex items-center ${large ? "my-4" : ""}`}>
          {large && <RadialPulse active={isPlaying} />}

          <div className="relative z-10 flex items-center gap-3 lg:gap-4">
            {large && (
              <button
                onClick={() => skip(-15)}
                disabled={!isActive}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipBack size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">
                  15
                </span>
              </button>
            )}

            <button
              onClick={handleToggle}
              disabled={fetching}
              aria-label={
                isBuffering
                  ? "Buffering audio"
                  : isPlaying
                    ? "Pause audio"
                    : "Play audio"
              }
              className={`flex-shrink-0 rounded-full bg-mayden-magenta text-white hover:bg-mayden-magenta/90 hover:scale-105 transition-all shadow-lg shadow-mayden-magenta/25 disabled:opacity-50 disabled:cursor-not-allowed ${
                large ? "w-20 h-20 lg:w-[120px] lg:h-[120px]" : "w-12 h-12"
              } flex items-center justify-center`}
            >
              {isBuffering ? (
                <div
                  className={`border-2 border-white border-t-transparent rounded-full animate-spin ${large ? "w-8 h-8" : "w-5 h-5"}`}
                />
              ) : isPlaying ? (
                <Pause size={large ? 36 : 20} />
              ) : (
                <Play size={large ? 36 : 20} className="ml-1" />
              )}
            </button>

            {large && (
              <button
                onClick={() => skip(15)}
                disabled={!isActive}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipForward size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">
                  15
                </span>
              </button>
            )}
          </div>
        </div>

        <div className={`flex-1 ${large ? "w-full mt-2" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
              {formatTime(isActive ? current : 0)}
            </span>
            <div
              className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width),
                );
                seek(pct * displayDuration, displayDuration);
              }}
            >
              <div
                className="h-full bg-mayden-magenta rounded-full transition-all duration-150"
                style={{
                  width: `${
                    displayDuration > 0
                      ? ((isActive ? current : 0) / displayDuration) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 tabular-nums">
              {formatTime(isActive ? displayDuration : 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerWithSrc({ src, large = false, runTimeSeconds = 0 }) {
  const toast = useToast();
  const {
    playing,
    currentTime,
    duration,
    loading,
    error,
    audioRef,
    toggle,
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePlaying,
    handleWaiting,
    handleCanPlay,
    handlePause,
    handleEnded,
    handleError,
    seek,
    skip,
  } = useAudio({ durationHint: runTimeSeconds });

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const handleToggle = () => {
    if (!audioRef.current) return;
    toggle();
  };

  return (
    <div
      className="w-full select-none"
      onContextMenu={preventSave}
      onDragStart={preventSave}
    >
      <audio
        ref={audioRef}
        src={src || undefined}
        controlsList="nodownload"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlaying={handlePlaying}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />
      <div
        className={
          large ? "flex flex-col items-center" : "flex items-center gap-4"
        }
      >
        {large && (
          <div className="flex flex-col items-center">
            <Waveform playing={playing && !loading} loading={loading} />
            <p role="status" aria-live="polite" className="text-xs text-gray-500">
              {loading ? "Buffering audio…" : playing ? "Now playing" : ""}
            </p>
          </div>
        )}

        <div className={`relative flex items-center ${large ? "my-4" : ""}`}>
          {large && <RadialPulse active={playing} />}

          <div className="relative z-10 flex items-center gap-3 lg:gap-4">
            {large && (
              <button
                onClick={() => skip(-15)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipBack size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">
                  15
                </span>
              </button>
            )}

            <button
              onClick={handleToggle}
              aria-label={loading ? "Buffering audio" : playing ? "Pause audio" : "Play audio"}
              className={`flex-shrink-0 rounded-full bg-mayden-magenta text-white hover:bg-mayden-magenta/90 hover:scale-105 transition-all shadow-lg shadow-mayden-magenta/25 ${
                large ? "w-20 h-20 lg:w-[120px] lg:h-[120px]" : "w-12 h-12"
              } flex items-center justify-center`}
            >
              {loading ? (
                <div
                  className={`border-2 border-white border-t-transparent rounded-full animate-spin ${large ? "w-8 h-8" : "w-5 h-5"}`}
                />
              ) : playing ? (
                <Pause size={large ? 36 : 20} />
              ) : (
                <Play size={large ? 36 : 20} className="ml-1" />
              )}
            </button>

            {large && (
              <button
                onClick={() => skip(15)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-mayden-magenta hover:border-mayden-magenta/30 transition-all flex items-center justify-center shadow-sm"
              >
                <SkipForward size={18} />
                <span className="absolute -bottom-0.5 text-[8px] font-bold text-gray-400">
                  15
                </span>
              </button>
            )}
          </div>
        </div>

        <div className={`flex-1 ${large ? "w-full mt-2" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width),
                );
                seek(pct * (duration || runTimeSeconds));
              }}
            >
              <div
                className="h-full bg-mayden-magenta rounded-full transition-all duration-150"
                style={{
                  width: `${
                    (duration || runTimeSeconds) > 0
                      ? (currentTime / (duration || runTimeSeconds)) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 tabular-nums">
              {formatTime(duration || runTimeSeconds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AudioPlayer({
  episode,
  src,
  large = false,
  runTimeSeconds = 0,
}) {
  if (episode) return <GlobalPlayer episode={episode} large={large} />;
  return (
    <PlayerWithSrc
      src={src}
      large={large}
      runTimeSeconds={runTimeSeconds}
    />
  );
}
