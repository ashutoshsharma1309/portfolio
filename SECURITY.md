# Security Policy

## Scope

This is a static, client-side portfolio with no backend, no database, and no
authentication. It performs **no runtime data fetching** — all content is bundled
at build time. The attack surface is therefore limited to the static assets and
the hosting platform (Vercel).

## Reporting a Vulnerability

If you find a security issue (for example, a dependency advisory or an XSS vector
in user-rendered content), please **do not open a public issue**. Instead, reach
out privately via the contact links in the [README](README.md).

Please include:

- A description of the issue and its impact
- Steps to reproduce
- Affected file(s) or dependency, if known

You can expect an acknowledgement within a few days.

## Dependencies

Dependencies are kept current. Run an audit locally with:

```bash
pnpm audit
```
