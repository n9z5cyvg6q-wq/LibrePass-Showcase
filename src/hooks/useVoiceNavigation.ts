import { useEffect, useRef, useState, useCallback } from "react";
import { getDistanceMeters } from "@/hooks/useUserLocation";
import type { RouteStep } from "@/hooks/useUserLocation";
import { haptic } from "@/hooks/useNotificationPrefs";

const ANNOUNCE_DISTANCE = 50; // meters before a maneuver to announce

interface UseVoiceNavigationProps {
  steps: RouteStep[];
  userLocation: { lat: number; lng: number } | null;
  active: boolean;
  /** Cumulative coordinates per step so we know where each maneuver happens */
  stepCoordinates?: [number, number][];
}

/**
 * Speaks turn-by-turn instructions as the user approaches each maneuver.
 * Uses the browser Web Speech API — no external service needed.
 */
export const useVoiceNavigation = ({
  steps,
  userLocation,
  active,
  stepCoordinates,
}: UseVoiceNavigationProps) => {
  const [muted, setMuted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const spokenSteps = useRef<Set<number>>(new Set());

  const speak = useCallback(
    (text: string) => {
      if (muted || !("speechSynthesis" in window)) return;
      // Cancel any queued utterances so instructions don't pile up
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.volume = 1;
      // Try to pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    },
    [muted]
  );

  // Announce first instruction when navigation starts
  useEffect(() => {
    if (!active || steps.length === 0) return;
    spokenSteps.current = new Set();
    setCurrentStepIndex(0);
    // Small delay so the UI has rendered
    const t = setTimeout(() => {
      if (!muted && steps[0]?.instruction) {
        speak(steps[0].instruction);
        spokenSteps.current.add(0);
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, steps]);

  // Track user position and announce upcoming steps
  useEffect(() => {
    if (!active || !userLocation || !stepCoordinates || stepCoordinates.length === 0) return;

    // Find the nearest upcoming step
    for (let i = currentStepIndex; i < stepCoordinates.length; i++) {
      const [lng, lat] = stepCoordinates[i];
      const dist = getDistanceMeters(userLocation.lat, userLocation.lng, lat, lng);

      if (dist < ANNOUNCE_DISTANCE && !spokenSteps.current.has(i)) {
        spokenSteps.current.add(i);
        setCurrentStepIndex(i);
        if (steps[i]?.instruction) {
          speak(steps[i].instruction);
        }
        haptic(20);
        break;
      }
    }
  }, [active, userLocation, stepCoordinates, steps, currentStepIndex, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) window.speechSynthesis?.cancel();
      return !prev;
    });
  }, []);

  // Manual replay of current instruction
  const replayCurrentStep = useCallback(() => {
    if (steps[currentStepIndex]?.instruction) {
      speak(steps[currentStepIndex].instruction);
    }
  }, [steps, currentStepIndex, speak]);

  return { muted, toggleMute, currentStepIndex, replayCurrentStep };
};
