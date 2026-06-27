# Style Guide

The visual language is a warm, dark "studio at night": deep navy UI, a single
gold accent, and wood/wall tones in the 3D room. Tokens live in
[`tailwind.config.js`](../tailwind.config.js) and [`src/index.css`](../src/index.css).

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| `navy` | `#0a1628` | UI surfaces, nav, panels |
| `gold` | `#f4b942` | Primary accent, headings, focus ring |
| `walls` | `#d4c5a9` | Room walls |
| `floor` | `#8b6b47` | Wood floor |
| `floorDark` | `#5c4530` | Floor shading |
| `matteBlack` | `#1a1a1a` | Equipment / dark props |
| `beanNavy` | `#1e3a5f` | Beanbag |
| `mustard` | `#d4a847` | Secondary warm accent |

UI surfaces are built from translucent white over navy (`bg-white/[0.03]`,
`border-white/10`) with gold used sparingly for emphasis.

## Typography

| Role | Font | Where |
| --- | --- | --- |
| Display | **Russo One** (Bebas Neue fallback) | Headings, nav, stats |
| Marker | **Permanent Marker** (Caveat fallback) | Whiteboard accents |
| Body | system UI sans-serif | Paragraphs, descriptions |

Headings use wide letter-spacing (`tracking-wide`/`-wider`) and uppercase for a
confident, technical feel.

## Spacing & shape

- Cards: `rounded-xl`, `p-5`, subtle border, `hover:-translate-y-0.5` lift.
- Pills/badges: `rounded-full` or `rounded-md`, `text-xs`.
- Consistent 44px minimum interactive target.

## Motion

Premium but purposeful: spring-based panel transitions, eased camera damping,
and short reveals — all disabled under `prefers-reduced-motion`
(see [ACCESSIBILITY.md](ACCESSIBILITY.md)).
