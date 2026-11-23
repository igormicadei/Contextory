import { openTool } from "./navigation";
import { test, expect } from "@playwright/test";

test("project versions require explicit plan, apply and publish actions with reviewable edits and escaped membership", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await openTool(page, "Versions");
  await expect(
    page.getByRole("heading", { name: "Project versions", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Current version 1.0.0", { exact: true }),
  ).toBeVisible();
  const mutations = () =>
    page.evaluate(() =>
      (window as any).contextoryMessages.filter((m: any) =>
        m.name?.startsWith("contextory_release"),
      ),
    );
  expect(await mutations()).toHaveLength(0);
  await page
    .getByRole("combobox", { name: "Version bump", exact: true })
    .selectOption("minor");
  expect(await mutations()).toHaveLength(0);
  await page
    .getByRole("button", { name: "Prepare release plan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Release plan 1.1.0", exact: true }),
  ).toBeVisible();
  await page.getByText("package.json", { exact: true }).click();
  await expect(
    page.getByText('{"version":"1.1.0"}', { exact: true }),
  ).toBeVisible();
  expect((await mutations()).map((m: any) => m.name)).toEqual([
    "contextory_release_prepare",
  ]);
  await page
    .getByRole("button", { name: "Create version commit and tag", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish tag to origin", exact: true }),
  ).toBeVisible();
  expect(
    (await mutations()).map((m: any) => m.arguments.action).filter(Boolean),
  ).toEqual(["apply"]);
  await page
    .getByRole("button", { name: "Inspect version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 1.1.0 commits", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("DEC-demo@1: Keep navigation stable", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".release-commits script")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Publish tag to origin", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish tag to origin", exact: true }),
  ).toHaveCount(0);
  expect(
    (await mutations()).map((m: any) => m.arguments.action).filter(Boolean),
  ).toEqual(["apply", "publish"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("main").evaluate((e) => e.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/panel-versions.png",
    fullPage: true,
  });
});
