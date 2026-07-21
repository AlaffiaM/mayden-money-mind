// Hook: audio player controls — play/pause toggle, seek, skip, time tracking
// Returns refs and handlers to wire up an <audio> element in any component
import { useState, useRef, useCallback } from "react";

const FALLBACK_DURATION = 60;

export function useAudio() {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  // Toggle play/pause on the audio element
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setError(null);
      audioRef.current.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setError("Unable to play audio. The file may be missing or the server is unavailable.");
        setPlaying(false);
      });
    }
  };

  // Sync current time state on audio time update events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      if (isFinite(t)) setCurrentTime(t);
    }
  };

  // Set duration once audio metadata loads (fallback to 60s on error)
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(isFinite(d) ? d : FALLBACK_DURATION);
      setError(null);
    }
  };

  // Handle audio load errors — surface the error to the UI
  const handleError = () => {
    setDuration(FALLBACK_DURATION);
    setError("Could not load audio. Please check the episode has audio assigned.");
  };

  // Jump to an absolute time position within the track
  const seek = (time) => {
    if (audioRef.current) {
      const t = Math.min(Math.max(time, 0), duration);
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  // Skip forward or backward by a number of seconds (e.g. ±15s)
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
    audioRef,
    toggle,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleError,
    seek,
    skip,
  };
}
