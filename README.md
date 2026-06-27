<p align="center">
  <img src="public/og-image.png" alt="Ashutosh Sharma — AI & Backend Engineer" width="640" />
</p>

# Ashutosh Sharma — Portfolio

> An interactive, isometric **3D room** portfolio. Step into the room, click an
> object — or use the top navigation — to explore my projects, experience,
> achievements, skills, and more.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r169-000000?logo=three.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white)

I'm a Computer Science undergraduate and **AI & Backend Engineer**. Instead of a
conventional scrolling page, this portfolio renders a hand-built 3D workspace you
can explore — every object opens a real section of the site.

> **Live demo:** _add your Vercel URL here_

## ✨ Highlights

- **Interactive 3D room** — built with react-three-fiber, drei, and three.js. Click objects or use the nav; the camera smoothly flies to each focus point.
- **Eight content panels** — About, Experience, Sports, Projects, Skills, Achievements, Powerlifting, and Contact, each an accessible modal dialog.
- **Five featured projects** — overviews, tech badges, status pills, key features, and expandable case studies.
- **Accessibility first** — full keyboard navigation, focus trap + restore, ARIA semantics, visible focus rings, and complete `prefers-reduced-motion` support (UI *and* 3D loops).
- **Resilient** — an error boundary + static fallback keep the site fully usable even when WebGL is unavailable.
- **Animated, intentional** — scroll-reveal sections, count-up stats, and per-device camera presets, all motion-safe.
- **Production SEO** — JSON-LD `Person` schema, Open Graph / Twitter cards, a PNG social preview, and a `<noscript>` fallback.
- **Fast** — the heavy 3D bundle is code-split and lazy-loaded; vendor chunks cache independently; DPR and effects scale down on mobile.

## 🛠️ Tech Stack

| Area | Tools |
| --- | --- |
| **Framework** | React 18, TypeScript |
| **Build** | Vite 5 |
| **3D / graphics** | three.js, @react-three/fiber, @react-three/drei, @react-spring/three |
| **Animation** | Framer Motion |
| **State** | Zustand |
| **Styling** | Tailwind CSS |
| **Tooling** | TypeScript (strict mode), pnpm |
| **Hosting** | Vercel |

## 🧭 Explore the Room

Every section is reachable two ways — by clicking its object in the 3D scene, or
from the top navigation:

| Section | What's inside |
| --- | --- |
| **About** | Bio, focus areas, and animated headline stats |
| **Experience** | Technical & leadership roles (GenAI Club, IIC, Placement Cell) |
| **Sports** | Tug of War — college team & VTU inter-college |
| **Projects** | LGTM, PrepNext, Authentix, AgriSmart, Cardiac Risk Predictor |
| **Skills** | Languages, Backend, Databases & Infra, AI/ML, Blockchain, Tools |
| **Achievements** | Hackathon awards + a 900+ LeetCode counter |
| **Powerlifting** | Squat / Bench / Deadlift personal records |
| **Contact** | Email + social links |

> No hardware acceleration? The site automatically falls back to a fast, fully
> accessible static version with the exact same content.

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **pnpm** (recommended) — `npm install -g pnpm`

### Installation
```bash
git clone https://github.com/ashutoshsharma1309/portfolio.git
cd portfolio
pnpm install
```

### Run locally
```bash
pnpm dev
```
Then open the printed URL (default **http://localhost:5173**).

## 📜 Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server with hot-module reload |
| `pnpm build` | Type-check, then build for production into `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm typecheck` | Run the TypeScript compiler with no emit |

## 📁 Project Structure

```
src/
├─ App.tsx                 # App shell: scene, panels, loading, error boundary
├─ main.tsx                # Entry point
├─ index.css               # Tailwind layers + global a11y styles
├─ components/
│  ├─ nav/                 # TopNav (desktop bar + mobile menu)
│  ├─ scene/               # 3D room: Room, Scene, CameraRig, Lighting, Desk,
│  │                       #   Chair, PowerliftingRack, Trophy, Plants, …
│  ├─ ui/                  # Panels + UI: Panel, *Panel, Icon, Reveal,
│  │                       #   AnimatedCounter, LoadingScreen, SceneFallback
│  └─ SceneErrorBoundary.tsx
├─ config/                 # content.ts (single source of truth), links.ts,
│                          #   cameraPositions.ts (per-device camera presets)
├─ hooks/                  # useDeviceTier, usePrefersReducedMotion, useHotspotHover
└─ store/                  # useSceneStore (Zustand)
public/                    # favicon.svg, og-image.svg, og-image.png
```

> **All editable content lives in [`src/config/content.ts`](src/config/content.ts).**
> Add a project, role, skill, or achievement there and the UI adapts automatically.
