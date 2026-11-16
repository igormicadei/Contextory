import { test, expect, type Page } from "@playwright/test";

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(", ")})`;
const changeTheme = (page: Page, name: string) =>
  page.evaluate(
    (name) =>
      (
        window as unknown as {
          setContextoryPreviewTheme(name: string): Record<string, string>;
        }
      ).setContextoryPreviewTheme(name),
    name,
  );

test("sidebar follows live theme changes without losing the active request or draft", async ({
  page,
}) => {
  await page.goto("/sidebar.html");
  await page.locator('.work-row[data-id="REQ-demo"]').click();
  await page.getByRole("button", { name: "+ New request" }).click();
  const title = page.getByLabel("Title", { exact: true });
  await title.fill("Keep this draft across theme changes");
  const card = await page.locator("#record-REQ-demo").elementHandle();
  for (const name of [
    "light",
    "custom",
    "high-contrast",
    "high-contrast-light",
    "dark",
  ]) {
    const theme = await changeTheme(page, name);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      rgb(theme.background),
    );
    await expect(page.locator("body")).toHaveCSS(
      "color",
      rgb(theme.foreground),
    );
    await expect(page.locator("footer")).toHaveCSS(
      "background-color",
      rgb(theme.background),
    );
    await expect(page.locator("#record-REQ-demo")).toHaveCSS(
      "background-color",
      rgb(theme.editor),
    );
    await expect(title).toHaveCSS("background-color", rgb(theme.input));
    await expect(title).toHaveCSS("color", rgb(theme.inputText));
    await expect(
      page.getByRole("button", { name: "Create request", exact: true }),
    ).toHaveCSS("background-color", rgb(theme.button));
    await expect(
      page.getByRole("button", { name: "Create request", exact: true }),
    ).toHaveCSS("color", rgb(theme.buttonText));
    await expect(page.locator(".brand-mark svg")).toHaveCSS(
      "stroke",
      rgb(theme.buttonText),
    );
    await title.focus();
    await expect(title).toHaveCSS("outline-color", rgb(theme.focus));
    await expect(title).toHaveValue("Keep this draft across theme changes");
    expect(await card!.evaluate((element) => element.isConnected)).toBe(true);
    if (theme.contrast)
      await expect(page.locator(".connection").first()).toHaveCSS(
        "border-top-color",
        rgb(theme.contrast),
      );
    await expect(page.locator("body")).toHaveCSS(
      "color-scheme",
      theme.kind === "vscode-light" ||
        theme.kind === "vscode-high-contrast-light"
        ? "light"
        : "dark",
    );
  }
});

test("progress, flow and relationships follow custom and contrast theme tokens", async ({
  page,
}) => {
  await page.goto("/sidebar.html?theme=custom");
  const theme = await changeTheme(page, "custom");
  await expect(page.locator(".request-progress").first()).toHaveCSS(
    "accent-color",
    rgb(theme.progress),
  );
  await page.getByRole("button", { name: "Code map", exact: true }).click();
  await page.getByRole("button", { name: "Trace current symbol" }).click();
  const node = page.locator(".graph-node rect").first();
  for (const name of [
    "light",
    "custom",
    "high-contrast",
    "high-contrast-light",
  ]) {
    const active = await changeTheme(page, name);
    await expect(node).toHaveCSS("fill", rgb(active.input));
    await expect(page.locator(".graph-node .node-name").first()).toHaveCSS(
      "fill",
      rgb(active.foreground),
    );
    await expect(page.locator(".graph-node .node-kind").first()).toHaveCSS(
      "fill",
      rgb(active.link),
    );
    await expect(page.locator(".graph-edge path").first()).toHaveCSS(
      "stroke",
      rgb(active.muted),
    );
    await expect(page.locator(".graph-node.branch rect").first()).toHaveCSS(
      "stroke",
      rgb(active.yellow),
    );
    if (active.contrast)
      await expect(page.locator(".graph-edge path").first()).toHaveCSS(
        "opacity",
        "1",
      );
  }
  await page.goto("/relationships.html?theme=light");
  for (const name of ["custom", "light"]) {
    const active = await changeTheme(page, name);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      rgb(active.editor),
    );
    await expect(page.locator(".relationship-card").first()).toHaveCSS(
      "background-color",
      rgb(active.editor),
    );
    await expect(
      page.getByRole("heading", { name: "Relationships", exact: true }),
    ).toBeVisible();
  }
});
