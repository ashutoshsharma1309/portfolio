# Editing Content

Almost everything you'd want to change lives in **[`src/config/content.ts`](../src/config/content.ts)**
(and socials in [`src/config/links.ts`](../src/config/links.ts)). Components read
from these — you rarely need to touch JSX to update the site.

## Where things live

| Want to change… | Edit |
| --- | --- |
| Name, title, bio, education | `BIO` |
| Headline stat counters | `stats` |
| About focus cards | `focusAreas` |
| Experience / leadership | `experience` |
| Projects | `projects` |
| Technical skills | `skillCategories` |
| Sports & hackathon achievements | `trophies` |
| Powerlifting PRs | `POWERLIFTING_PRS`, `powerlifting` |
| Social / contact links | `links.ts` |

## Adding a project

Append an object to the `projects` array:

```ts
{
  id: "my-project",
  title: "My Project",
  tagline: "One-line hook.",
  description: "2–3 sentence summary.",
  techStack: ["React", "Node.js"],
  status: "live",              // "live" | "in-progress" | "archived" | "concept"
  timeline: "2025",
  tags: ["Full-Stack"],
  highlights: ["What makes it interesting"],
  accent: ["#6366f1", "#0ea5e9"], // gradient cover stops
  featured: true,             // optional — promotes to "Featured Work"
  flagship: true,             // optional — adds the "Flagship" badge
  liveUrl: "https://…",       // optional
  githubUrl: "https://…",     // optional
  caseStudy: { problem, approach, impact, futureWork }, // optional
}
```

The card UI adapts automatically to whichever optional fields are present.

## Icons

Section and card icons come from the in-house set in
[`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx). Add a glyph to the
`IconName` union and the `PATHS` map together, then reference it by name.
