<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

The frontend is Astro with Preact islands, deployed on Vercel. Better Auth runs inside Convex through the `@convex-dev/better-auth` component.

## Rendering model

Public pages are CDN-cached: they render on demand with
`Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`.
Keep every server render session-free. Per-user data (signed-in state,
bookings) renders in client islands that talk to Convex directly, so a
cached page is identical for every visitor.

## Development

Start the dev server in background mode with `bunx astro dev --background`;
manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.
Push Convex changes with `bunx convex dev --once`.

Builds inside `.worktrees/` also need `bun install` in the main checkout:
Vite reads the parent checkout's `tsconfig.json`, which extends a package.

Add dependencies by hand at versions published at least 7 days ago: Bun's
`minimum-release-age` blocks newer ones, and `astro add` always requests
the latest.

Astro docs: https://docs.astro.build. Consult these guides before related work:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using Preact and other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)

## Change workflow

For each new change, create your own branch and worktree at `<repo-root>/.worktrees/<task-name>/`.
Make sure the `.worktrees` directory is gitignored.
Branch from the top of the existing PR stack or `origin/main` if no stack exists.
After completing your assigned task, commit and push your changes, open a non-draft PR targeting that base branch, and clean up the worktree.
For UI changes, embed Before and After screenshots in the PR body.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout with root `GLOSSARY.md` and `docs/adr/`.
See `docs/agents/domain.md`.
