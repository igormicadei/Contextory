import { openTool } from "./navigation";
import { test, expect } from "@playwright/test";

test("optional baselines collapse accessibly and retain the chosen state", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  const approvals = page.getByRole("button", {
    name: "Approvals",
    exact: true,
  });
  await approvals.click();
  const group = page.locator(".baseline-review");
  const summary = group.locator(":scope > summary");
  const baseline = page.locator('[data-catalog-id="KN-observed"]');
  await expect(group).not.toHaveAttribute("open");
  await expect(baseline).not.toBeVisible();
  await expect(page.locator('[data-catalog-id="KCH-demo"]')).toBeVisible();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(baseline).toBeVisible();
  await openTool(page, "Knowledge");
  await approvals.click();
  await expect(group).toHaveAttribute("open");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(group).toHaveAttribute("open");
  await summary.click();
  await expect(group).not.toHaveAttribute("open");
  await openTool(page, "Knowledge");
  await approvals.click();
  await expect(group).not.toHaveAttribute("open");
});

test("observations stay optional and Knowledge preserves automatic-approval provenance", async ({
  page,
}) => {
  await page.goto("/sidebar.html?catalog=observations-only");
  await expect(page.locator(".approval-count")).toHaveCount(0);
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No pending approvals", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".baseline-review > summary")).toBeVisible();
  await openTool(page, "Knowledge");
  await expect(page.locator(".catalog-provenance")).toContainText(
    "auto-approved by codex",
  );
  await expect(page.locator(".catalog-provenance")).toContainText("KCH-auto");
  await page.screenshot({ path: "artifacts/approval-provenance.png" });
});

test("approval cards explain change, reason and behavior with no technical diff or required comment", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const proposal = page.locator('[data-catalog-id="KCH-demo"]');
  for (const heading of [
    "What is changing",
    "Why your approval is needed",
    "Effect on application behavior",
  ])
    await expect(
      proposal.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  await expect(
    proposal.getByText("Show progress and disable repeat submission", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(proposal.getByText("Before", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh source snapshot", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Review reason", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "artifacts/approval-review.png" });
  await proposal.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(proposal).toHaveCount(0);
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          contextoryMessages: {
            name?: string;
            arguments?: { action?: string; reason?: string };
          }[];
        }
      ).contextoryMessages,
  );
  expect(
    calls.filter((m) => m.name === "contextory_catalog_review").at(-1)
      ?.arguments,
  ).toMatchObject({ action: "approve", reason: "" });
});

test("feedback is preserved across navigation and waits for an agent update before approval", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const proposal = page.locator('[data-catalog-id="KCH-demo"]');
  await proposal
    .getByRole("button", { name: "Request changes", exact: true })
    .click();
  await expect(proposal.getByRole("alert")).toContainText(
    "Describe the update",
  );
  await proposal
    .getByRole("textbox", { name: "Instructions for the agent", exact: true })
    .fill("Keep the retry identity unchanged.");
  await openTool(page, "Knowledge");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  await expect(
    proposal.getByRole("textbox", {
      name: "Instructions for the agent",
      exact: true,
    }),
  ).toHaveValue("Keep the retry identity unchanged.");
  await proposal
    .getByRole("button", { name: "Request changes", exact: true })
    .click();
  await expect(
    proposal.getByText("Update requested: Keep the retry identity unchanged.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    proposal.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".main-nav .approval-count")).toHaveText("1");
  await proposal
    .getByRole("button", { name: "Reopen conversation", exact: true })
    .click();
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          contextoryMessages: { type: string; id?: string }[];
        }
      ).contextoryMessages,
  );
  expect(calls).toContainEqual(
    expect.objectContaining({ type: "openConversation", id: "KCH-demo" }),
  );
  await proposal.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(proposal).toHaveCount(0);
});

for (const scenario of ["stale", "changed-during-review"])
  test(`readable snapshots recover automatically without a refresh action: ${scenario}`, async ({
    page,
  }) => {
    await page.goto(`/sidebar.html?catalog=${scenario}`);
    await page.getByRole("button", { name: "Approvals", exact: true }).click();
    const baseline = page.locator('[data-catalog-id="KN-observed"]');
    await page.locator(".baseline-review > summary").click();
    await baseline
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    if (scenario === "changed-during-review") {
      await expect(baseline.getByRole("alert")).toContainText(
        "refreshed automatically",
      );
      await baseline
        .getByRole("button", { name: "Approve", exact: true })
        .click();
    }
    await expect(baseline).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Refresh source snapshot",
        exact: true,
      }),
    ).toHaveCount(0);
  });

test("missing references remain visible and cannot be approved", async ({
  page,
}) => {
  await page.goto("/sidebar.html?catalog=missing");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const baseline = page.locator('[data-catalog-id="KN-observed"]');
  await page.locator(".baseline-review > summary").click();
  await expect(
    baseline.getByText("Sources unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    baseline.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
});

test("review submission prevents duplicate actions while saving", async ({
  page,
}) => {
  await page.goto("/sidebar.html?catalog=slow");
  await page.getByRole("button", { name: "Approvals", exact: true }).click();
  const proposal = page.locator('[data-catalog-id="KCH-demo"]');
  await proposal.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(proposal.getByRole("status")).toHaveText("Saving your review…");
  await expect(
    proposal.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await expect(
    proposal.getByRole("button", { name: "Request changes", exact: true }),
  ).toBeDisabled();
  await expect(proposal).toHaveCount(0);
});
