import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../app/globals.css", import.meta.url);
const appPath = new URL("../components/relay-app.tsx", import.meta.url);

test("electric blue shell uses cheap motion and reduced-motion safeguards", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /--accent:\s*#3b82f6/);
  assert.match(css, /\.ambient-aurora/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.relay-sidebar\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css.match(/\.relay-shell\s*\{[\s\S]*?\}/)?.[0] ?? "", /backdrop-filter/);
});

test("dashboard is bounded and search work is deferred", async () => {
  const app = await readFile(appPath, "utf8");

  assert.match(app, /useDeferredValue/);
  assert.match(app, /className="dashboard-metrics"/);
  assert.match(app, /className="ambient-aurora"/);
  assert.match(app, /pendingApprovals\.slice\(0, 3\)/);
  assert.doesNotMatch(app, /void loadInsights\(\)/);
});
