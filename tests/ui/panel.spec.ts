import { test, expect, type Page } from "@playwright/test";

async function shellFits(page: Page, height: number) {
  const footer = (await page.locator("footer").boundingBox())!;
  expect(footer.y + footer.height).toBeCloseTo(height, 0);
  expect(footer.height).toBeLessThan(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("group", { name: "Native agents" }),
  ).toBeVisible();
}

for (const size of [
  { width: 760, height: 260 },
  { width: 1280, height: 420 },
  { width: 1920, height: 360 },
])
  test(`horizontal panel uses ${size.width}×${size.height} without losing work or footer controls`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/sidebar.html");
    await expect(page.locator("body")).toHaveAttribute(
      "data-layout",
      "horizontal",
    );
    const work = (await page.locator(".overview-work").boundingBox())!;
    const activity = (await page.locator(".overview-activity").boundingBox())!;
    expect(work.y).toBeCloseTo(activity.y, 0);
    expect(activity.x).toBeGreaterThan(work.x + work.width);
    expect((await page.locator(".app-header").boundingBox())!.y).toBeCloseTo(
      (await page.locator(".main-nav").boundingBox())!.y,
      0,
    );
    await expect(page.locator(".work-row")).toHaveCount(8);
    await expect(page.locator(".activity li")).toHaveCount(3);
    await expect(page.locator(".app-header .workspace-name")).toHaveText(
      "Checkout",
    );
    await page.screenshot({
      path: `artifacts/panel-overview-${size.width}.png`,
    });
    const last = page.locator('.work-row[data-id="REQ-demo"]');
    await last.focus();
    const list = (await page.locator(".work-list").boundingBox())!;
    const lastBox = (await last.boundingBox())!;
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(
      list.y + list.height + 1,
    );
    await shellFits(page, size.height);
    if (size.width === 1280) {
      const third = (await page
        .locator(".overview-activity .activity li")
        .nth(2)
        .boundingBox())!;
      expect(third.y + third.height).toBeLessThanOrEqual(
        activity.y + activity.height + 1,
      );
    }
  });

test("moving between panel and sidebar retains the spec, detail tab, expanded milestone and request draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await expect(
    page.locator(".request-inspector #detail-SPEC-demo"),
  ).toHaveCount(1);
  await expect(page.locator(".request-card .spec-detail")).toHaveCount(0);
  const list = (await page.locator(".request-list").boundingBox())!;
  expect(
    (await page.locator(".request-inspector").boundingBox())!.x,
  ).toBeGreaterThan(list.x + list.width);
  await page.getByRole("tab", { name: "Issues", exact: true }).click();
  await expect(
    page.getByText("Reuse the original key for every attempt."),
  ).toBeAttached();
  await page.screenshot({ path: "artifacts/panel-requests.png" });
  await page.getByRole("button", { name: "+ New request" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Preserve my request draft");
  await page
    .getByLabel("What should change?")
    .fill("Keep the selected spec when changing dock position.");
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(page.locator("body")).toHaveAttribute("data-layout", "vertical");
  await expect(page.locator("#record-REQ-demo .spec-detail")).toHaveCount(1);
  await expect(
    page.getByRole("tab", { name: "Issues", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-milestone="MS-demo"]')).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Preserve my request draft",
  );
  await page.setViewportSize({ width: 1280, height: 420 });
  await expect(page.locator("body")).toHaveAttribute(
    "data-layout",
    "horizontal",
  );
  await expect(
    page.locator(".request-inspector #detail-SPEC-demo"),
  ).toHaveCount(1);
  await expect(page.getByLabel("What should change?")).toHaveValue(
    "Keep the selected spec when changing dock position.",
  );
  await expect(
    page.getByRole("tab", { name: "Issues", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Filter requests and their history")
    .fill("nothing-matches-this");
  await expect(page.locator(".request-card")).toHaveCount(0);
  await expect(page.locator(".request-inspector .spec-detail")).toHaveCount(0);
  await shellFits(page, 420);
});

test("workspace identity stays visible on every tab, layout and standalone view, including long names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/sidebar.html");
  for (const name of ["Overview", "Requests", "History", "Code map"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".app-header .workspace-name")).toHaveText(
      "Checkout",
    );
    await expect(page.locator(".app-header .workspace-name")).toBeInViewport();
  }
  await page.evaluate(() => {
    document.body.dataset.workspaceName =
      'A very long workspace name with <source> & "quoted" sections';
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".workspace-name")).toHaveText(
    'A very long workspace name with <source> & "quoted" sections',
  );
  await expect(page.locator(".workspace-name source")).toHaveCount(0);
  await shellFits(page, 420);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.locator(".workspace-name")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const path of ["/flow.html", "/relationships.html"]) {
    await page.goto(path);
    await expect(page.locator(".app-header .workspace-name")).toHaveText(
      "Checkout",
    );
  }
});

