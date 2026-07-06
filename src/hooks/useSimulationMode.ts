import { useEffect, useState } from "react";

const KEY = "librepass-simulation-mode";
const EVT = "librepass:simulation-mode-changed";

export const getSimulationMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(KEY);
  return v === null ? false : v === "true"; // default OFF (live data)
};

export const setSimulationMode = (on: boolean) => {
  localStorage.setItem(KEY, String(on));
  window.dispatchEvent(new CustomEvent(EVT, { detail: on }));
};

export const useSimulationMode = (): [boolean, (v: boolean) => void] => {
  const [enabled, setEnabled] = useState<boolean>(getSimulationMode);
  useEffect(() => {
    const handler = (e: Event) => setEnabled((e as CustomEvent).detail);
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);
  return [enabled, (v: boolean) => { setSimulationMode(v); setEnabled(v); }];
};
