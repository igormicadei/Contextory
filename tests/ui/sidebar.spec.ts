import { test, expect } from "@playwright/test";

test("hook rebuild action follows the selected project and is disabled while busy", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.evaluate(() => {
    (window as any).contextoryMessages = [];
    window.postMessage(
      {
        type: "restore",
        dashboard: {
          root: "C:/Projects/selected",
          projectId: "selected",
          entities: [],
          events: [],
          connections: [],
          recipes: [],
          semantic: { ready: false },
        },
      },
      "*",
    );
  });
  const action = page.getByRole("button", {
    name: "Rebuild hooks",
    exact: true,
  });
  await expect(action).toBeEnabled();
  await action.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).contextoryMessages.filter(
          (message: any) => message.type === "rebuildHooks",
        ),
      ),
    )
    .toEqual([{ type: "rebuildHooks", projectId: "selected" }]);
  await page.evaluate(() =>
    window.postMessage(
      { type: "busy", value: true, projectId: "selected" },
      "*",
    ),
  );
  await expect(action).toBeDisabled();
});

test("gray native-agent buttons retry setup while observed connections can disconnect", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await expect(
    page.getByRole("button", { name: "Disconnect Codex", exact: true }),
  ).toBeVisible();
  const restore = async (
    current: boolean,
    hookCurrent = false,
    configured = true,
  ) =>
    page.evaluate(
      ({ current, hookCurrent, configured }) =>
        window.postMessage(
          {
            type: "restore",
            dashboard: {
              root: "C:/reopened",
              projectId: "reopened",
              sequence: 1,
              entities: [],
              events: [],
              recipes: [],
              semantic: { ready: false, model: "", detail: "" },
              connections: [
                {
                  provider: "codex",
                  configured,
                  mcpSeen: "2026-01-01T00:00:00Z",
                  mcpCurrent: current,
                  hookCurrent,
                },
              ],
            },
          },
          "*",
        ),
      { current, hookCurrent, configured },
    );
  const messages = () =>
    page.evaluate(() =>
      (
        window as unknown as {
          contextoryMessages: { type: string; provider?: string }[];
        }
      ).contextoryMessages.filter(
        (message) =>
          message.provider === "codex" &&
          ["connect", "disconnect"].includes(message.type),
      ),
    );
  await restore(false);
  const codex = page.getByRole("button", {
    name: "Retry Codex connection",
    exact: true,
  });
  await expect(codex.locator(".status-dot")).not.toHaveClass(/online/);
  await expect(codex).toHaveAttribute(
    "title",
    /waiting for native traffic in this service\. Click to retry connection setup/,
  );
  await codex.click();
  await expect
    .poll(messages)
    .toEqual([{ type: "connect", provider: "codex", projectId: "reopened" }]);
  await restore(false, true);
  await expect(codex.locator(".status-dot")).not.toHaveClass(/online/);
  await codex.press("Enter");
  await expect.poll(messages).toEqual([
    { type: "connect", provider: "codex", projectId: "reopened" },
    { type: "connect", provider: "codex", projectId: "reopened" },
  ]);
  await restore(true);
  const connected = page.getByRole("button", {
    name: "Disconnect Codex",
    exact: true,
  });
  await expect(connected.locator(".status-dot")).toHaveClass(/online/);
  await connected.click();
  await restore(false, false, false);
  const disconnected = page.getByRole("button", {
    name: "Connect Codex",
    exact: true,
  });
  await expect(disconnected.locator(".status-dot")).not.toHaveClass(/online/);
  await disconnected.click();
  await expect.poll(messages).toEqual([
    { type: "connect", provider: "codex", projectId: "reopened" },
    { type: "connect", provider: "codex", projectId: "reopened" },
    { type: "disconnect", provider: "codex", projectId: "reopened" },
    { type: "connect", provider: "codex", projectId: "reopened" },
  ]);
});

test("auto-connect can pause and resume from the footer across tabs and panel/sidebar layouts without disconnecting agents", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  const toggle = page.getByRole("switch", { name: "Auto-connect" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("button", { name: "Disconnect Codex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.setViewportSize({ width: 1280, height: 420 });
  await expect(toggle).toBeInViewport();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Refresh workspace" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { contextoryMessages: { type: string }[] }
      ).contextoryMessages.filter((message) => message.type === "disconnect"),
    ),
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(toggle).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
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
  ).toHaveCount(1);
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
  await expect(page.getByText(/Independent Contextory check/)).toBeVisible();
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
test("spec usage displays observed counters, keeps missing counts distinct and escapes native model names", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await page
    .getByRole("button", { name: /Retry temporary payment failures/ })
    .click();
  await page.getByRole("tab", { name: "Usage", exact: true }).click();
  await expect(
    page.getByText("3 native request attempts observed; 2 with token counts."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /fixture-model/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Reasoning \(included in output\): Unavailable/),
  ).toBeVisible();
  await expect(page.getByText(/Total: 1,200/)).toBeVisible();
  await page.getByRole("button", { name: "Refresh usage" }).click();
  await page.evaluate(() =>
    window.postMessage(
      {
        type: "toolResult",
        requestId: "usage:SPEC-demo",
        result: {
          attempts: 1,
          measuredAttempts: 0,
          groups: [
            {
              provider: "codex",
              model: "<img src=x onerror=alert(1)>",
              tokens: {},
            },
          ],
          note: "Counts unavailable.",
        },
      },
      "*",
    ),
  );
  await expect(page.getByRole("heading", { name: /<img src=x/ })).toBeVisible();
  await expect(page.getByText(/Total: Unavailable/)).toBeVisible();
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
    page.getByRole("group", { name: "Possible source flow" }),
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
        window as unknown as { contextoryMessages: { type: string }[] }
      ).contextoryMessages.some((m) => m.type === "source"),
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
          contextoryMessages: { type: string; requestId?: string }[];
        }
      ).contextoryMessages.some(
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
    page.getByRole("group", { name: "Possible source flow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Contextory views" }),
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
        window as unknown as { contextoryMessages: { type: string }[] }
      ).contextoryMessages.some((m) => m.type === "source"),
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
