# Deployment

The site is a static Vite build hosted on **Vercel**.

## Build

```bash
pnpm install --frozen-lockfile
pnpm build      # tsc -b && vite build  →  dist/
```

The output in `dist/` is a fully static bundle that can be served from any static
host or CDN.

## Vercel settings

| Setting | Value |
| --- | --- |
| Framework preset | **Vite** |
| Install command | `pnpm install` |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Production branch | `main` |

Every push to `main` triggers a production deploy; pull requests get preview
deploys automatically.

## Deploying elsewhere

Any static host works — upload the contents of `dist/`. For client-side apps,
ensure the host serves `index.html` for unknown routes (not needed here, since
there's no client routing, but it's good practice).

## Post-deploy checklist

- [ ] Production deployment points at the latest `main` commit
- [ ] Hard-refresh to bypass CDN/browser cache when verifying changes
- [ ] Social preview renders (paste the URL into a link-unfurling tool)
- [ ] Lighthouse pass on Performance, Accessibility, Best Practices, SEO
