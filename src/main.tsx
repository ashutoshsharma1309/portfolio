import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { SiteApp } from "./site/SiteApp";
import "./index.css";

// Two experiences, one bundle graph:
//   /       → the scroll-driven portfolio (default)
//   /room   → the original interactive 3D room, code-split so the main site
//             never downloads drei / the room geometry unless it's visited.
// vercel.json already rewrites every extension-less path to index.html, so no
// router is needed.
const RoomApp = lazy(() => import("./RoomApp"));

const ROOM_FONTS =
  "https://fonts.googleapis.com/css2?family=Russo+One&family=Bebas+Neue&family=Permanent+Marker&family=Caveat:wght@600&display=swap";

function isRoomRoute() {
  return /^\/room\/?$/.test(window.location.pathname);
}

function enterRoomMode() {
  document.documentElement.classList.add("room-mode");
  document.title = "Ashutosh Sharma — 3D Room";
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ROOM_FONTS;
  document.head.appendChild(link);
}

const room = isRoomRoute();
if (room) enterRoomMode();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {room ? (
      <Suspense fallback={<div className="h-full w-full bg-[#05080f]" />}>
        <RoomApp />
      </Suspense>
    ) : (
      <SiteApp />
    )}
  </React.StrictMode>,
);
