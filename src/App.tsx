import { AnimatePresence } from "framer-motion";
import { Scene } from "./components/scene/Scene";
import { TopNav } from "./components/nav/TopNav";
import { BackButton } from "./components/ui/BackButton";
import { AboutPanel } from "./components/ui/AboutPanel";
import { ProjectsPanel } from "./components/ui/ProjectsPanel";
import { PowerliftingPanel } from "./components/ui/PowerliftingPanel";
import { WhiteboardPanel } from "./components/ui/WhiteboardPanel";
import { useSceneStore } from "./store/useSceneStore";

export default function App() {
  const active = useSceneStore((s) => s.activeHotspot);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05080f]">
      {/* 3D scene fills the viewport — own stacking context so drei <Html>
          overlays can never escape above the UI panels (which are z-20). */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 1, isolation: "isolate" }}
      >
        <Scene />
      </div>

      {/* UI overlay */}
      <TopNav />
      <BackButton />

      <AnimatePresence mode="wait">
        {active === "aboutFrames" && <AboutPanel key="about" />}
        {active === "projectsDesk" && <ProjectsPanel key="projects" />}
        {active === "rack" && <PowerliftingPanel key="powerlifting" />}
        {active === "whiteboard" && <WhiteboardPanel key="whiteboard" />}
      </AnimatePresence>

      {/* Helpful hint when in default view */}
      {active === "default" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-gold/70 text-xs uppercase tracking-widest font-display pointer-events-none">
          click an object · or use the nav above
        </div>
      )}
    </div>
  );
}
