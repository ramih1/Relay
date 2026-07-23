import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../app/globals.css", import.meta.url);
const visionCssPath = new URL("../app/vision.css", import.meta.url);
const appPath = new URL("../components/relay-app.tsx", import.meta.url);
const dashboardPath = new URL("../components/dashboard/vision-dashboard.tsx", import.meta.url);

test("Vision-inspired shell uses cheap motion and reduced-motion safeguards", async () => {
  const css = `${await readFile(cssPath, "utf8")}\n${await readFile(visionCssPath, "utf8")}`;

  assert.match(css, /--accent:\s*#7654ff/);
  assert.match(css, /\.vision-welcome-card/);
  assert.match(css, /\.ambient-aurora/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.relay-sidebar\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css.match(/\.relay-shell\s*\{[\s\S]*?\}/)?.[0] ?? "", /backdrop-filter/);
});

test("dashboard is bounded and search work is deferred", async () => {
  const [app, dashboard] = await Promise.all([readFile(appPath, "utf8"), readFile(dashboardPath, "utf8")]);

  assert.match(app, /useDeferredValue/);
  assert.match(app, /<VisionDashboard/);
  assert.match(app, /className="ambient-aurora"/);
  assert.match(dashboard, /pendingActions\.slice\(0, 2\)/);
  assert.match(dashboard, /formatScheduleTime\(event\.start\)/);
  assert.doesNotMatch(app, /void loadInsights\(\)/);
});
