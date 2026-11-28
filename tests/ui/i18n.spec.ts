import { test, expect } from "@playwright/test";

test("Portuguese follows the host locale while historical entries and source identifiers stay intact", async ({
  page,
}) => {
  await page.goto("/sidebar.html?locale=pt-BR");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("button", { name: "Trabalho", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pedidos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprovações", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Serviço conectado", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aprovações", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alterações pendentes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".baseline-review > summary")).toBeVisible();
  await expect(
    page.getByText("Show progress during recovery", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprovar", exact: true }).first(),
  ).toBeVisible();
  await page.locator(".workspace-tools > summary").click();
  await page.getByRole("button", { name: "Conhecimento", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Conhecimento do projeto", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment retries", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/knowledge-pt-BR.png" });
  await page.locator(".workspace-tools > summary").click();
  await page.getByRole("button", { name: "Documentação", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Documentação do projeto", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Idioma", exact: true }),
  ).toHaveValue("pt-BR");
});

for (const surface of ["architecture", "flow", "relationships"])
  test(`Portuguese standalone ${surface} preserves navigation and fits a narrow view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/${surface}.html?locale=pt-BR`);
    const heading = {
      architecture: "Arquitetura",
      flow: "Fluxo do código",
      relationships: "Relações",
    }[surface]!;
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

for (const size of [
  { width: 320, height: 720 },
  { width: 760, height: 260 },
])
  test(`Portuguese work and review controls fit ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/sidebar.html?locale=pt-BR");
    await page.getByRole("button", { name: "Aprovações", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Aprovar", exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
