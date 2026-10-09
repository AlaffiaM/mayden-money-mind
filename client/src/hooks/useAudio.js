import { useState, useRef, useCallback } from "react";

export function useAudio({ durationHint = 0 } = {}) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const play = () => {
    if (!audioRef.current) return;
    setError(null);
    setLoading(true);
    audioRef.current.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          setError("Press play again to start audio.");
        } else {
          setError("Unable to play audio. The file may be missing or the server is unavailable.");
        }
        setPlaying(false);
        setLoading(false);
      });
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlaying(false);
    setLoading(false);
  };

  const toggle = () => {
    if (!audioRef.current?.paused) {
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
      setDuration(Number.isFinite(d) ? d : durationHint);
      setError(null);
    }
  };

  const handlePlaying = () => {
    setPlaying(true);
    setLoading(false);
  };

  const handleWaiting = () => {
    if (audioRef.current && !audioRef.current.paused) setLoading(true);
  };

  const handleCanPlay = () => {
    if (audioRef.current?.paused) setLoading(false);
  };

  const handlePause = () => {
    setPlaying(false);
    setLoading(false);
  };

  const handleEnded = () => {
    setPlaying(false);
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setPlaying(false);
    setError("Could not load audio. Please check the episode has audio assigned.");
  };

  const seek = (time, maxDurationHint = durationHint) => {
    if (audioRef.current) {
      const maxDuration =
        Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0
          ? audioRef.current.duration
          : maxDurationHint || duration;
      const t = Math.min(Math.max(time, 0), maxDuration || time);
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const skip = useCallback((seconds) => {
    if (audioRef.current) {
      const maxDuration =
        Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0
          ? audioRef.current.duration
          : durationHint || duration;
      const newTime = Math.min(
        Math.max(audioRef.current.currentTime + seconds, 0),
        maxDuration || Infinity,
      );
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration, durationHint]);

  return {
    playing,
    loading,
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
    handlePlaying,
    handleWaiting,
    handleCanPlay,
    handlePause,
    handleEnded,
    handleError,
    seek,
    skip,
  };
}
