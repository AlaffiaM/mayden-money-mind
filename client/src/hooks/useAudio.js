import { useState, useRef, useCallback } from "react";

const FALLBACK_DURATION = 60;

export function useAudio() {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const play = () => {
    if (!audioRef.current) return;
    setError(null);
    audioRef.current.play().then(() => {
      setPlaying(true);
    }).catch((err) => {
      if (err?.name === "NotAllowedError") {
        setError("Press play again to start audio.");
      } else {
        setError("Unable to play audio. The file may be missing or the server is unavailable.");
      }
      setPlaying(false);
    });
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlaying(false);
  };

  const toggle = () => {
    if (playing) {
      pause();
    } else {
      play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (isFinite(t)) setCurrentTime(t);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(isFinite(d) ? d : FALLBACK_DURATION);
      setError(null);
    }
  };

  const handleError = () => {
    setDuration(FALLBACK_DURATION);
    setError("Could not load audio. Please check the episode has audio assigned.");
  };

  const seek = (time) => {
    if (audioRef.current) {
      const t = Math.min(Math.max(time, 0), duration);
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const skip = useCallback((seconds) => {
    if (audioRef.current) {
      const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  return {
    playing,
    currentTime,
    duration,
    error,
    setError,
    audioRef,
    play,
    pause,
    toggle,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleError,
    seek,
    skip,
  };
}
