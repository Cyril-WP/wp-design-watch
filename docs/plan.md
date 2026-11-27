# Design Watch: plan

Status: planning (27 Nov 2026). A spike exists (`spikes/capture.cjs`); nothing else is built. The next step is a spec (`/mattpocock-skills:to-spec`), then tickets.

## The problem

Today a person asks Claude to open a page, look at it on a phone and a desktop, and grade it. That works for one page. It does not work for a product with hundreds of pages, three roles, six languages and a native app, where every deploy can break something that nobody opens that week.

Design Watch does the looking on a schedule. It photographs pages after each deploy, grades them against the team's own design rules, pins every problem on the screenshot, and learns from the calls a designer makes on its findings.

## Goals

- Grade every page a client's users can reach, on the surfaces they use (web desktop, web phone, native iOS), without a person opening them.
- Grade with the team's own taste, not a generic score. The team's past calls outrank any rulebook.
- Every finding is pinned (a box on the screenshot) and verified before it counts.
- Cheap enough to run after every deploy on one Mac, with no hosted service and no API key.
- One tool for every Webpuppies project. A project is a profile file, not a fork.

## Non-goals

- Pixel regression. Chromatic, Percy and Lost Pixel already answer "did anything change". Design Watch answers "did it get worse", and uses a pixel diff only to decide what to look at.
- Fixing. It can draft a fix when asked, never on its own.
- People walks. The fresh-eyes skill walks scenarios as personas. Design Watch looks at screens; the two share taste, pinning and scoring.

## Managing many pages

The size of the first client (Client A, a Next.js web app plus an Expo iOS app):

| Surface | Count |
| --- | --- |
| Web route files | 520 (368 fixed routes, 152 templates with parameters) |
| Biggest template parameters | `[token]` 19, `[slug]` 18, `[listingId]` 15, `[guideId]` 15, `[transactionId]` 15 |
| Web route groups | signed-in app 271, admin 110, public 94, bare pages 34 |
| Locales | 6 (one right-to-left, two CJK) |
| Roles | guest, two buyer tiers, agency, developer, admin |
| iOS screens | about 133 |

Watching every URL in every role, locale and viewport is tens of thousands of screenshots per run. The plan never does that. It watches templates, states and components, at a cadence set by how much each page matters and whether its code changed.

### 1. An inventory the tool builds itself

The page list is generated, not typed.

- Web: an adapter reads the framework's route tree (Next.js app router first), giving each route its path, parameters, route group and the role that group implies. A sitemap adapter and a manual list cover sites without a readable route tree.
- iOS: an adapter reads the navigator config and the existing Maestro flows to list screens and how to reach them.
- Every run diffs the inventory against the last one. A new route nobody has assigned a tier to is reported as unwatched, so coverage never silently shrinks.

### 2. Templates, not instances

A template with 300 instances (a listing page) is watched through a few chosen instances, picked by a per-template query in the profile:

- the fullest instance (most photos, longest description),
- the emptiest (missing photos, missing fields),
- the longest title and the biggest numbers,
- one per currency or other value that changes layout.

Three to five instances per template catch what one random instance misses, because layout breaks at the edges of the data.

### 3. Locales and roles by rotation

- Locales: the default locale every run. The right-to-left and one CJK locale weekly, because that is where layouts break. The rest monthly. Missing translation keys are not this tool's job; overflow and wrapping are.
- Roles: guest plus one saved session per role (cookies captured once by a person, as fresh-eyes does). The route group decides which role sees a route; admin routes are desktop only.

### 4. Tiers and cadence

| Tier | What | When | Size for Client A |
| --- | --- | --- | --- |
| 1 | Pages that earn or lose money: home, listing, enquiry, sign-in, membership, portal, shared links | every deploy, both viewports, all states | about 30 |
| 2 | Pages people use weekly | nightly, only if changed | about 150 |
| 3 | Long tail: admin, internal, rarely visited | weekly, one seventh each night | the rest |

Tiers start from route groups and a hand-pinned tier 1 list. Traffic data (analytics, search console) and git churn move pages between tiers later.

### 5. Look only at what changed

Two gates sit before the expensive judge:

1. **Code gate.** The deploy diff is mapped to routes through the import graph: a changed shared header marks every route that renders it. Tier 1 is always captured.
2. **Pixel gate.** Each captured screen is hashed (pixels and a normalised DOM snapshot) and compared with its last baseline. Unchanged screens keep their grade and cost nothing.

On a normal deploy this turns hundreds of candidate screens into a few dozen judged ones.

### 6. Group findings by component

Each finding gets a fingerprint: the rule it breaks plus a hash of the DOM subtree (web) or view path (iOS) it sits in. The same broken header on 80 pages is one finding with 80 pages, one ticket and one fix.

### 7. States, not only pages

Empty, loading, error and very long content are where designs break. They are produced on purpose:

- web: request interception (force an empty list, a slow response, a 500) and fixture accounts with known data,
- iOS: launch arguments and fixture accounts.

Tier 1 templates are graded in every state; the rest in their default state.

### 8. A budget per run

