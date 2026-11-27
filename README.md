# Design Watch

> Early-stage tool by Webpuppies (started 27 Nov 2026). It answers one question: can a watcher grade the design of every page after each deploy, the way our designer would, without anyone opening the pages?

Design Watch photographs every page on a phone and a desktop (and native app screens), grades each one with the team's own design rules, pins every problem on the screenshot, and learns from the calls a designer makes on its findings. It is built for sites with hundreds of pages, so it watches templates, states and components rather than every URL.

**Status:** planning. Read [docs/plan.md](docs/plan.md). The only code is a spike.

## How it works

1. **Inventory.** Reads the framework's route tree (or a sitemap, or an app's navigator) and keeps a registry of every page and screen.
2. **Plan.** Picks what to look at this run: pages whose code changed, the money pages every time, the long tail on rotation, a few edge-case instances per template, each role and locale on its own cadence.
3. **Capture.** Real Chrome at 390 and 1440 wide, signed in as each role; the iOS simulator for app screens.
4. **Gate.** Skips screens whose pixels and DOM did not change since the last grade.
5. **Detect.** Plain browser checks: fonts outside the design file, colours, sizes, contrast, targets, unnamed controls, overflow.
6. **Judge.** Claude Code subagents read each screenshot with the impeccable critique and audit rubric and the team's taste file. Two passes; every finding must carry a box.
7. **Report.** A board with pinned screenshots, a score per page, a trend per page, findings grouped by shared component.
8. **Teach.** Each finding gets Real, Intended or Wrong. Intended and Wrong become taste rules, so the same false alarm never comes back.

## Try the spike

```sh
npm install
node spikes/capture.cjs profiles/example.json
```

It captures each route in the profile at both viewports and writes screenshots plus detector results to `~/.config/design-watch/<project>/runs/<date>/`. It needs Google Chrome installed (or set `DW_CHROME`).

## Where data lives

This repo holds the tool and generic rules only. Each project's profile, saved sessions, taste overrides, screenshots and score history live in `~/.config/design-watch/<project>/` on the machine that runs it, never in a repo, because they carry client data.
