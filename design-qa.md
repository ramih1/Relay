# Relay Overhaul Visual QA

## Direction

- Uses the Creative Tim Vision UI dashboard as visual inspiration without adopting its older React and Chakra stack.
- Keeps Relay's approval-first product identity, navigation, data model, and accessibility behavior.
- Uses a navy command-center canvas, violet focus states, compact metric cards, and a generated neural-wave hero.

## Verified Surfaces

- Desktop dashboard at the Playwright Desktop Chrome viewport.
- Mobile notes workspace at 390 by 844 pixels.
- Carbon theme selected deterministically for reference screenshots.
- Light, Dawn, and Ocean remain available from the top-right hover/focus theme rail and Settings.
- Browser voice input remains review-first and never submits a transcript automatically.

## Performance Baseline

- Production first-load JavaScript: 126 kB for application pages.
- Local AI default: `qwen3:1.7b`, 2,048-token context, 45-second timeout.
- Browser checks run with one worker to avoid unnecessary memory pressure on an 8 GB Mac.
- Decorative motion uses transforms and opacity and respects `prefers-reduced-motion`.

## Current QA Result

- No desktop console or page errors.
- No mobile horizontal overflow in the verified workspace.
- Schedule accepts both saved ISO timestamps and human-readable seed times.
- Sidebar contrast remains readable across every theme.
- Calls and call-related records, actions, routes, and UI are removed.
