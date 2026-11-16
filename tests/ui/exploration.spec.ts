import { test, expect } from "@playwright/test";

test("architecture drills from map to file and symbol, filters direct connections and restores context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/architecture.html");
  await expect(page.locator(".graph-node.subsystem")).toHaveCount(2);
  await page.locator('g[data-id="src/payments"]').press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Architecture location" }),
  ).toContainText("src/payments");
  await page
    .getByRole("complementary", { name: "Repository explorer" })
    .getByRole("button", { name: "payments.ts", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Architecture location" }),
  ).toContainText("payments.ts");
  const inspector = page.getByRole("complementary", {
    name: "Source inspector",
  });
  await expect(
    inspector.getByRole("heading", { name: "charge", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Direction", exact: true })
    .selectOption("incoming");
  await expect(page.locator("#architecture-canvas .graph-edge")).toHaveCount(1);
  await expect(inspector).toContainText("checkout");
  await page
    .getByRole("combobox", { name: "Direction", exact: true })
    .selectOption("outgoing");
  await expect(inspector).toContainText("saveOrder");
  await expect(inspector).not.toContainText("checkout");
  await inspector.getByRole("button", { name: "Explore connections" }).click();
  const requests = await page.evaluate(() =>
    (
      window as unknown as {
        contextoryMessages: {
          name: string;
          arguments: { query: string; paths: string[] };
        }[];
      }
    ).contextoryMessages.filter(
      (m) => m.name === "contextory_code_context_get",
    ),
  );
  expect(requests.some((r) => r.arguments.paths[0] === "src/payments.ts")).toBe(
    true,
  );
  expect(requests.at(-1)?.arguments.query).toBe(
    "source:src/payments.ts#charge",
  );
  expect(requests.at(-1)?.arguments.paths).toEqual([]);
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Direction", exact: true }),
  ).toHaveValue("outgoing");
  await page.getByRole("button", { name: "Project", exact: true }).click();
  await expect(page.locator(".graph-node.subsystem")).toHaveCount(2);
  await page.screenshot({
    path: "artifacts/architecture-explorer.png",
    fullPage: true,
  });
});

test("matrix states dependency direction and links back to the scoped explorer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/architecture.html?theme=light");
  await page.getByRole("button", { name: "Matrix", exact: true }).click();
  await expect(page.getByRole("caption")).toContainText(
    "Rows depend on columns",
  );
  await page
    .getByRole("button", {
      name: "src/service depends on src/payments: 3 links",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Architecture location" }),
  ).toContainText("src/service");
  await expect(
    page.getByRole("button", { name: "Map", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("map zoom and viewport persist when selecting a symbol and keyboard focus remains usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/architecture.html");
  await page.getByRole("searchbox").fill("charge");
  await page.getByRole("button", { name: "Find context", exact: true }).click();
  const svg = page.locator("#architecture-canvas svg");
  const width = Number(await svg.getAttribute("width"));
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(Number(await svg.getAttribute("width"))).toBeGreaterThan(width);
  const zoomed = await svg.getAttribute("width");
  await page.locator('g[data-id="code:charge"]').press("Enter");
  await expect(svg).toHaveAttribute("width", zoomed!);
  await expect(
    page
      .getByRole("complementary", { name: "Repository explorer" })
      .getByRole("button", { name: "charge · function" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(":focus")).toHaveAttribute(
    "data-id",
    "code:charge",
  );
  await page.getByRole("button", { name: "Fit map to view" }).click();
  expect(
    await svg.evaluate((s) => s.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(
    await page.locator("#architecture-canvas").evaluate((e) => e.clientWidth),
  );
});

test("flow steps synchronize selection, typed filters, focus, source and viewport controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/flow.html");
  await page.locator('g[data-id="n2"]').press("Enter");
  const inspector = page.getByRole("complementary", {
    name: "Flow step inspector",
  });
  await expect(
    inspector.getByRole("heading", { name: "payment succeeded?", exact: true }),
  ).toBeVisible();
  await expect(inspector).toContainText("Incoming · 1");
  await expect(inspector).toContainText("Outgoing · 2");
  await page
    .getByRole("button", { name: "Focus selected step", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Connections", exact: true })
    .selectOption("branch");
  await expect(page.locator("#flow-canvas .graph-node")).toHaveCount(3);
  await expect(page.locator("#flow-canvas .graph-edge")).toHaveCount(2);
  await inspector
    .getByRole("button", { name: "src/payments.ts:12", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as {
          contextoryMessages: { type: string; source?: { line: number } }[];
        }
      ).contextoryMessages.some(
        (m) => m.type === "source" && m.source?.line === 11,
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fit map to view" }).click();
  await page.screenshot({
    path: "artifacts/code-map-explorer.png",
    fullPage: true,
  });
});

test("new exploration remains bounded at narrow widths and resets safely after a source-query error", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/architecture.html?theme=light");
  await page.getByRole("button", { name: "Matrix", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.getByRole("searchbox").fill("fail");
  await page.getByRole("button", { name: "Find context", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Source index unavailable",
  );
  await expect(page.getByText("Loading source context…")).toHaveCount(0);
  await page.getByRole("searchbox").fill("missing");
  await page.getByRole("button", { name: "Find context", exact: true }).click();
  await expect(
    page.getByText("No indexed context matched.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Project", exact: true }).click();
  await expect(page.locator(".graph-node.subsystem")).toHaveCount(2);
  await page.goto("/flow.html?theme=light");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
