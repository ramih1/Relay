import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function assertApiResponse(response: import("@playwright/test").Response, expectedStatus: number, label: string) {
  if (response.status() === expectedStatus) return;
  const body = (await response.text()).slice(0, 1_000);
  const message = `${label} returned ${response.status()}: ${body}`;
  if (process.env.CI) {
    const escaped = message.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.log(`::error file=test/e2e/relay-demo.spec.ts,line=18::${escaped}`);
  }
  throw new Error(message);
}

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Continue into Relay" });
  const dashboard = page.getByLabel("Relay dashboard");
  await expect(signIn.or(dashboard)).toBeVisible({ timeout: 15_000 });
  if (await signIn.isVisible()) {
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("Name").fill("Relay Test User");
    await page.getByLabel("Email").fill(`relay-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`);
    await page.getByLabel("Password").fill("RelayTest1234");
    const registration = page.waitForResponse(
      (response) => response.url().endsWith("/api/auth/register") && response.request().method() === "POST",
    );
    const initialState = page.waitForResponse(
      (response) => response.url().endsWith("/api/state") && response.request().method() === "GET",
    );
    await page.getByRole("button", { name: "Create secure workspace" }).click();
    await assertApiResponse(await registration, 201, "Registration");
    await assertApiResponse(await initialState, 200, "Initial workspace load");
  }
  await expect(page).toHaveTitle("Relay");
  await expect(dashboard).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Daily Focus" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approval Safety" })).toBeVisible();
}

test("desktop dashboard renders without browser errors", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The desktop shell runs once on desktop.");
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await enterWorkspace(page);
  const themeControls = page.getByLabel("Theme controls");
  await themeControls.hover();
  await themeControls.getByRole("button", { name: "Carbon" }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(600, 600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: false });

  expect(browserErrors).toEqual([]);
});

test("local AI creates an approved persistent task when Ollama is available", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The full assistant flow runs once on desktop.");

  const health = await page.request.get("/api/ai/health");
  expect(health.ok()).toBeTruthy();
  const healthPayload = await health.json();
  test.skip(healthPayload.status !== "connected", "Ollama is optional for shell verification.");
  expect(healthPayload).toMatchObject({ status: "connected" });
  expect(healthPayload.model).toMatch(/^qwen3:/);

  await enterWorkspace(page);
  const marker = `Relay browser verification task ${Date.now()}`;
  const command = page.getByPlaceholder("Ask Relay...");
  await command.fill(`Create a high priority task called ${marker} due tomorrow at 5 PM`);
  const assistantResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/assistant") && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await command.press("Enter");
  expect((await assistantResponse).ok()).toBeTruthy();

  await page.goto("/confirmations");
  const taskTitle = page.locator('input[placeholder="Task title"]').last();
  await expect(taskTitle).toHaveValue(marker);
  await taskTitle.locator("xpath=ancestor::div[contains(@class, 'app-card')]").getByRole("button", { name: "Approve" }).click();

  await page.goto("/tasks");
  await expect(page.getByText(marker, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(marker, { exact: true })).toBeVisible();
});

test("mobile dashboard exposes navigation, voice input, and notes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Responsive navigation is covered by the mobile project.");
  await enterWorkspace(page);
  await expect(page.getByRole("link", { name: "Assistant", exact: true }).last()).toBeVisible();
  await expect(page.getByText("Today's schedule", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /voice input/i })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard-mobile.png"), fullPage: false });

  await page.goto("/notes");
  await expect(page.getByText("Note Library", { exact: true })).toBeVisible();
});

test("authenticated application has no serious accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Accessibility audit runs once on desktop.");
  await enterWorkspace(page);
  const failures: Array<{ route: string; id: string; impact: string | null | undefined }> = [];
  for (const route of ["/", "/assistant", "/tasks", "/notes", "/reminders", "/calendar", "/workouts", "/nutrition", "/confirmations", "/notifications", "/settings"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    failures.push(...results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map((violation) => ({ route, id: violation.id, impact: violation.impact })));
  }
  expect(failures).toEqual([]);
});

test("health logs persist across workout and nutrition routes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Health workflow runs once on desktop.");
  await enterWorkspace(page);
  await page.goto("/workouts");
  await page.getByLabel("Activity").fill("Recovery walk");
  await page.getByLabel("Duration (minutes)").fill("25");
  await page.getByRole("button", { name: "Save Workout" }).click();
  await expect(page.getByText("Recovery walk", { exact: true })).toBeVisible();

  await page.goto("/nutrition");
  await page.getByLabel("Meal or food").fill("Yogurt bowl");
  await page.getByLabel("Calories").fill("420");
  await page.getByRole("button", { name: "Save Meal" }).click();
  await expect(page.getByText("Yogurt bowl", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Yogurt bowl", { exact: true })).toBeVisible();
});

test("separate accounts cannot read each other's workspace", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "User isolation runs once on desktop.");
  await enterWorkspace(page);
  const privateTask = `Private task ${Date.now()}`;
  await page.goto("/tasks");
  await page.getByPlaceholder("Task title").fill(privateTask);
  await page.getByPlaceholder("Due time, like Friday 5 PM").fill("Tomorrow, 5 PM");
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page.getByText(privateTask, { exact: true })).toBeVisible();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await enterWorkspace(secondPage);
  await secondPage.goto("/tasks");
  await expect(secondPage.getByText(privateTask, { exact: true })).toHaveCount(0);
  await secondContext.close();
});
