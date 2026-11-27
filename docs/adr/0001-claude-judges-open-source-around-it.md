# 0001: Claude judges the screens; open source does everything around it

Date: 27 Nov 2026. Status: accepted.

## Context

The judge reads screenshots and decides what is wrong with them. Papers from 2026 put Claude ahead of the general open models on UI understanding (UXBench: Claude 4.5 Sonnet 0.655, best open Qwen3-VL-Thinking 235B 0.585), show that every model is near chance at predicting which design users prefer (WiserUI-Bench), and show that a small model trained on UI data beats them all. The team runs AI through Claude Code on the subscription, with no API keys, on 16 GB Macs that are often short of memory. Research: `docs/research/judge-model.md`.

## Decision

- The judge is Claude, run as Claude Code subagents.
- Capture, accessibility rules, pixel gates, iOS driving and screen parsing use open-source tools (Playwright, axe-core, pixelmatch or odiff, Maestro, OmniParser).
- The judge answers checkable questions per rule and points at element ids (Set-of-Mark). It is never asked whether a design is good or which version is better.
- The judge sits behind one interface (screenshot, element list, rubric, taste, examples in; findings JSON out), so another model can replace it.

## Revisit when

- The teach loop holds about 2,000 graded screens: train and test a small open model on them.
- Subscription limits block nightly runs.
- Our graded set shows another model agreeing with the designer more often than Claude does.
