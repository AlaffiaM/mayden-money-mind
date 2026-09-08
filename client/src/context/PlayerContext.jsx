import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import { useAudio } from "../hooks/useAudio";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const {
    audioRef,
    playing,
    currentTime,
    duration,
    error,
    setError,
    play,
    pause,
    toggle,
    seek,
    skip,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleError,
  } = useAudio();

  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef(null);
  const loggedRef = useRef({});

  const stopAndClear = useCallback(() => {
    pause();
    if (audioRef.current) {
      audioRef.current.removeAttribute("src");
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setEpisode(null);
  }, [audioRef, pause]);

  useEffect(() => {
    if (!user) stopAndClear();
  }, [user, stopAndClear]);

  const playEpisode = useCallback(
    async (ep) => {
      if (!ep) return;
      setError(null);

      if (episode?.id === ep.id && blobUrlRef.current) {
        play();
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.post(`/episodes/${ep.id}/stream`);
        if (!data?.url) throw new Error("No stream url");
        const resp = await fetch(data.url);
        if (!resp.ok) throw new Error("Stream fetch failed");
        const blob = new Blob([await resp.arrayBuffer()], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = url;

        if (audioRef.current) audioRef.current.src = url;
        setEpisode(ep);
        setLoading(false);
        play();

        if (!loggedRef.current[ep.id]) {
          loggedRef.current[ep.id] = true;
          api.post(`/episodes/${ep.id}/listen`).catch(() => {});
        }
      } catch (err) {
        setLoading(false);
        if (err?.response?.status === 403) {
          setError("Active subscription required — renew your subscription to play.");
        } else if (err?.response?.status === 404) {
          setError("This episode's audio is not available yet.");
        } else if (err?.response?.status === 401) {
          setError("Please log in to play this episode.");
        } else {
          setError("Could not load audio. Please check your connection and try again.");
        }
      }
    },
    [audioRef, episode, play, setError]
  );

  return (
    <PlayerContext.Provider
      value={{
        episode,
        playing,
        current: currentTime,
        duration,
        error,
        loading,
        setError,
        playEpisode,
        toggle,
        seek,
        skip,
        close: stopAndClear,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        preload="none"
        controlsList="nodownload"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          handleLoadedMetadata(e);
          setLoading(false);
        }}
        onError={handleError}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}