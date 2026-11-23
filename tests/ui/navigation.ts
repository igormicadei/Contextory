import type { Page } from "@playwright/test";
export async function openTool(page: Page, name: string) {
  const tools = page.locator(".workspace-tools");
  if (!(await tools.getAttribute("open"))) {
    if (
      !(await tools.evaluate((element) => (element as HTMLDetailsElement).open))
    )
      await tools.locator("summary").click();
  }
  await tools.getByRole("button", { name, exact: true }).click();
}
