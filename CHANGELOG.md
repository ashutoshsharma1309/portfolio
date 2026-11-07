# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed (résumé sync, Nov 2026)
- Content updated from the latest résumé: Zarthi Backend Intern role, GenAI
  Club and PALS roles with dates, Placement Cell dates; NexArch added as a
  flagship project (GitHub links for NexArch and LGTM); AgriSmart and Cardiac
  Risk Predictor descriptions aligned; CGPA 8.58; LeetCode 1000+; 9 hackathon
  podiums; inCSEption 1st Prize; Spring Boot, REST API design, Frontend and
  Core CS skills.
- Project `status` is now optional (no pill shown when unknown); multiple
  flagship projects render as full-width cards.

### Added
- New scroll-driven portfolio at `/`: editorial design system (Geist, Geist
  Mono, Instrument Serif; ink + amber tokens), interactive WebGL hero (a node
  graph that reacts to cursor proximity, pointer and scroll), Lenis smooth
  scrolling, masked text reveals, tilt / magnetic interactions, generative
  project covers, a scroll-linked experience timeline, and a 1,400-dot LeetCode
  visualization. Honors `prefers-reduced-motion`; phones and software-only
  WebGL get a static hero visual.
- The original 3D room moved to `/room` (lazy-loaded, unchanged behaviour) with
  a link back to the portfolio.

### Changed
- LeetCode solved count updated to 1400+ everywhere it appears.
- `robots.txt`: removed the relative `Sitemap:` URL (invalid per spec) until the
  production domain is final.

- Comprehensive documentation suite under `docs/`, plus `CONTRIBUTING`,
  `CODE_OF_CONDUCT`, `SECURITY`, and GitHub issue / PR templates.
- Engineering hygiene: GitHub Actions CI (typecheck + build), Dependabot,
  `.editorconfig`, Prettier config, `.nvmrc`, `.gitattributes`, CODEOWNERS, and
  VS Code workspace settings.
- Deploy hardening via `vercel.json` (SPA rewrite, security headers, immutable
  asset caching) and SEO assets (`robots.txt`, `sitemap.xml`, web manifest,
  `humans.txt`).

### Fixed
- Achievements camera now frames the silver trophy on the bookshelf instead of
  the social photo frames.
- Sports camera pulled back so the full gold trophy is visible (was cropped).

## [1.0.0]

### Added
- Interactive isometric 3D room built with react-three-fiber, drei, and three.js.
- Eight content panels: About, Experience, Sports, Projects, Skills,
  Achievements, Powerlifting, and Contact.
- Five curated projects (LGTM, PrepNext, Authentix, AgriSmart, Cardiac Risk
  Predictor) with tech badges, status pills, and expandable case studies.
- Animated headline stat counters and scroll-reveal sections.
- Navigation with section icons (desktop bar + mobile menu).
- Error boundary with a fully accessible static fallback for no-WebGL devices.
- SEO: JSON-LD `Person` schema, Open Graph / Twitter cards, and a PNG preview.

### Accessibility
- Panels as modal dialogs with focus trap, focus restore, and `Esc` to close.
- Complete `prefers-reduced-motion` support across UI and 3D animation loops.

### Performance
- Code-split, lazily-loaded 3D bundle; separate React / Framer Motion vendor
  chunks; per-device DPR and effect scaling.

### Fixed
- Powerlifting camera now frames the rack instead of the desk + open-room void.
- Mobile menu renders outside the blurred header so it covers the viewport.
