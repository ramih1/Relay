import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL("../components/dashboard/vision-dashboard.tsx", import.meta.url);
const appPath = new URL("../components/relay-app.tsx", import.meta.url);
const cssPath = new URL("../app/vision.css", import.meta.url);

test("dashboard follows the Vision composition instead of the legacy hero layout", async () => {
  const [dashboard, app, css] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(appPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(dashboard, /vision-stat-grid/);
  assert.match(dashboard, /vision-welcome-card/);
  assert.match(dashboard, /vision-analysis-grid/);
  assert.match(dashboard, /vision-progress-ring/);
  assert.match(dashboard, /vision-task-table/);
  assert.match(app, /vision-page-header/);
  assert.match(css, /@keyframes vision-card-in/);
  assert.match(css, /@keyframes vision-ring-in/);
  assert.doesNotMatch(app, /Good morning, \{profile\.name\}/);
  assert.doesNotMatch(app, /commandSamples\.slice/);
});

test("Vision layout includes fluid and reduced-motion states", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /@media \(max-width: 1280px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /grid-template-columns:\s*repeat\(4/);
});
