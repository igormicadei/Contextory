import { test, expect } from "@playwright/test";

test("knowledge review presents source/test gaps and before/after UI behavior and requires a concrete review reason", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sidebar.html");
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Project knowledge" }),
  ).toBeVisible();
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
