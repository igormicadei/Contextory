import { openTool } from "./navigation";
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
            requestId: (
              window as unknown as {
                contextoryMessages: Record<string, unknown>[];
              }
            ).contextoryMessages
              .filter((m) => m.name === "contextory_code_architecture_get")
              .at(-1)?.requestId,
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

test("reference codebases scope maps, context, source and trace navigation and ignore old responses", async ({
  page,
}) => {
  await page.goto("/architecture.html");
  await page.getByRole("button", { name: "Add reference" }).click();
  const picker = page.getByRole("combobox", { name: "Codebase", exact: true });
  await expect(picker).toHaveValue("ref-legacy");
  await expect(
    page.getByText("Reference: Legacy checkout", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".reference-identity")).toContainText(
    "C:/Projects/LegacyCheckout",
  );
  await page.getByRole("searchbox").fill("charge");
  await page.getByRole("button", { name: "Find context" }).click();
  await expect(
    page.getByRole("button", { name: "Preserve payment identity" }),
  ).toHaveCount(0);
  await page
    .locator(".architecture-context")
    .getByRole("button", { name: /src\/payments.ts/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Trace symbol" }).click();
  const messages = await page.evaluate(
    () =>
      (window as unknown as { contextoryMessages: Record<string, any>[] })
        .contextoryMessages,
  );
  expect(
    messages.some(
      (m) => m.type === "source" && m.source.codebaseId === "ref-legacy",
    ),
  ).toBe(true);
  expect(
    messages.some(
      (m) => m.type === "traceReference" && m.input.codebaseId === "ref-legacy",
    ),
  ).toBe(true);
  const oldArchitecture = messages
    .filter((m) => m.name === "contextory_code_architecture_get")
    .at(-1)!;
  const oldContext = messages
    .filter((m) => m.name === "contextory_code_context_get")
    .at(-1)!;
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/architecture-reference-320.png",
    fullPage: true,
  });
  await picker.selectOption("current");
  await page.getByRole("searchbox").fill("charge");
  await page.getByRole("button", { name: "Find context" }).click();
  await page.evaluate(
    ({ oldArchitecture, oldContext }) => {
      window.postMessage(
        {
          type: "toolResult",
          requestId: oldArchitecture.requestId,
          result: {
            status: { state: "failed", files: 900, symbols: 0, edges: 0 },
            subsystems: [],
            dependencies: [],
            entryPoints: [],
            hubs: [],
            conventions: [],
          },
        },
        location.origin,
      );
      window.postMessage(
        {
          type: "toolResult",
          requestId: oldContext.requestId,
          result: {
            symbols: [{ id: "leak", name: "LeakedReference" }],
            records: [],
            relationships: [],
          },
        },
        location.origin,
      );
    },
    { oldArchitecture, oldContext },
  );
  await expect(page.locator(".architecture-state .badge")).toHaveText("ready");
  await expect(page.getByText("LeakedReference")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preserve payment identity" }),
  ).toBeVisible();
  await picker.selectOption("ref-legacy");
  await page.getByRole("button", { name: "Detach reference" }).click();
  await expect(picker).toHaveValue("current");
  await expect(picker.locator("option")).toHaveCount(1);
});

test("architecture stays usable at narrow widths, in light theme and with no query results", async ({
  page,
}) => {
  await page.goto("/sidebar.html?theme=light");
  await openTool(page, "Architecture");
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
