# Performance

A 3D scene is heavy by nature, so the goal is: **keep the first paint cheap and
the 3D off the critical path.**

## Bundle strategy

- **The scene is lazy.** `Scene` is `React.lazy`-loaded, so three.js / drei ship
  in a separate chunk that loads behind the brand loader — the app shell paints
  first.
- **Vendor splitting.** React and Framer Motion are split into their own chunks
  (`vite.config.ts` `manualChunks`) so app edits don't bust their cache between
  deploys.
- **Tiny shell.** The non-3D entry bundle is ~15–17 KB gzipped.

Approximate gzipped chunks:

| Chunk | gzip |
| --- | --- |
| app shell | ~16 KB |
| react-vendor | ~43 KB |
| framer-motion | ~41 KB |
| scene (three.js, lazy) | ~310 KB |

## Runtime budgets by device tier

`useDeviceTier` buckets the viewport into `mobile` / `tablet` / `desktop` and the
scene scales accordingly:

- **DPR** is capped lower on mobile/tablet.
- **Shadow map + contact-shadow resolution** drop on mobile.
- **Dust motes** and other ambient effects are skipped on mobile.
- When a panel is open on mobile, the canvas isn't rendered (the full-screen
  panel covers it), so no frames are wasted.

## Render hygiene

- Zustand selectors are atomic — components subscribe only to the slice they use.
- `useDeviceTier` bails when the tier bucket is unchanged, avoiding a resize
  render storm.
- No per-frame allocations in `useFrame` loops (scratch objects are reused).
- All looping animation stops entirely under `prefers-reduced-motion`.
