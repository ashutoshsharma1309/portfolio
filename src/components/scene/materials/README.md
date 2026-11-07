# Room rendering foundation: materials, textures, quality

API reference for everyone upgrading objects in `/room` to PBR. Import from the
barrels:

```ts
import { useRoomQuality } from "./quality";            // from src/components/scene/*
import { createWood, useDisposable, ... } from "./materials";
```

All of it is procedural. Nothing loads from the network. Don't add HDRs,
texture files, or models.

---

## 1. Quality tiers (`src/components/scene/quality`)

`Scene.tsx` mounts `<RoomQualityProvider>` inside the `<Canvas>`, so every scene
component can call:

```ts
const q = useRoomQuality();
// q.tier         'high' | 'medium' | 'low'   (current tier; only ever drops at runtime)
// q.config       RoomQualityConfig for q.tier
// q.startTier    tier chosen at startup
// q.textureSize  base texture size to request (pinned to startTier)
// q.anisotropy   anisotropy to use (pinned, clamped to the GPU)
// q.pinned       true if ?quality= forced the tier
// q.probe        { renderer, software, cores, gpuMaxAnisotropy }
// q.dpr          DPR range currently applied
```

| knob (`q.config.*`)       | high | medium | low  |
|---------------------------|------|--------|------|
| `textureSize`             | 512  | 512    | 256  |
| `shadowMapSize`           | 2048 | 2048   | 1024 |
| `physicalMaterials`       | yes  | no     | no   |
| `clearcoat`               | yes  | no     | no   |
| `envResolution`           | 256  | 128    | 64   |
| `maxAnisotropy`           | 8    | 4      | 2    |
| `dpr`                     | 1–2  | 1–1.5  | 1–1.25 |
| `contactShadowResolution` | 1024 | 512    | 256  |
| `wornMetalBump`           | yes  | yes    | no   |
| `normalStrength`          | 1    | 1      | 0.8  |

How the tier is picked:
- The start tier comes from `useDeviceTier()` (mobile → low, tablet → medium,
  desktop → high). It drops one step if the WebGL renderer is a software
  rasterizer (SwiftShader, llvmpipe, "software") or if
  `navigator.hardwareConcurrency <= 4`.
- At runtime, drei `<PerformanceMonitor>` starts after a 3.5 s warm-up. If FPS
  stays low (75% of 10×250 ms samples under 40 fps, or under 50 fps on
  displays above 100 Hz), it steps down: high → medium → low, then cuts DPR
  in 0.15 steps. Inclines are disabled, so the tier never goes back up and
  never flaps. After 3 declines, `onFallback` sets the minimum settings and
  monitoring stops.
- **Texture size and anisotropy are pinned to the start tier.** A runtime
  downgrade never regenerates textures. It does change `config`, so materials
  memoized on `q` get rebuilt (physical → standard, which is cheaper).
- `?quality=high|medium|low` pins the tier and turns off the monitor. Use it
  for screenshots, for example `/room?quality=high`.

Memoize on the whole `q` object (`[q]`). Its identity changes only when
something relevant changes.

---

## 2. Procedural textures (`materials/textures.ts`)

| kind               | tile = (m) | size × tier | tint?                   | ORM channels used          | intended for |
|--------------------|-----------:|------------:|-------------------------|----------------------------|--------------|
| `woodPlanks`       | 1.2        | 1×          | no (oak color; tint darker for walnut) | AO + rough                 | floor, desk tops, shelves |
| `paintedPlaster`   | 5.0        | 1×          | yes                     | rough                      | walls (one tile = full 5 m height; scuffs/dirt at v≈0) |
| `rubberMat`        | 1.0        | 1×          | no (EPDM speckle)       | AO + rough                 | gym floor tiles, plate rubber |
| `brushedSteel`     | 0.25       | 0.5×        | yes                     | rough + metal              | desk frame, monitor arm, sheet metal |
| `powderCoat`       | 0.5        | 0.5×        | yes                     | rough                      | painted metal parts |
| `syntheticLeather` | 0.12       | 0.5×        | yes                     | AO + rough                 | bench pad, chair seat |
| `knurling`         | 0.04       | 0.5×        | yes                     | AO + rough + metal         | bar grips, dumbbell handles |
| `fabricWeave`      | 0.08       | 0.5×        | yes                     | AO + rough                 | beanbag, rug, upholstery |
| `microSurface`     | 0.3        | 0.5×        | yes                     | rough                      | plastic, ceramic |

