# CLAUDE.md

Design Watch grades the design of every page and app screen after each deploy, with the team's own taste. Read `README.md` for the loop and `docs/plan.md` for the plan.

## This repo is public

- No client data here: no client names, URLs, screenshots, sessions, findings, taste evidence or page lists.
- Each project's profile, saved sessions, taste overrides, runs and score history live in `~/.config/design-watch/<project>/` on the machine that runs the tool.
- Specs and tickets live in `.scratch/`, which is git-ignored for the same reason.
- Examples use `example.com` and made-up pages.

## How it is built

- The deterministic parts (inventory, planner, capture, gates, detector, store, report) are a Node CLI in strict TypeScript.
- The judge runs as Claude Code subagents through a `/design-watch` skill. No API key. See `docs/adr/0001-claude-judges-open-source-around-it.md`.
- Judge findings point at element ids from the DOM or the accessibility tree (Set-of-Mark), never at coordinates the model guessed.
- One heavy job at a time on the machine: one browser, at most two contexts, and a lock file before any capture run.
- `spikes/` holds throwaway code; nothing imports from it.

## Conventions

- Conventional Commits with a scope: `feat(capture): …`, `docs(plan): …`.
- Commit bodies name every substantial change in the diff.
- Tests sit next to the code they test.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature-slug>/`, git-ignored. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.
