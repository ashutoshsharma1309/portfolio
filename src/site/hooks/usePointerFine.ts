import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/** True on devices with a precise, hover-capable pointer (mouse / trackpad).
 *  Hover-only effects (tilt, magnetic pull, cursor glow) gate on this so touch
 *  devices never get stuck or hidden states. */
export function usePointerFine(): boolean {
  const [fine, setFine] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setFine(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return fine;
}
