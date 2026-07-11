# Relay Electric Blue Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a sleek, responsive electric-blue Relay interface that preserves functionality and reduces expensive rendering and visual effects.

**Architecture:** Keep the existing Next.js routes and provider contract, but simplify the dashboard composition and move its visual hierarchy into reusable CSS tokens. Optimize client work with deferred search values, bounded dashboard lists, content visibility, and cheaper compositing.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Playwright.

## Global Constraints

- Preserve all existing routes, CRUD workflows, approvals, AI commands, themes, and integrations.
- Do not add runtime dependencies.
- Use transform and opacity for ambient motion and support reduced motion.
- Keep the interface usable from 320px wide through large desktop viewports.

---

### Task 1: Lock the visual and performance contracts

**Files:**
- Create: `docs/superpowers/specs/2026-07-11-electric-blue-redesign-design.md`
- Create: `test/frontend-contract.test.ts`

- [ ] Write a contract test for the theme, motion, and performance selectors.
- [ ] Run the test and confirm it fails against the old frontend.
- [ ] Implement the new selectors and confirm the test passes.

### Task 2: Simplify the dashboard hierarchy

**Files:**
- Modify: `components/relay-app.tsx`
- Modify: `app/globals.css`

- [ ] Add a compact four-metric overview.
- [ ] Replace the oversized dashboard stack with Today, Schedule, Priority, Confirmations, and Notifications surfaces.
- [ ] Keep all removed dashboard tools available through their existing navigation routes.

### Task 3: Improve client responsiveness

**Files:**
- Modify: `components/relay-app.tsx`
- Modify: `app/globals.css`

- [ ] Use deferred values for task, note, and reminder searches.
- [ ] Limit above-the-fold lists and add `content-visibility` to long route surfaces.
- [ ] Remove broad shell/card blur and reduce continuously composited layers.

### Task 4: Verify and publish

**Files:**
- Create: `design-qa.md`
- Modify: `test/e2e/relay-demo.spec.ts` only if the simplified hierarchy changes selectors.

- [ ] Run unit tests, typecheck, lint, and production build.
- [ ] Capture desktop and mobile screenshots and test primary navigation, theme, command, and approval flows.
- [ ] Compare the implementation with the approved reference and record a passing design QA report.
- [ ] Commit, push, and open a GitHub pull request.