test("history and source flow use bounded panel scrolling and retain their position on refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-feed .activity li")).toHaveCount(40);
  await page.screenshot({ path: "artifacts/panel-history.png" });
  await page
    .locator(".history-feed")
    .evaluate((element) => (element.scrollTop = 450));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect
    .poll(() =>
      page.locator(".history-feed").evaluate((element) => element.scrollTop),
    )
    .toBe(450);
  await shellFits(page, 420);
  await page.getByRole("button", { name: "Code map", exact: true }).click();
  await page.getByRole("button", { name: "Trace current symbol" }).click();
  await expect(page.locator(".flow-diagram")).toBeVisible();
  const diagram = (await page.locator(".diagram-scroll").boundingBox())!;
  expect(diagram.height).toBeGreaterThan(150);
  expect(diagram.y + diagram.height).toBeLessThan(
    (await page.locator("footer").boundingBox())!.y,
  );
  await page.screenshot({ path: "artifacts/panel-flow.png" });
  await page
    .locator(".diagram-scroll")
    .evaluate((element) => (element.scrollTop = 35));
  await page.getByRole("button", { name: "Refresh workspace" }).click();
  await expect
    .poll(() =>
      page.locator(".diagram-scroll").evaluate((element) => element.scrollTop),
    )
    .toBe(35);
  await shellFits(page, 420);
});

test("short panels keep specification controls reachable and a useful source diagram viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 260 });
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await expect(
    page.getByRole("tab", { name: "Contract", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "artifacts/panel-requests-760.png" });
  await page.getByRole("button", { name: "Code map", exact: true }).click();
  await page.getByRole("button", { name: "Trace current symbol" }).click();
  await expect(page.locator(".flow-diagram")).toBeVisible();
  expect(
    (await page.locator(".diagram-scroll").boundingBox())!.height,
  ).toBeGreaterThanOrEqual(120);
  await expect(page.locator(".diagram-scroll")).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "artifacts/panel-flow-760.png" });
  await page.locator(".analysis-limits summary").scrollIntoViewIfNeeded();
  await expect(page.locator(".analysis-limits summary")).toBeInViewport();
  await shellFits(page, 260);
});

test("panel follows the active theme and a tall narrow view keeps the sidebar layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/sidebar.html?theme=light");
  await page.screenshot({ path: "artifacts/panel-light.png" });
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      "--vscode-panel-background",
      "rgb(20, 30, 40)",
    ),
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(20, 30, 40)",
  );
  await page.evaluate(() =>
    (
      window as unknown as { setContextoryPreviewTheme(name: string): void }
    ).setContextoryPreviewTheme("high-contrast"),
  );
  await expect(page.locator(".connection").first()).toHaveCSS(
    "border-top-color",
    "rgb(111, 195, 223)",
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.locator("body")).toHaveAttribute("data-layout", "vertical");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await page.screenshot({ path: "artifacts/panel-sidebar-320.png" });
  expect((await page.locator(".main-nav").boundingBox())!.y).toBeGreaterThan(
    (await page.locator(".app-header").boundingBox())!.y,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
