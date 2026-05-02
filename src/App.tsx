import { Suspense, lazy, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { TopNav } from "./components/nav/TopNav";
import { BackButton } from "./components/ui/BackButton";
import { AboutPanel } from "./components/ui/AboutPanel";
import { ProjectsPanel } from "./components/ui/ProjectsPanel";
import { PowerliftingPanel } from "./components/ui/PowerliftingPanel";
import { WhiteboardPanel } from "./components/ui/WhiteboardPanel";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { TrophyPanel } from "./components/ui/TrophyPanel";
import { trophies } from "./config/content";
import { useSceneStore } from "./store/useSceneStore";
import { useDeviceTier } from "./hooks/useDeviceTier";

// Code-split the heavy 3D bundle so users on slow connections see the
// loading screen + nav shell first, while three.js / drei load in the
// background.
const Scene = lazy(() =>
  import("./components/scene/Scene").then((m) => ({ default: m.Scene })),
);

export default function App() {
  const active = useSceneStore((s) => s.activeHotspot);
  const tier = useDeviceTier();

  // Keep the loading screen up for at least 600ms so users on fast
  // connections still see the brand frame instead of a flicker.
  const [minimumDelayPassed, setMinimumDelayPassed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinimumDelayPassed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05080f]">
      {/* 3D scene fills the viewport — own stacking context so drei <Html>
          overlays can never escape above the UI panels (which are z-20). On
          mobile, when a panel is open the scene is hidden entirely (the
          full-screen modal covers it) so we hide it from rendering too. */}
      <div
        className="absolute inset-0 canvas-wrapper"
        style={{
          zIndex: 1,
          isolation: "isolate",
          // On mobile, fully hide the 3D layer when a panel is open so we
          // don't pay rendering cost for a covered scene.
          visibility:
            tier === "mobile" && active !== "default" ? "hidden" : "visible",
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>

      {/* UI overlay */}
      <TopNav />
      <BackButton />

      <AnimatePresence mode="wait">
        {active === "aboutFrames" && <AboutPanel key="about" />}
        {active === "projectsDesk" && <ProjectsPanel key="projects" />}
        {active === "rack" && <PowerliftingPanel key="powerlifting" />}
        {active === "whiteboard" && <WhiteboardPanel key="whiteboard" />}
        {active === "sportsTrophy" && (
          <TrophyPanel key="sports-trophy" category={trophies.sports} />
        )}
        {active === "hackathonTrophy" && (
          <TrophyPanel key="hackathon-trophy" category={trophies.hackathons} />
        )}
      </AnimatePresence>

      {/* Helpful hint when in default view (desktop only) */}
      {active === "default" && tier === "desktop" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-gold/70 text-xs uppercase tracking-widest font-display pointer-events-none">
          click an object · or use the nav above
        </div>
      )}

      {/* Loading screen — auto-dismisses once the scene chunk has resolved
          and the minimum delay has elapsed. */}
      <AnimatePresence>
        {!minimumDelayPassed && <LoadingScreen key="loading" />}
      </AnimatePresence>
    </div>
  );
}
