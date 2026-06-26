import type { SVGProps } from "react";

// Lightweight, dependency-free icon set. All icons share the same 24×24 stroke
// style so iconography stays consistent across the site (matches the existing
// inline trophy icon). Add new glyphs to PATHS and the IconName union together.

export type IconName =
  | "brain"
  | "server"
  | "shield"
  | "layers"
  | "code"
  | "trophy"
  | "gitBranch"
  | "rocket"
  | "briefcase"
  | "database"
  | "blocks"
  | "wrench"
  | "medal"
  | "sparkles"
  | "target"
  | "mail"
  | "link"
  | "barbell"
  | "user";

const PATHS: Record<IconName, JSX.Element> = {
  brain: (
    <>
      <path d="M12 5a3 3 0 0 0-5.99.2A2.5 2.5 0 0 0 4 9.5a2.5 2.5 0 0 0 1 4.5v.5A2.5 2.5 0 0 0 7.5 17h0a2.5 2.5 0 0 0 4.5 1.5V5Z" />
      <path d="M12 5a3 3 0 0 1 5.99.2A2.5 2.5 0 0 1 20 9.5a2.5 2.5 0 0 1-1 4.5v.5a2.5 2.5 0 0 1-2.5 2.5h0A2.5 2.5 0 0 1 12 18.5V5Z" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.5" />
      <rect x="3" y="13" width="18" height="7" rx="1.5" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  code: (
    <>
      <path d="m8 6-6 6 6 6" />
      <path d="m16 6 6 6-6 6" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M5 4h2v3a2 2 0 0 1-2 2H4V6a2 2 0 0 1 1-2Z" />
      <path d="M19 4h-2v3a2 2 0 0 0 2 2h1V6a2 2 0 0 0-1-2Z" />
    </>
  ),
  gitBranch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7M18 10.5a6 6 0 0 1-6 6H8.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" />
      <path d="M9 11a13 13 0 0 1 8-8c2 0 3 1 3 3a13 13 0 0 1-8 8l-3-3Z" />
      <circle cx="15" cy="9" r="1.3" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </>
  ),
  blocks: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.1-2.1 2.7-2.5Z" />
  ),
  medal: (
    <>
      <path d="M8 3 6 8M16 3l2 5" />
      <circle cx="12" cy="14" r="6" />
      <path d="m12 11 .9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 13l2-.3L12 11Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  // Barbell: a loaded bar — reads instantly as weightlifting / powerlifting.
  barbell: (
    <>
      <path d="M3.5 9.5v5M6.5 7.5v9M17.5 7.5v9M20.5 9.5v5" />
      <path d="M6.5 12h11" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
