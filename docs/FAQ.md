# FAQ

**Is this a game engine / does it use a heavy 3D editor?**
No. The room is built procedurally from primitive meshes in React via
react-three-fiber — no external 3D model files, no editor. That keeps the bundle
lean and the scene fully version-controlled as code.

**Why no router / why don't sections have URLs?**
It's a single-screen experience; navigation is one piece of state (the active
hotspot). Per-section shareable URLs are on the [ROADMAP](../ROADMAP.md).

**It's blank / the room won't load. What now?**
If WebGL is unavailable or fails, the site automatically swaps to a static,
fully accessible fallback with the same content. If you see nothing at all,
ensure JavaScript is enabled (there's a `<noscript>` notice otherwise).

**Does it work on mobile?**
Yes. The camera pulls back with a wider field of view, panels become full-screen
sheets, and heavier effects are disabled to keep it smooth.

**I set "reduce motion" — is that supported?**
Fully. Every looping animation (3D and UI) stops; transitions become instant
fades. See [ACCESSIBILITY.md](ACCESSIBILITY.md).

**How do I update the content?**
Edit [`src/config/content.ts`](../src/config/content.ts). See
[CONTENT.md](CONTENT.md).

**Can I reuse this for my own portfolio?**
You're welcome to learn from and borrow code, but please don't republish the
3D room or personal content as your own — see the [LICENSE](../LICENSE).
