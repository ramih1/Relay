import { expect, test } from "@playwright/test";

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Continue into Relay" });
  if (await signIn.isVisible().catch(() => false)) await signIn.click();
  await expect(page).toHaveTitle("Relay");
  await expect(page.getByText("Today Brief", { exact: true })).toBeVisible();
}

test("dashboard renders without browser errors and local AI creates an approved persistent task", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The full assistant flow runs once on desktop.");
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await enterWorkspace(page);
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: false });

  const health = await page.request.get("/api/ai/health");
  expect(health.ok()).toBeTruthy();
  const healthPayload = await health.json();
  expect(healthPayload).toMatchObject({ status: "connected" });
  expect(healthPayload.model).toMatch(/^qwen3:/);

  const marker = `Relay browser verification task ${Date.now()}`;
  const command = page.getByPlaceholder("Try: Remind me to study tomorrow at 10am");
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

  expect(browserErrors).toEqual([]);
});

test("mobile dashboard exposes navigation and transparent simulated-call copy", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Responsive navigation is covered by the mobile project.");
  await enterWorkspace(page);
  await expect(page.getByRole("link", { name: "Assistant", exact: true }).last()).toBeVisible();
  await page.goto("/calls");
  await expect(page.getByText(/simulated/i).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("calls-mobile.png"), fullPage: false });
});
