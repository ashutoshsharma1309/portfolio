import { BIO } from "../../config/content";
import { useSceneStore } from "../../store/useSceneStore";
import type { HotspotKey } from "../../config/cameraPositions";

const ENTRIES: { key: HotspotKey; label: string; hint: string }[] = [
  { key: "aboutFrames", label: "About Me", hint: "Background & what I do" },
  { key: "experience", label: "Experience", hint: "Technical & leadership roles" },
  { key: "sportsTrophy", label: "Sports", hint: "Athletics achievements" },
  { key: "projectsDesk", label: "Projects", hint: "Flagship work & case studies" },
  { key: "skills", label: "Skills", hint: "Languages, AI/ML & infra" },
  { key: "hackathonTrophy", label: "Achievements", hint: "Hackathon wins & LeetCode" },
  { key: "rack", label: "Powerlifting", hint: "Personal records" },
  { key: "whiteboard", label: "Contact", hint: "Get in touch" },
];

/**
 * Static, fully accessible stand-in for the 3D room. Rendered when WebGL is
 * unavailable or the scene fails to load — the same content, reachable as a
 * plain grid of links instead of clickable 3D objects.
 */
export function SceneFallback() {
  const setHotspot = useSceneStore((s) => s.setHotspot);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-br from-[#0a1628] via-[#0b1018] to-[#05080f]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-28">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          Portfolio
        </p>
        <h1 className="font-display text-4xl tracking-wide text-white md:text-5xl">
          {BIO.name}
        </h1>
        <p className="mt-2 text-gold/80">{BIO.title}</p>
        <p className="mt-4 max-w-xl leading-relaxed text-white/70">
          {BIO.summary}
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {ENTRIES.map((e) => (
            <button
              key={e.key}
              onClick={() => setHotspot(e.key)}
              className="rounded-xl border border-gold/20 bg-white/[0.03] p-4 text-left transition-colors hover:border-gold/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <div className="font-display text-lg tracking-wide text-white">
                {e.label}
              </div>
              <div className="mt-0.5 text-sm text-white/50">{e.hint}</div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-xs text-white/55">
          Your browser couldn&apos;t render the interactive 3D room, so
          here&apos;s the fast version. Everything is still here.
        </p>
      </div>
    </div>
  );
}
