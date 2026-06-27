# SEO & Social

Because the visible content is a 3D canvas, the document `<head>` and a couple of
fallbacks do the heavy lifting for crawlers and link unfurlers. It's all in
[`index.html`](../index.html).

## Metadata
- Descriptive `<title>` and `<meta name="description">`.
- `author`, `keywords`, `robots`, `theme-color`, and `color-scheme`.

## Structured data
A JSON-LD `Person` schema describes the owner, role, `alumniOf`, `knowsAbout`,
and `sameAs` social profiles — helping search engines build a rich profile.

## Social cards
- Open Graph (`og:title`, `og:description`, `og:image`, `og:image:width/height`,
  `og:image:alt`) and Twitter `summary_large_image` tags.
- The preview image is a **1200×630 PNG** (`public/og-image.png`); the source is
  `public/og-image.svg`. PNG is used because several platforms (LinkedIn, Slack)
  don't render SVG cards.

## Fallbacks
- A `<noscript>` block exposes the name, role, and key links without JavaScript.
- A visually-hidden `<h1>` gives the page a real, crawlable heading.

## To do (needs the deploy domain)
- [ ] `<link rel="canonical">` and `og:url` with the absolute production URL
- [ ] `robots.txt` and `sitemap.xml`

## Verify
Paste the production URL into a card validator (e.g. opengraph.xyz) and run
Lighthouse's SEO audit.
