# Accessibility

Accessibility is a first-class requirement here, not an afterthought. A 3D-heavy
site is exactly where it's easiest to exclude people — so this project treats the
accessible path as the primary one.

## Commitments

- **Keyboard operable end-to-end.** Every section is reachable and every control
  is usable without a mouse.
- **Reduced motion respected.** Honoring the OS `prefers-reduced-motion` setting.
- **Always a content path.** If WebGL fails, content is never lost.

## How it's implemented

### Dialogs
Panels render as modal dialogs (`role="dialog"`, `aria-modal`,
`aria-labelledby`). On open, focus moves into the panel; a **focus trap** keeps
`Tab` inside it; `Esc` closes it; on close, focus returns to the trigger.

### Reduced motion
`usePrefersReducedMotion` gates all looping animation:
- 3D loops — camera idle drift, trophy bob + ring pulse, rotating disc, plant /
  bookshelf sway, desk terminal + steam, light flicker, dust motes.
- UI — count-up stats, scroll reveals, and panel slide transitions collapse to
  instant fades.
A global CSS `@media (prefers-reduced-motion: reduce)` rule is the safety net.

### Structure & semantics
- A visually-hidden `<h1>` gives the canvas-driven page a real heading.
- `<header>`/`<nav>` landmarks; `aria-current` marks the active nav item.
- Decorative SVGs are `aria-hidden`; external links announce "opens in new tab".
- Visible `:focus-visible` rings; touch targets ≥ 44px.

### No-WebGL fallback
`SceneFallback` renders the same sections as a plain, keyboard-navigable grid of
links, plus a `<noscript>` block with the core identity and contact links.

## Testing checklist
- [ ] Tab through every panel; focus stays trapped and visible
- [ ] `Esc` closes panels and the mobile menu
- [ ] Enable "reduce motion" — no looping animation anywhere
- [ ] Disable WebGL — the static fallback is fully usable

## Tools
- **Lighthouse** (Chrome DevTools) — Accessibility audit.
- **axe DevTools** — automated WCAG checks.
- **Keyboard only** — unplug the mouse and navigate the whole site.
- **VoiceOver / NVDA** — verify the screen-reader heading and labels read sensibly.
- OS setting: **Reduce Motion** (macOS: Accessibility → Display) to verify gating.
