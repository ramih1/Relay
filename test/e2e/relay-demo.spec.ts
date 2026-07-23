import { expect, test } from "@playwright/test";

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Continue into Relay" });
  if (await signIn.isVisible().catch(() => false)) await signIn.click();
  await expect(page).toHaveTitle("Relay");
  await expect(page.getByLabel("Relay dashboard")).toBeVisible();
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
