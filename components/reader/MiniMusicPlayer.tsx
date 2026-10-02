"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AudioTrack } from "./audioPlayer";
import { getComicAssetUrl } from "./readerUtils";

/**
 * Parses title and artist from track or derives them automatically from the filename
 */
export function parseTrackMeta(track: AudioTrack) {
  let title = track.title;
  let artist = track.artist;

  if (!title || !artist) {
    const rawFileName = track.src.split("/").pop() || "";
    // Clean extension and URL parameters
    let cleanName = decodeURIComponent(rawFileName.split("?")[0]).replace(/\.[^/.]+$/, "");

    // Strip common clutter (e.g. (Lyrics), (Official Audio), -Trimmed by FlexClip, etc.)
    cleanName = cleanName
      .replace(/-Trimmed by FlexClip/gi, "")
      .replace(/\s*[\(\[](Official Audio|Official Video|OFFICIAL INSTRUMENTAL|Instrumental|Lyrics|Audio|FULL|Kendrick Diss|saturado|BassBoosted)[\)\]]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanName.includes(" - ")) {
      const parts = cleanName.split(" - ");
      if (!artist) artist = parts[0].trim();
      if (!title) title = parts.slice(1).join(" - ").trim();
    } else {
      if (!title) title = cleanName;
      if (!artist) artist = "Música";
    }
  }

  return { title, artist };
}

interface MiniMusicPlayerProps {
  track: AudioTrack | null;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

/**
 * MiniMusicPlayer Component
 * Displays a floating music badge when a song plays, complying with:
 * 1. Only displays for audio tracks longer than 1 minute (> 60 seconds).
 * 2. Only stays visible for the first 5 seconds after song start, then slides away.
 * 3. Animated entrance coming from left (x: -150 -> 0), and exit sliding back out to the left (0 -> -150).
 */
export function MiniMusicPlayer({ track, paused, onPause, onResume }: MiniMusicPlayerProps) {
  const [duration, setDuration] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 1. Determine duration of the active music track
  useEffect(() => {
    if (!track?.src || track.layer !== "music") {
      setDuration(null);
      setIsVisible(false);
      return;
    }

    let isMounted = true;
    const audio = new Audio(getComicAssetUrl(track.src));

    const checkDuration = () => {
      if (!isMounted) return;
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    if (audio.readyState >= 1) {
      checkDuration();
    } else {
      audio.addEventListener("loadedmetadata", checkDuration, { once: true });
    }

    return () => {
      isMounted = false;
      audio.removeEventListener("loadedmetadata", checkDuration);
    };
  }, [track?.id, track?.src, track?.layer]);

  // 2. Control 5-second auto-hide timer ONLY if duration >= 60 seconds
  useEffect(() => {
    if (!track || track.layer !== "music") {
      setIsVisible(false);
      return;
    }

    if (duration !== null && duration >= 60) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else if (duration !== null && duration < 60) {
      setIsVisible(false);
    }
  }, [track?.id, duration]);

  const shouldShow = Boolean(track && track.layer === "music" && isVisible && duration && duration >= 60);

  return (
    <AnimatePresence>
      {shouldShow && track && (
        <motion.div
          key={track.id}
          initial={{ opacity: 0, x: -150 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -150 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="fixed top-16 left-4 sm:left-6 z-[180] select-none"
        >
          <div className="bg-[#0b0b12]/95 backdrop-blur-xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.75)] rounded-full px-3.5 py-1.5 flex items-center gap-2.5 max-w-[90vw] sm:max-w-md">
            {/* Spinning/Pulsing Vinyl Art Badge with Equalizer */}
            <div className="relative w-7 h-7 shrink-0 rounded-full bg-gradient-to-tr from-purple-900 via-indigo-900 to-rose-900 border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
              {/* Equalizer Animated Bars */}
              <div className="flex items-end justify-center gap-0.5 w-full h-full p-1.5">
                <motion.span
                  animate={{ height: ["30%", "100%", "40%", "80%", "30%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-0.5 bg-rose-400 rounded-full"
                />
                <motion.span
                  animate={{ height: ["80%", "30%", "90%", "20%", "80%"] }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                  className="w-0.5 bg-purple-300 rounded-full"
                />
                <motion.span
                  animate={{ height: ["40%", "90%", "20%", "100%", "40%"] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                  className="w-0.5 bg-cyan-400 rounded-full"
                />
              </div>
            </div>

            {/* Track Metadata (Title & Artist) */}
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[11px] font-bold text-white leading-tight truncate font-sans tracking-wide">
                {parseTrackMeta(track).title}
              </span>
              <span className="text-[9px] font-medium text-zinc-400 leading-tight truncate font-sans">
                {parseTrackMeta(track).artist}
              </span>
            </div>
            <button
              type="button"
              onClick={() => (paused ? onResume?.() : onPause?.())}
              className="ml-1 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold pointer-events-auto"
            >
              {paused ? "▶" : "⏸"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
