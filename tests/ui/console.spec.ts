import { test, expect } from "@playwright/test";

test("review navigation leaves dedicated source workbenches in place", async ({
  page,
}) => {
  await page.goto("/flow.html");
  await page.evaluate(() =>
    window.postMessage(
      { type: "navigate", screen: "approvals", projectId: "demo" },
      "*",
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Source flow", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Approvals", exact: true }),
  ).toHaveCount(0);
});

test("review alerts are visible before opening tools and lead to concrete human review", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await expect(page.locator(".main-nav > button")).toHaveCount(3);
  const alert = page.getByRole("button", { name: "Review pending knowledge" });
  await expect(alert).toContainText("1");
  await expect(page.locator(".workspace-tools")).not.toHaveAttribute("open");
  await alert.click();
  await expect(
    page.getByRole("heading", { name: "Pending changes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve change", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await expect(alert).toBeVisible();
});

test("service recovery retains work, reports stale data and clears on a successful connection", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await page
    .getByRole("button", { name: /Retry temporary payment failures/ })
    .click();
  await page
    .getByLabel("Specification details", { exact: true })
    .selectOption("decisions");
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "serviceConnection",
        state: "reconnecting",
        text: "Connection interrupted",
        nextRetryAt: Date.now() + 1000,
      },
      "*",
    ),
  );
  await expect(
    page.getByText("Reconnecting automatically", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Showing the last received workspace data."),
  ).toBeVisible();
  await expect(
    page.getByLabel("Specification details", { exact: true }),
  ).toHaveValue("decisions");
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "serviceConnection",
        state: "connected",
        checkedAt: new Date().toISOString(),
      },
      "*",
    ),
  );
  await expect(page.locator(".connection-alert")).toHaveCount(0);
  await expect(page.locator(".service-state")).toHaveText("Service connected");
  await expect(
    page.getByText("Retries must refer to the same transaction."),
  ).toBeVisible();
});

test("within-spec progress names running checks, evidence and blockers without a finish estimate", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Open work details →" }).click();
  await expect(
    page.getByRole("region", { name: "Specification progress" }),
  ).toBeVisible();
  await expect(
    page.getByText("Passing independent check recorded", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Recorded evidence, not a time estimate. Source freshness and completion are checked separately.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator(".request-card")).toHaveCount(1);
  await expect(page.getByRole("tablist")).toHaveCount(0);
});

for (const size of [
  { width: 320, height: 720 },
  { width: 760, height: 260 },
  { width: 1280, height: 420 },
])
  test(`review and recovery controls fit ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/sidebar.html");
    await expect(
      page.getByRole("button", { name: "Review pending knowledge" }),
    ).toBeInViewport();
    await page.getByRole("button", { name: "Approvals", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Approvals" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/console-review-${size.width}.png`,
    });
  });
