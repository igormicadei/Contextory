import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "@playwright/test";

test("default documentation works in both locales under a repository subpath", async (t) => {
  const root = resolve(".documentation/site");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
  };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      assert.ok(url.pathname.startsWith("/Contextory/"));
      const path = resolve(
        root,
        decodeURIComponent(url.pathname.slice(12) || "index.html"),
      );
      assert.ok(path.startsWith(root + sep));
      response.setHeader(
        "content-type",
        types[extname(path)] || "text/plain; charset=utf-8",
      );
      response.end(await readFile(path));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(() => new Promise((done) => server.close(done)));
  const base = `http://127.0.0.1:${server.address().port}/Contextory/`;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()}: ${response.url()}`);
  });

  await t.test("site root opens the default locale without a language chooser", async () => {
    const landing = await readFile(resolve(root, "index.html"), "utf8");
    assert.match(
      landing,
      /http-equiv=['"]refresh['"][^>]*url=en\/overview\.html/i,
    );
    assert.doesNotMatch(
      landing,
      /pt-BR\/overview\.html|Português \(Brasil\)|English/,
    );
    await page.goto(base);
    await page.waitForURL(/\/Contextory\/en\/overview\.html$/);
    assert.match(page.url(), /\/Contextory\/en\/overview\.html$/);
    assert.equal(await page.locator("h1").textContent(), "Contextory");

    const noScriptRoot = await browser.newPage({ javaScriptEnabled: false });
    try {
      await noScriptRoot.goto(base);
      await noScriptRoot.waitForURL(/\/Contextory\/en\/overview\.html$/);
      assert.equal(
        await noScriptRoot.locator("h1").textContent(),
        "Contextory",
      );
    } finally {
      await noScriptRoot.close();
    }
  });

  await t.test(
    "local search and language switch preserve working links",
    async () => {
      await page.goto(base + "en/overview.html");
      await page
        .getByLabel("Search documentation", { exact: true })
        .fill("hooks");
      await page.locator("#search-results a").first().waitFor();
      await page.locator("#search-results a").first().click();
      assert.match(page.url(), /\/en\/.*\.html$/);
      await page.locator("a.locale").click();
      assert.equal(await page.locator("html").getAttribute("lang"), "pt-BR");
      assert.equal(
        await page.locator("label[for=search]").textContent(),
        "Buscar na documentação",
      );
    },
  );

  await t.test(
    "old URL fragments, images and API contracts remain usable",
    async () => {
      await page.goto(base + "docs/USER-GUIDE.html#resume-an-existing-chat");
      assert.equal(await page.locator("#resume-an-existing-chat").count(), 1);
      assert.ok(
        await page
          .locator("#resume-an-existing-chat")
          .evaluate((node) => node.getBoundingClientRect().top < innerHeight),
      );
      await page.locator("#search").fill("hooks");
      await page.locator("#search-results a").first().waitFor();
      await page.locator("a.locale").click();
      assert.match(page.url(), /\/pt-BR\/user-guide\.html$/);
      await page.goto(base + "en/walkthroughs.html");
      for (const image of await page.locator("img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((node) => node.decode());
        assert.ok(await image.evaluate((node) => node.naturalWidth > 0));
      }
      await page.goto(base + "en/api.html");
      assert.equal(await page.locator("h2[id^=contextory-]").count(), 36);
    },
  );

  await t.test(
    "mobile navigation is keyboard accessible and content does not overflow",
    async () => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(base + "pt-BR/overview.html");
      const navigation = page.locator("nav");
      assert.equal(await navigation.evaluate((node) => node.inert), true);
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      assert.equal(await navigation.evaluate((node) => node.inert), false);
      await page.keyboard.press("Escape");
      assert.equal(await navigation.evaluate((node) => node.inert), true);
      assert.equal(
        await page
          .locator("#menu")
          .evaluate((node) => node === document.activeElement),
        true,
      );
      for (const locale of ["en", "pt-BR"]) {
        for (const id of [
          "overview",
          "api",
          "reference",
          "walkthroughs",
          "install",
          "releases",
        ]) {
          await page.goto(`${base}${locale}/${id}.html`);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            `${locale}/${id}`,
          );
        }
      }
      const noScript = await browser.newPage({
        javaScriptEnabled: false,
        viewport: { width: 360, height: 900 },
      });
      await noScript.goto(base + "en/overview.html");
      assert.equal(await noScript.locator("nav").isVisible(), true);
      assert.equal(await noScript.locator("h1").textContent(), "Contextory");
      await noScript.close();
    },
  );
  assert.deepEqual(errors, []);
});