"tile = (m)" is the real-world width of one texture tile. The full set is in
`TEXTURE_KIND_INFO[kind]`.

```ts
getTextureSet(kind, { size?: q.textureSize, anisotropy?: q.anisotropy, seed?: 1 }): PbrTextureSet
createTextureSet(kind, { size, anisotropy, seed, widthM, heightM, repeat?, offset?, rotation? }): OwnedTextureSet
repeatForMeters(kind, widthM, heightM): [u, v]
applyRepeat(textures, [u, v])            // only on textures you own
textureSizeFor(kind, baseSize): number   // base × sizeScale, power of two, min 64
roughnessScaleFor(kind, desiredMean): number
texturesPending(): number
texturesSettled(): Promise<void>
getTextureStats(): TextureStat[]         // ms per generated set
```

A `PbrTextureSet` has `{ kind, size, info, map, normalMap, orm, roughnessMap, metalnessMap|null, aoMap|null, ready, isReady() }`.
- `map` is in `SRGBColorSpace`. `normalMap` is tangent space with OpenGL / +Y
  up (three's default). `orm` packs AO in R, roughness in G, metalness in B,
  as in glTF. `roughnessMap` is the same texture as `orm`, and so are
  `metalnessMap` and `aoMap` when they are not null.
- The roughness and metalness in the maps are **absolute values**. three
  multiplies them by `material.roughness` and `material.metalness`, so use
  `roughness: roughnessScaleFor(kind, 0.4)` to set a mean, or use the
  factories, which do this for you.
- Every texture uses `RepeatWrapping`, trilinear mipmaps, and anisotropy.
  Generation is seeded, so the same inputs always produce the same output.
- `aoMap` uses UV channel 0. You don't need `uv2`.

**Generation is async.** On the first request for a `(kind, size, seed)`, a
Web Worker generates the set (two workers on machines with more than 2
cores). The textures come back right away, filled with a neutral placeholder
(mean color, flat normal, mean roughness). When the worker finishes, the data
is copied in and every texture sharing it is flagged for upload. `Scene.tsx`
keeps the loading screen up until `texturesSettled()` (2.5 s cap after the
first frame), so users never see the swap. Only the kinds you actually request
get generated.

**Physical scale.** Pass the real size of the surface along U and V:

```ts
// 10 × 10 m floor plane, boards running toward the camera
createWood(q, { widthM: 10, heightM: 10 })
// back wall: width 10 m, height 5 m. UV v = 0 must be the floor edge (planeGeometry/box faces already are)
createPlaster(q, { widthM: 10, heightM: 5 })
// cylinder grip: U wraps around, V runs along the bar
createKnurledSteel(q, { circumferenceM: 2 * Math.PI * 0.025, lengthM: 0.4 })
// sphere of radius r: widthM = 2πr, heightM = πr
```

Box faces map each face to the full 0..1 UV range. If a box's faces differ a
lot in size, use the dimensions of the largest visible face, or build the
mesh from planes.

---

## 3. Material factories (`materials/factories.ts`)

Each factory is `(q: MaterialQuality, options) => MeshStandardMaterial | MeshPhysicalMaterial`.
They are pure functions of their inputs, so they are safe inside `useMemo` or
`useDisposable`. Common `SurfaceOptions`: `widthM, heightM, repeat, offset,
rotation, seed, color, roughness (desired mean), envMapIntensity, normalScale,
aoMapIntensity`.

| factory                    | defaults                                                        | physical extras (high tier) | use for |
|----------------------------|-----------------------------------------------------------------|-----------------------------|---------|
| `createWood`               | rough 0.5, env 0.9; `clearcoat?` (0.18)                         | satin clearcoat 0.18 / 0.32 | floor (`widthM: 10, heightM: 10`), desk top (`color: "#8a6a55"` for walnut), shelves |
| `createPlaster`            | color `#e6dfd3`, rough 0.88, env 0.8                            | –                           | back/left walls, skirting (with `color`) |
| `createRubber`             | rough 0.88, env 0.6                                             | –                           | gym floor mat under the rack, rubber plate faces |
| `createLeather`            | color `#161616`, rough 0.6                                      | clearcoat 0.12              | bench pad, chair seat/back |
| `createFabric`             | color `#808080`, rough 0.93; `sheen?` (1)                       | sheen 1, sheenRoughness 0.75 | beanbag, cushion, rug |
| `createBrushedSteel`       | color `#d9dbde`, rough 0.32, metal 1                            | –                           | desk frame, monitor arm/stand |
| `createPowderCoat`         | color `#1e1f22`, rough 0.5                                      | clearcoat 0.25              | desk legs, shelf brackets, drawer unit |
| `createKnurledSteel`       | `circumferenceM`, `lengthM`; rough 0.42, metal 1                | –                           | barbell grip sections, dumbbell handles |
| `createPlastic`            | color `#202022`, rough 0.45                                     | –                           | keyboard, mouse, monitor bezels/backs, pots |
| `createCeramic`            | color `#f2efe9`, rough 0.35                                     | glaze clearcoat 0.8         | mugs |
| `createWornMetalMaterial`  | `(q, presetName, overrides)`                                    | see below                   | rack, barbell, plates' hubs |

`disposeMaterial(mat)` disposes the material and the texture clones it owns.

### Disposal rules

- **Never dispose anything that `getTextureSet()` returns.** The cache is
  shared across the whole scene.
- Materials made by the factories own per-material texture clones. The clones
  share the cached GPU data, so they cost no extra memory. Call
  `disposeMaterial()` on them, or let `useDisposable` do it:

```tsx
const q = useRoomQuality();
const mats = useDisposable(() => ({
  pad: createLeather(q, { widthM: 1.4, heightM: 0.34 }),
  frame: createWornMetalMaterial(q, "darkPowderCoat", { hotspots: [[3.4, 1.0, 2.2]] }),
}), [q]);
return <mesh material={mats.pad}>...</mesh>;
```

`useDisposable(factory, deps)` works like `useMemo`. When deps change or the
component unmounts, it disposes the value: a material, a geometry, an array,
or a plain record of them. It is safe under StrictMode.

---

## 4. Worn metal (`materials/wornMetal.ts`)

`createWornMetal(options, q.config)` returns a `MeshStandardMaterial`, or a
`MeshPhysicalMaterial` with clearcoat when `options.clearcoat > 0` and the tier
allows it. Its `onBeforeCompile` adds **world-space** procedural detail, so it
needs no UVs and the pattern runs continuously across separate meshes:

- **chips**: small jagged patches that expose bare steel (darker, metal 1,
  smoother). They cluster in low-frequency patches and near hotspots.
- **rust**: brown and dark oxide that is dielectric and rough. It gets more
  likely below `rustHeight` (world Y) and near hotspots.
- **micro-scratches**: short straight segments that change roughness by
  `scratchRoughness` and show a little bare steel. They fade to a faint
  roughness mottle once they are smaller than a pixel.
- **bump** (when `config.wornMetalBump`): derivative bump on rust pits and
  scratches.

Options (all optional): `color, roughness, metalness, bareColor,
bareRoughness, bareMetalness, rustColor, rustDarkColor, wear (0..1), rust
(0..1), rustHeight (m), rustFalloff (m), hotspots (≤ 8 of [x,y,z] or
{position, radius}), hotspotRadius, scratches (0..1), scratchRoughness,
noiseScale, seed, bump, space ('world'|'object'), clearcoat,
clearcoatRoughness, envMapIntensity, map/normalMap/normalScale/roughnessMap/
metalnessMap/aoMap` (UV maps layered under the wear, e.g. a `knurling` set).

Presets (`WORN_METAL_PRESETS`):
- `darkPowderCoat`: rack uprights, crossmembers, J-hook bodies, bench frame.
  `wear 0.45, rust 0.3`. Clearcoat on the high tier. Pass `color` for red
  accent parts.
- `brushedSteel`: barbell shaft and sleeves. Scratches make it duller. Rust
  appears only near hotspots.
- `chrome`: collars, chrome handles. Polished, with hairline scratches.
- `castIron`: plate hubs, cast dumbbell heads. More oxidation, but still
  restrained.

Guidance:
- Hotspots are **world-space** points. Compute them from your group's
  transform, for example by `localToWorld` on known joint positions. Up to 8
  per material. Put them at J-hook contact points, bolts, welds, and where
  the bar sits in the hooks.
- Use a different `seed` on repeated parts so they don't wear the same way.
- For a mesh that **moves**, pass `space: 'object'`. Otherwise the pattern
  swims as it moves. The rack's rotating disc is one example.
- `customProgramCacheKey` depends only on the structure (`space` and bump on
  or off). Every numeric option is a uniform, so all worn-metal materials
  share at most 4 shader variants per base material type (standard or
  physical). `getWornUniforms(mat)` gives live uniform access.
- On box primitives, wear appears on the faces, not specifically on edges,
  because no curvature information is available. Bevelled geometry
  (`RoundedBox`) reads better.

---

## 5. Smooth hover (`materials/useHoverMix.ts`)

This replaces instant emissive toggles:

```tsx
const { hovered, onPointerOver, onPointerOut } = useHotspotHover("rack");
const mix = useHoverMix(hovered);            // ref, eases 0..1 (λ = 12, ~0.2 s), snaps under reduced motion
useFrame(() => applyHoverEmissive([mats.frame, mats.pad], mix.current)); // gold, max 0.22
```

`applyHoverEmissive(materials, mix, color = HOVER_COLOR, maxIntensity = 0.22)`
adds to whatever emissive the material already has (captured on the first
call), so screens keep their glow. It skips materials whose mix hasn't
changed. Don't use it on materials whose emissive you animate yourself, such
as pulsing rims. Highlight a sibling material instead. `useHoverMix` never
re-renders React.

---

## 6. Lighting and renderer (what you can rely on)

- Tone mapping is **Khronos PBR Neutral** at exposure 1.0, with sRGB output.
  Base colors come out close to what you pick, so don't pre-brighten them.
- The environment is local `Lightformer`s rendered once: a bright window on
  the right of the back wall, a soft ceiling bounce, a warm floor bounce, a
  plaster wall bounce, and a dim open front. It provides every reflection and
  ambient fill. `envMapIntensity` around 0.6–1.0 is right for most surfaces.
  **Don't add ambient or hemisphere lights.**
- The sun is one `PCFSoftShadowMap` directional light from the window (+x)
  side. Its frustum fits the room, and its normal bias comes from the texel
  size. There is also one weak warm fill with no shadows.
- `ContactShadows` renders **once** at y = 0.058, above the floor boards and
  rug. It won't follow objects that move after the first frame. That's fine
  for the room, where only the chair spins and it is lit by the sun shadow.
- There is no bloom, no fog, and no post-processing. Keep emissive values
  modest.

---

## 7. Performance rules

- **castShadow** only on objects taller than about 5 cm that sit in the sun:
  furniture bodies, rack uprights, barbell, plates, bench, plants, beanbag.
  **Not** on small desk props, screens, frames, text, or anything flat on the
  floor or a wall. Walls and floor only `receiveShadow`.
- Reuse geometry and materials. Create a geometry once per shape with
  `useMemo`, not inline per mesh. Share one material across every mesh that
  looks the same (all rack uprights can use one worn-metal material).
- Instance repeated parts with drei `<Instances>` or `<instancedMesh>` (bolts,
  rack holes, plate stacks, books). The worn-metal shader supports instancing
  (`instanceMatrix` is applied).
- Aim to keep total draw calls under about 150. Check with
  `renderer.info.render.calls`.
- Don't create materials or textures in render without `useMemo` or
  `useDisposable`. Don't allocate in `useFrame`.
- Physical materials (clearcoat, sheen) are high tier only, and the factories
  handle that. Don't create `MeshPhysicalMaterial` directly unless you check
  `q.config.physicalMaterials`.

---

## 8. Dev hooks (dev server only)

- `window.__sceneStore.getState().setHotspot('rack')` lets you drive the UI
  state.
- `window.__setRoomCamera([x,y,z], [tx,ty,tz], fov?)` pins the camera.
  `window.__setRoomCamera(null)` releases it.
- `window.__roomQuality` holds the current quality state.
  `window.__roomTextures.stats()` returns generation timings.
  `window.__roomTextures.benchmark(512)` generates every kind synchronously.
- `/room?materialPreview` shows a swatch board of every factory and preset at
  z ≈ 7.5. Look at it with
  `__setRoomCamera([0, 2.0, 11.8], [0, 0.55, 7.6], 42)`, and hover swatches
  to see `useHoverMix`.
- Console lines starting with `[room-quality]`, `[room-textures]`, and
  `[room]` report the chosen tier, texture timings, and first-frame/ready
  times.
