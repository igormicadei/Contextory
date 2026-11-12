import { test, expect } from "@playwright/test";
test("native companion has no chat composer and creates a request", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sidebar.html");
  await expect(
    page.getByRole("group", { name: "Native agents" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Disconnect Codex", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".work-row")).toHaveCount(8);
  await expect(page.locator(".activity li")).toHaveCount(3);
  await expect(page.locator("footer .connections .connection")).toHaveCount(3);
  await expect(page.locator("footer .connection .muted")).toHaveCount(0);
  await expect(page.locator(".intro")).toHaveCount(0);
  const progress = page.getByRole("progressbar", {
    name: "Make checkout reliable progress",
  });
  await expect(progress).toHaveAttribute("value", "1");
  await expect(progress).toHaveAttribute("max", "2");
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Knowledge", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page.getByRole("button", { name: "+ New request" }).click();
  await page.getByLabel("Title", { exact: true }).fill("New authorized work");
  await page
    .getByLabel("What should change?")
    .fill("Keep the original user intent.");
  await page
    .getByRole("button", { name: "Create request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "New authorized work" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("spec explanations, keyboard tabs, evidence origins and escaped content", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  const card = page.locator("#record-REQ-demo");
  await card
    .getByRole("button", { name: /Retry temporary payment failures/ })
    .click();
  await expect(card.locator(".spec-detail")).toHaveCount(1);
  await expect(page.locator("main > .spec-detail")).toHaveCount(0);
  await page.getByRole("tab", { name: "Issues", exact: true }).click();
  await expect(
    page.getByText("Reuse the original key for every attempt."),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Issues", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Decisions", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Retries must refer to the same transaction."),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Evidence", exact: true }).click();
  await expect(page.getByText(/Independent Relay check/)).toBeVisible();
  await page.getByRole("tab", { name: "Outcome", exact: true }).click();
  await expect(
    page.getByText("Preserved transaction identity across retries."),
  ).toBeVisible();
  await page.evaluate(() =>
    window.postMessage(
      { type: "notice", text: "<img src=x onerror=alert(1)>" },
      "*",
    ),
  );
  await expect(page.getByRole("status")).toContainText("<img src=x");
  await expect(page.locator("img")).toHaveCount(0);
});
test("search and bounded source diagram support navigation and expansion", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page.getByLabel("Filter requests and their history").fill("contention");
  await expect(page.locator(".request-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Search history", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make checkout reliable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Code map", exact: true }).click();
  await page.getByRole("button", { name: "Trace current symbol" }).click();
  await expect(
    page.getByRole("img", { name: "Possible source flow" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  await page.getByRole("button", { name: "Export SVG", exact: true }).click();
  await page.locator('g[data-id="n1"]').press("Enter");
  await page.getByRole("button", { name: "Trace from this node" }).click();
  await page.getByText("Analysis boundaries").click();
  await expect(page.getByText("retryPayment(): depth")).toBeVisible();
  await page.locator('g[data-id="n1"]').press("Enter");
  await page
    .getByRole("button", { name: "src/payments.ts:11", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { relayMessages: { type: string }[] }
      ).relayMessages.some((m) => m.type === "source"),
    ),
  ).toBe(true);
});
test("full history pages beyond recent events and navigates to linked specs", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".activity li")).toHaveCount(40);
  await page
    .locator("main")
    .evaluate((element) => (element.scrollTop = element.scrollHeight));
  await page.getByRole("button", { name: "Load older activity" }).click();
  await expect(page.locator(".activity li")).toHaveCount(80);
  expect(
    await page.locator("main").evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Load older activity" }).click();
  await expect(page.locator(".activity li")).toHaveCount(85);
  await expect(page.getByText("Beginning of history.")).toBeVisible();
  await page
    .locator(".history-links")
    .first()
    .getByRole("button", { name: "Retry temporary payment failures" })
    .click();
  await expect(page.locator("#record-REQ-demo .spec-detail")).toBeVisible();
  await page
    .locator("#record-REQ-demo")
    .getByRole("button", { name: "Export request report" })
    .click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as {
          relayMessages: { type: string; requestId?: string }[];
        }
      ).relayMessages.some(
        (m) => m.type === "report" && m.requestId === "REQ-demo",
      ),
    ),
  ).toBe(true);
});
test("standalone diagram surface renders flow without a duplicate overview", async ({
  page,
}) => {
  await page.goto("/flow.html");
  await expect(
    page.getByRole("heading", { name: "Source flow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Possible source flow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Relay views" }),
  ).toBeHidden();
  await expect(page.getByRole("heading", { name: /Your project/ })).toHaveCount(
    0,
  );
});
test("relationship workbench view explains records, sources and links back to the request", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await page
    .getByRole("button", { name: /Retry temporary payment failures/ })
    .click();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Explore relationships" }).click();
  const relationships = await popup;
  await relationships.setViewportSize({ width: 1100, height: 850 });
  await expect(
    relationships.getByRole("heading", { name: "Relationships", exact: true }),
  ).toBeVisible();
  await expect(
    relationships.getByText("Make checkout reliable", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    relationships.getByText("SPEC-demo", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    relationships.getByText(
      "Checkout reuses the order's idempotency key on each attempt.",
    ),
  ).toBeVisible();
  await expect(
    relationships.getByText(
      "The follow-up request uses the same payment contract.",
    ),
  ).toBeVisible();
  const source = relationships.getByRole("button", {
    name: "src/payments.ts #checkout",
    exact: true,
  });
  await source.click();
  expect(
    await relationships.evaluate(() =>
      (
        window as unknown as { relayMessages: { type: string }[] }
      ).relayMessages.some((m) => m.type === "source"),
    ),
  ).toBe(true);
  await relationships
    .getByRole("button", { name: "Make checkout reliable", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make checkout reliable" }),
  ).toBeVisible();
  await expect(page.locator(".notice")).toHaveCount(0);
  await relationships
    .getByRole("button", { name: "Preserve payment identity", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Decisions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Retries must refer to the same transaction."),
  ).toBeVisible();
  await relationships.setViewportSize({ width: 320, height: 800 });
  expect(
    await relationships.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
for (const width of [320, 860])
  test(`layout fits ${width}px and remains usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/sidebar.html");
    const footer = page.locator("footer");
    const initial = (await footer.boundingBox())!;
    expect(Math.abs(initial.y + initial.height - 900)).toBeLessThan(2);
    await page
      .locator("main")
      .evaluate((element) => (element.scrollTop = element.scrollHeight));
    expect((await footer.boundingBox())!.y).toBeCloseTo(initial.y, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Requests", exact: true }).click();
    await page
      .getByLabel("Filter requests and their history")
      .fill("no matching request");
    expect((await footer.boundingBox())!.y).toBeCloseTo(initial.y, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
