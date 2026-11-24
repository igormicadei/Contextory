import { openTool } from "./navigation";
import { test, expect } from "@playwright/test";

test("observations do not demand approval and Knowledge exposes attributed agent auto-approval", async ({
  page,
}) => {
  await page.goto("/sidebar.html?catalog=observations-only");
  await expect(page.locator(".approval-count")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review pending knowledge" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No pending approvals", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Optional baseline review",
      exact: true,
    }),
  ).toBeVisible();
  await openTool(page, "Knowledge");
  await expect(page.locator(".catalog-provenance")).toContainText(
    "auto-approved by codex",
  );
  await expect(page.locator(".catalog-provenance")).toContainText("KCH-auto");
  await page.locator(".catalog-provenance").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/approval-provenance.png" });
});

test("Approvals is independent of Knowledge filters and preserves reasons across navigation", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  const tab = page.getByRole("button", { name: "Approvals", exact: true });
  await expect(tab.locator(".approval-count")).toHaveText("1");
  await openTool(page, "Knowledge");
  await expect(
    page.getByRole("heading", { name: "Project knowledge", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/knowledge-browser.png" });
  await expect(
    page.getByRole("button", {
      name: /Approve baseline|Approve change|Refresh source snapshot/,
    }),
  ).toHaveCount(0);
  await page.locator(".catalog-search summary").click();
  await page
    .getByRole("textbox", { name: "Find a definition" })
    .fill("No matching definition");
  await page
    .getByRole("button", { name: "Search knowledge", exact: true })
    .click();
  await expect(
    page.getByText("No definitions match.", { exact: true }),
  ).toBeVisible();
  await tab.click();
  await expect(
    page.getByRole("heading", { name: "Approvals", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-catalog-id="KN-approved"]')).toHaveCount(0);
  const reason = page.locator('[name="catalogReason-KN-observed"]');
  await reason.fill("Checked the current sources");
  await openTool(page, "Knowledge");
  await expect(
    page.getByRole("textbox", { name: "Find a definition" }),
  ).toHaveValue("No matching definition");
  await tab.click();
  await expect(reason).toHaveValue("Checked the current sources");
  const query = await page.evaluate(
    () =>
      (
        window as unknown as {
          contextoryMessages: { name?: string; arguments?: object }[];
        }
      ).contextoryMessages
        .filter((m) => m.name === "contextory_catalog_get")
        .at(-1)?.arguments,
  );
  expect(query).toMatchObject({ pendingOnly: true, inventory: false });
  expect((query as { query?: string }).query).toBeUndefined();
});

test("pending knowledge renders before reviewed entries even if the response is unsorted", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(page.locator("[data-catalog-id]")).toHaveCount(2);
  expect(
    await page
      .locator("[data-catalog-id]")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-catalog-id")),
      ),
  ).toEqual(["KCH-demo", "KN-observed"]);
});

for (const scenario of ["stale", "changed-during-review"])
  test(`stale source approval recovers with a human refresh: ${scenario}`, async ({
    page,
  }) => {
    await page.goto(`/sidebar.html?catalog=${scenario}`);
    await page.getByRole("button", { name: "Approvals", exact: true }).click();
    const baseline = page.locator('[data-catalog-id="KN-observed"]');
    const reason = baseline.getByRole("textbox", { name: "Review reason" });
    await reason.fill("Checked the current payment implementation");
    if (scenario === "changed-during-review") {
      await baseline
        .getByRole("button", { name: "Approve baseline", exact: true })
        .click();
      await expect(baseline.getByRole("alert")).toContainText(
        "Sources changed during review",
      );
      await expect(reason).toHaveValue(
        "Checked the current payment implementation",
      );
    }
    await expect(
      baseline.getByRole("button", { name: "Approve baseline", exact: true }),
    ).toBeDisabled();
    await expect(
      baseline.getByText("Sources need review", { exact: true }),
    ).toBeVisible();
    await baseline
      .getByRole("button", { name: "Refresh source snapshot", exact: true })
      .click();
    await expect(baseline.getByRole("status")).toContainText(
      "Source snapshot refreshed",
    );
    await expect(reason).toHaveValue(
      "Checked the current payment implementation",
    );
    await expect(
      baseline.getByRole("button", { name: "Approve baseline", exact: true }),
    ).toBeEnabled();
    await baseline
      .getByRole("button", { name: "Approve baseline", exact: true })
      .click();
    await expect(
      baseline.getByRole("button", { name: "Approve baseline", exact: true }),
    ).toHaveCount(0);
    await expect(baseline).toHaveCount(0);
    expect(
      await page
        .locator("[data-catalog-id]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-catalog-id")),
        ),
    ).toEqual(["KCH-demo"]);
  });

test("review submission stays visible and cannot be repeated while pending", async ({
  page,
}) => {
  await page.goto("/sidebar.html?catalog=slow");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const baseline = page.locator('[data-catalog-id="KN-observed"]');
  await baseline
    .getByRole("textbox", { name: "Review reason" })
    .fill("Confirmed source behavior");
  await baseline
    .getByRole("button", { name: "Approve baseline", exact: true })
    .click();
  await expect(baseline.getByRole("status")).toHaveText("Saving your review…");
  await expect(
    baseline.getByRole("button", { name: "Approve baseline", exact: true }),
  ).toBeDisabled();
  await expect(
    baseline.getByRole("button", { name: "Reject", exact: true }),
  ).toBeDisabled();
  await expect(
    baseline.getByRole("button", { name: "Approve baseline", exact: true }),
  ).toHaveCount(0);
});

test("knowledge review presents source/test gaps and before/after UI behavior and requires a concrete review reason", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
  await expect(
    page.getByText("Tests: Gateway recovery still needs a behavioral test.", {
      exact: true,
    }),
  ).toBeVisible();
  const proposal = page.locator("article").filter({
    has: page.getByRole("button", { name: "Approve change", exact: true }),
  });
  await expect(
    proposal.getByText("Show progress and disable repeat submission", {
      exact: true,
    }),
  ).toBeVisible();
  await proposal.getByText("Before", { exact: true }).click();
  await expect(
    proposal.getByText("Disabled while payment is processing", { exact: true }),
  ).toBeVisible();
  await proposal
    .getByRole("button", { name: "Approve change", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Enter a review reason");
  await proposal
    .getByRole("textbox", { name: "Review reason" })
    .fill("Approved progress and duplicate-click prevention");
  await proposal
    .getByRole("button", { name: "Approve change", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve change", exact: true }),
  ).toHaveCount(0);
  const baseline = page.locator("article").filter({
    has: page.getByRole("button", { name: "Approve baseline", exact: true }),
  });
  await baseline
    .getByRole("textbox", { name: "Review reason" })
    .fill("Verified payment identity behavior");
  await baseline
    .getByRole("button", { name: "Approve baseline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve baseline", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No pending approvals", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await expect(page.locator(".main-nav .approval-count")).toHaveCount(0);
  await openTool(page, "Knowledge");
  await page.locator(".catalog-search summary").click();
  await page
    .getByRole("textbox", { name: "Find a definition" })
    .fill("Payment retries");
  await page
    .getByRole("button", { name: "Search knowledge", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment retries", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Retry payment control", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
