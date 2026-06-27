# Architecture

A high-level map of how the portfolio is put together.

## Mental model

The app is a single screen: a full-viewport **3D canvas** with a **UI overlay**
(top nav + sliding panels) on top. There is no routing — navigation is modelled
as a single piece of state, the **active hotspot**.

```
User clicks an object  ──►  setHotspot("rack")  ──►  Zustand store
                                                         │
                 ┌───────────────────────────────────────┼───────────────────────────┐
                 ▼                                         ▼                           ▼
        CameraRig flies to the                   App renders the matching      Nav highlights the
        per-tier camera preset                   panel (PowerliftingPanel)     active item
```

## Layers

- **Scene** (`src/components/scene/`) — the room. `Scene` sets up the R3F
  `<Canvas>`; `Room` composes all objects; `CameraRig` damps the camera toward
  the active hotspot's preset each frame; objects call `setHotspot` on click.
- **UI** (`src/components/ui/`) — `Panel` is the shared accessible dialog shell;
  each section panel (About, Projects, …) renders content from config.
- **State** (`src/store/useSceneStore.ts`) — a tiny Zustand store holding
  `activeHotspot`, `hovered`, and `sceneStatus`. Components subscribe with atomic
  selectors to avoid extra re-renders.
- **Config** (`src/config/`) — `content.ts` (all copy/data), `links.ts`
  (socials), and `cameraPositions.ts` (per-device camera presets, typed as
  `Record<DeviceTier, Record<HotspotKey, CameraView>>` so a missing preset is a
  compile error).
- **Hooks** (`src/hooks/`) — `useDeviceTier`, `usePrefersReducedMotion`,
  `useHotspotHover`.

## Key decisions

- **Hotspot-as-state, not routes.** Simpler than a router for a single-screen
  experience, and it keeps the camera and panel in sync trivially.
- **Compile-time completeness.** The camera-preset type forces every hotspot to
  have a view on every device tier.
- **Resilience.** A `SceneErrorBoundary` wraps the lazy `Scene`; on WebGL failure
  it swaps in `SceneFallback`, a static, fully navigable version.
