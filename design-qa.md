# Relay Vision Dashboard QA

## Direction

- Rebuilds the dashboard around the Creative Tim Vision UI composition instead of recoloring Relay's previous layout.
- Uses the reference's floating sidebar, breadcrumb and command header, four icon metrics, panoramic welcome card, paired analysis panels, tables, and timeline proportions.
- Keeps Relay's approval-first product identity and live tasks, reminders, calendar, email drafts, confirmations, notifications, and AI actions.
- Uses a dedicated `vision.css` layer and extracted dashboard component rather than extending the legacy dashboard JSX.

## Motion

- Staggers metric-card entry with transform and opacity only.
- Animates focus and safety gauge strokes without JavaScript animation loops.
- Adds a slow hero sheen, floating orbit, live-status pulse, hover lift, and directional icon movement.
- Disables animation delays and reduces durations when `prefers-reduced-motion` is enabled.

## Verified Surfaces

- Desktop dashboard at 1280 CSS pixels with a one-row header, four metrics, full hero, and two analysis panels above the fold.
- Mobile dashboard at 390 by 844 pixels with stacked cards, compact command input, bottom navigation, and no horizontal overflow.
- Tasks, confirmations, notification read state, AI command submission, and persisted task creation verified in Chromium.
- Carbon theme selected deterministically for reference screenshots; Light, Dawn, and Ocean remain available.

## Performance Baseline

- Production first-load JavaScript: 128 kB for application pages.
- Hero image: 175 kB JPEG.
- Local AI default: `qwen3:1.7b`, 2,048-token context, 45-second timeout.
- Playwright uses one worker to avoid unnecessary memory pressure on an 8 GB Mac.

## Current QA Result

- Lint and TypeScript pass without warnings or errors.
- All unit and structural contracts pass.
- Desktop shell, local AI persistence, and mobile navigation browser tests pass.
- No desktop console errors and no mobile horizontal overflow.
- Legacy dashboard JSX and unreachable composer, metric, hero, and focus CSS are removed.
