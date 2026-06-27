# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Comprehensive documentation suite under `docs/`, plus `CONTRIBUTING`,
  `CODE_OF_CONDUCT`, `SECURITY`, and GitHub issue / PR templates.

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
