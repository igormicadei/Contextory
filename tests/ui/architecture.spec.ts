import { test, expect } from "@playwright/test";

test("architecture query, provenance notices, source navigation and refresh work", async ({
  page,
}) => {
  await page.goto("/architecture.html");
  await expect(
    page.getByRole("heading", { name: "Architecture", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("12 files · 38 symbols · 82 relationships"),
  ).toBeVisible();
  await page.getByText("Coverage is partial").click();
  await expect(
    page.getByText("Dynamic call targets remain unresolved."),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("charge");
  await page.getByRole("button", { name: "Find context" }).click();
  await expect(
    page
      .locator(".architecture-context")
      .getByRole("heading", { name: "charge", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preserve payment identity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preserve payment identity" }).click();
  await page
    .locator(".architecture-context")
    .getByRole("button", { name: /src\/payments.ts/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Refresh code index" }).click();
  const messages = await page.evaluate(
    () =>
      (window as unknown as { contextoryMessages: Record<string, unknown>[] })
        .contextoryMessages,
  );
  expect(
    messages.some(
      (m) =>
        m.type === "source" &&
        (m.source as { path: string }).path === "src/payments.ts",
    ),
  ).toBe(true);
  expect(
    messages.some((m) => m.type === "openRecord" && m.id === "DEC-demo"),
  ).toBe(true);
  expect(
    messages.filter((m) => m.name === "contextory_code_architecture_get")
      .length,
  ).toBeGreaterThan(1);
  await page.screenshot({
    path: "artifacts/architecture-dark.png",
    fullPage: true,
  });
});

test("empty, building and failed architecture snapshots keep refresh and query controls usable", async ({
  page,
}) => {
  await page.goto("/architecture.html");
  for (const state of ["empty", "building", "failed"]) {
    await page.evaluate(
      (state) =>
        window.postMessage(
          {
            type: "toolResult",
            requestId: "architecture",
            result: {
              status: {
                state,
                files: 0,
                symbols: 0,
                edges: 0,
                partial: state === "failed",
                gaps:
                  state === "failed"
                    ? ["Parser unavailable; configure Python or retry."]
                    : [],
              },
              conventions: [],
              subsystems: [],
              entryPoints: [],
              hubs: [],
              dependencies: [],
            },
          },
          location.origin,
        ),
      state,
    );
    await expect(page.locator(".architecture-state .badge")).toHaveText(state);
    await expect(
      page.getByRole("button", { name: "Refresh code index" }),
    ).toBeEnabled();
    await expect(page.getByRole("searchbox")).toBeEnabled();
  }
  await page.getByText("Coverage is partial").click();
  await expect(
    page.getByText("Parser unavailable; configure Python or retry."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh code index" }).click();
  await expect(page.locator(".architecture-state .badge")).toHaveText("ready");
});

test("architecture stays usable at narrow widths, in light theme and with no query results", async ({
  page,
}) => {
  await page.goto("/sidebar.html?theme=light");
  await page.getByRole("button", { name: "Architecture", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(page.getByRole("searchbox")).toBeInViewport();
  await page.getByRole("searchbox").fill("missing");
  await page.getByRole("button", { name: "Find context" }).click();
  await expect(page.getByText(/No indexed context matched/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/architecture-light-320.png",
    fullPage: true,
  });
});