The judge is the only expensive step. Each run has a cap (for example 60 judged screens after a deploy, 300 nightly); anything over the cap queues for the next run, worst tier first. The machine also matters: one browser, at most two contexts, and a lock so that only one heavy job runs on the Mac at a time.

### 9. Coverage is a number

The board shows what share of routes and screens were graded in the last seven days, and lists any that were not. A watcher that quietly stops watching is worse than none.

## How it grades

Four layers, cheapest first. A finding needs a box on the screenshot or it does not count. Why Claude is the judge and which open-source tools sit around it: `docs/research/judge-model.md` and `docs/adr/0001-claude-judges-open-source-around-it.md`.

1. **Detector (no AI).** Computed styles and the accessibility tree: fonts outside the design file, off-palette colours, text under 12px, contrast, targets under 24px outside running text, unnamed controls, images without alt, sideways overflow. Rules come from impeccable's detector and the measurable rows of ui-ux-pro-max's UX guidelines.
2. **Judge (vision).** Claude Code subagents read each screenshot with the impeccable critique and audit rubric (Nielsen heuristics out of 40, P0 to P3), shown a few of the team's past verdicts as examples. Two passes; only findings both passes see are kept.
3. **Taste.** The team's own rules with their evidence (house fonts only, no eyebrow labels, word labels on every action, light only, the app's own type scale). On conflict the order of authority is: the designer's own calls, then the team's past decisions, then impeccable, then ui-ux-pro-max.
4. **Verify.** Detector hits must be confirmed by the judge (the spike's contrast check misread white text on a dark header every time). Blockers get a second look before they count.

Scores use the fresh-eyes rule: 100 minus 15 per blocker, 5 per snag, 1 per friction. A page's score is its worst viewport.

## The teach loop

Every finding on the board has three answers: Real (ticket it), Intended, Wrong.

- Intended and Wrong become taste rules with the screenshot as evidence, and the judge stops raising them.
- Every answer joins a graded example set. Before scores are trusted, the judge replays that set and its agreement with the designer is shown on the board.
- Real writes a ticket into the project's own tracker with the pinned screenshot.

## Architecture

Deep modules with small interfaces. The deterministic parts are a Node CLI (`dw`); the judge runs as Claude Code subagents on the Mac lane through a `/design-watch` skill, so no API key is needed.

| Module | Takes | Gives |
| --- | --- | --- |
| Inventory | a profile | the route and screen registry, with the diff since last run |
| Planner | registry, tiers, deploy diff, history, budget | a run plan: which screens, roles, locales, states |
| Capture | run plan | screenshots, DOM or view snapshots, per-element boxes |
| Gate | captures, baselines | the screens that changed |
| Detect | changed screens, design file | detector findings |
| Judge | changed screens, rubric, taste, examples | judged findings with boxes |
| Verify | all findings | confirmed, deduplicated findings with fingerprints |
| Store | everything above | run folder and score history, outside every repo |
| Report | a run | the board (static HTML), a digest, tickets |
| Teach | the designer's answers | taste rules and the example set |

Surfaces are adapters behind Capture: Playwright for web (real Chrome with a real browser signature, since plain headless was served a Cloudflare challenge), and the iOS simulator driven by Maestro for the app.

### Where things live

- This repo: the tool, generic rules, an example profile.
- `~/.config/design-watch/<project>/`: the project profile, saved sessions, taste overrides, runs, screenshots and history. Never in a repo, because screenshots and sessions carry client data.

## Seams to agree before code

1. The profile file: routes source, roles and sessions, tiers, locales, viewports, budgets, triggers.
2. The registry record: route template, parameters, group, role, tier, instance query.
3. The finding record: id, fingerprint, rule, layer, severity, surface, viewport, route template, box (CSS px or points), evidence, status.
4. The judge contract: what a subagent is given (screenshot, element boxes, rubric, taste, examples) and the exact JSON it must return.
5. The teach record: answer, who, when, the rule it creates.

## Delivery as tracer bullets

Each slice runs end to end and can be shown on its own.

1. **One route, one viewport, full loop.** Profile, capture, detector, one judge subagent, a board with pins.
2. **Inventory and tiers.** Route registry from the Next.js route tree, instance sampling for three templates, a nightly tier 1 run.
3. **Teach loop.** Answers become taste rules and examples; the board shows judge agreement.
4. **Change gate and triggers.** Deploy diff to routes, pixel gate, component fingerprints, score history and the digest.
5. **States.** Empty, loading and error for tier 1 through request interception and fixtures.
6. **iOS surface.** Simulator capture of tier 1 screens through Maestro.
7. **Second project.** Onboard another Webpuppies site from a profile alone, to prove the tool is generic.

## Open questions

- Which deploy step triggers a run, and does a run block anything or only report?
- Production public pages read-only, staging only, or both?
- Where the board is published, and who receives the digest.
- Judge budget per run, and the cap on concurrent heavy jobs on a shared Mac.
- iOS capture needs the simulator and Metro, which other sessions also use. Own simulator, or a booking lock?
- Which tracker tickets go to for each project.
