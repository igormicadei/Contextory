import { test, expect } from "@playwright/test";
import { openTool } from "./navigation";

test("documentation search, source freshness, locale, record navigation and maintenance use the current project", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await openTool(page, "Documentation");
  await expect(
    page.getByRole("heading", { name: "Project documentation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Retry a payment", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".documentation-section .badge.stale"),
  ).toBeVisible();
  expect(await page.locator(".documentation-section script").count()).toBe(0);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("pt-BR");
  await page
    .getByRole("button", { name: "Find documentation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Repetir pagamentos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Find an explanation", exact: true })
    .fill("no matches");
  await page
    .getByRole("button", { name: "Find documentation", exact: true })
    .click();
  await expect(
    page.getByText("No explanations match. Broaden the query or source path."),
  ).toBeVisible();
  await page.locator(".documentation-maintenance summary").click();
  await page
    .getByRole("button", { name: "Check documentation", exact: true })
    .click();
  await expect(
    page.getByText("validate: needs review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Source changed; review the explanation/),
  ).toBeVisible();
  const activeRequest = await page.evaluate(
    () =>
      (window as any).contextoryMessages
        .filter(
          (m: any) =>
            m.name === "contextory_docs_get" &&
            m.arguments.section === "sections",
        )
        .at(-1).requestId,
  );
  await page.evaluate(
    (requestId) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "toolResult",
            projectId: "foreign-project",
            requestId,
            result: { state: "available", sections: [], total: 99 },
          },
        }),
      ),
    activeRequest,
  );
  await expect(
    page.getByText("No explanations match. Broaden the query or source path."),
  ).toBeVisible();
  await expect(
    page.getByText("validate: needs review", { exact: true }),
  ).toBeVisible();
});

test("architecture and request actions open relevant documentation without a new primary tab", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await openTool(page, "Architecture");
  await page
    .getByRole("button", { name: "Explain this area", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Project documentation", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".main-nav > button")).toHaveCount(3);
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page.locator(".request-brief summary").first().click();
  await page
    .getByRole("button", { name: "Related documentation", exact: true })
    .first()
    .click();
  await expect(page.getByText(/Related to REQ-/)).toBeVisible();
  const args = await page.evaluate(
    () =>
      (window as any).contextoryMessages
        .filter((m: any) => m.name === "contextory_docs_get")
        .at(-1).arguments,
  );
  expect(args.recordId).toMatch(/^REQ-/);
});

for (const scenario of ["missing", "error"])
  test(`documentation ${scenario} keeps recovery controls usable`, async ({
    page,
  }) => {
    await page.goto(`/sidebar.html?documentation=${scenario}`);
    await openTool(page, "Documentation");
    await expect(
      page.getByText(
        scenario === "missing"
          ? "No project documentation yet"
          : "Documentation corpus is malformed",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Find documentation", exact: true }),
    ).toBeEnabled();
  });

for (const [width, height] of [
  [320, 720],
  [760, 260],
  [1280, 420],
])
  test(`documentation fits ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/sidebar.html");
    await openTool(page, "Documentation");
    await expect(
      page.getByRole("heading", { name: "Project documentation", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `artifacts/documentation-${width}.png` });
  });
