import { Suspense, lazy, useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { TopNav } from "./components/nav/TopNav";
import { BackButton } from "./components/ui/BackButton";
import { AboutPanel } from "./components/ui/AboutPanel";
import { ExperiencePanel } from "./components/ui/ExperiencePanel";
import { ProjectsPanel } from "./components/ui/ProjectsPanel";
import { SkillsPanel } from "./components/ui/SkillsPanel";
import { PowerliftingPanel } from "./components/ui/PowerliftingPanel";
import { WhiteboardPanel } from "./components/ui/WhiteboardPanel";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { TrophyPanel } from "./components/ui/TrophyPanel";
import { SceneFallback } from "./components/ui/SceneFallback";
import { SceneErrorBoundary } from "./components/SceneErrorBoundary";
import { trophies, BIO } from "./config/content";
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
  const sceneStatus = useSceneStore((s) => s.sceneStatus);
  const tier = useDeviceTier();

  // Keep the loading screen up for at least 600ms (so the brand frame doesn't
  // flicker) AND until the 3D scene reports a real first frame. A hard 8s cap
  // guarantees the loader never traps the user if the scene stalls.
  const [minimumDelayPassed, setMinimumDelayPassed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinimumDelayPassed(true), 600);
    const cap = setTimeout(() => setTimedOut(true), 8000);
    return () => {
      clearTimeout(t);
      clearTimeout(cap);
    };
  }, []);

  const sceneSettled = sceneStatus !== "loading" || timedOut;
  const showLoading = !(minimumDelayPassed && sceneSettled);
  const sceneFailed = sceneStatus === "error";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05080f]">
      {/* The page's accessible heading. The visible "content" is a 3D canvas,
          so this gives screen readers and crawlers a real document title. */}
      <h1 className="sr-only">
        {BIO.name} — {BIO.title}
      </h1>

      {/* 3D scene fills the viewport — own stacking context so drei <Html>
          overlays can never escape above the UI panels (which are z-20). On
          mobile, when a panel is open the scene is hidden entirely (the
          full-screen modal covers it) so we don't pay rendering cost for a
          covered scene. */}
      <div
        className="absolute inset-0 canvas-wrapper"
        style={{
          zIndex: 1,
          isolation: "isolate",
          visibility:
            tier === "mobile" && active !== "default" ? "hidden" : "visible",
        }}
      >
        <SceneErrorBoundary fallback={<SceneFallback />}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {/* UI overlay */}
      <TopNav />
      <BackButton />

      <AnimatePresence mode="wait">
        {active === "aboutFrames" && <AboutPanel key="about" />}
        {active === "experience" && <ExperiencePanel key="experience" />}
        {active === "projectsDesk" && <ProjectsPanel key="projects" />}
        {active === "skills" && <SkillsPanel key="skills" />}
        {active === "rack" && <PowerliftingPanel key="powerlifting" />}
        {active === "whiteboard" && <WhiteboardPanel key="whiteboard" />}
        {active === "sportsTrophy" && (
          <TrophyPanel key="sports-trophy" category={trophies.sports} />
        )}
        {active === "hackathonTrophy" && (
          <TrophyPanel key="hackathon-trophy" category={trophies.hackathons} />
        )}
      </AnimatePresence>

      {/* Helpful hint when in default view (desktop only, working 3D scene) */}
      {active === "default" && tier === "desktop" && !sceneFailed && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-gold/70 text-xs uppercase tracking-widest font-display pointer-events-none">
          click an object · or use the nav above
        </div>
      )}

      {/* Loading screen — dismisses once the scene reports ready (or times out)
          and the minimum brand delay has elapsed. */}
      <AnimatePresence>
        {showLoading && <LoadingScreen key="loading" />}
      </AnimatePresence>
    </div>
  );
}
