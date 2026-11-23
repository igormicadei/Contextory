import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, relative, isAbsolute, extname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";

test("bundled Carbon site works offline under a subpath in both locales and three viewport widths", async (t) => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "contextory-docs-carbon-")),
  );
  t.after(async () => {
    assert.ok(
      root.startsWith(
        join(await realpath(tmpdir()), "contextory-docs-carbon-"),
      ),
    );
    await rm(root, { recursive: true, force: true });
  });
  await promisify(execFile)(
    "python",
    [
      "-I",
      "-B",
      "-X",
      "utf8",
      resolve("tests/documentation/fixture.py"),
      resolve("dist/documentation"),
      root,
    ],
    { timeout: 30000, windowsHide: true },
  );
  const site = join(root, ".documentation/site"),
    failures = [];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      assert.ok(url.pathname.startsWith("/demo/"));
      const path = resolve(
        site,
        decodeURIComponent(url.pathname.slice(6) || "index.html"),
      );
      const rel = relative(site, path);
      assert.ok(!rel.startsWith("..") && !isAbsolute(rel));
      const types = {
        ".html": "text/html; charset=utf8",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".woff2": "font/woff2",
      };
      res.setHeader("content-type", types[extname(path)] || "text/plain");
      res.end(await readFile(path));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(() => new Promise((done) => server.close(done)));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${server.address().port}/demo/`;
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (res) => {
    if (res.status() >= 400) failures.push(`${res.status()}: ${res.url()}`);
  });
  page.on("request", (req) => {
    assert.ok(
      req.url().startsWith(base) || req.url().startsWith("data:"),
      "unexpected external asset: " + req.url(),
    );
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["en", "pt-BR"]) {
      await page.goto(base + locale + "/overview.html");
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.ok(await page.locator("main").textContent());
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.ok(await page.locator('link[rel="stylesheet"]').count());
      if (width < 760) {
        await page.locator("#menu").click();
        assert.equal(
          await page.locator("#menu").getAttribute("aria-expanded"),
          "true",
        );
      }
      await page
        .locator("#search")
        .fill(locale === "en" ? "greeting" : "saudação");
      await page
        .locator("#search-results a")
        .first()
        .waitFor({ state: "visible" });
      await page.locator("#search").fill("");
      if (width < 760) {
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator("#menu").getAttribute("aria-expanded"),
          "false",
        );
        assert.equal(
          await page
            .locator("#menu")
            .evaluate((node) => node === document.activeElement),
          true,
        );
      }
      await page.locator(".locale-switch").click();
      await page.waitForURL(
        new RegExp(`/${locale === "en" ? "pt-BR" : "en"}/overview.html$`),
      );
      await page.goto(base + locale + "/overview.html");
      assert.equal(
        await page
          .locator("a")
          .filter({ hasText: /llms\.txt/ })
          .count(),
        0,
      );
      await page.screenshot({
        path: `artifacts/documentation-carbon-${locale}-${width}.png`,
        fullPage: true,
      });
    }
  }
  const noJs = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  await noJs.goto(base + "en/overview.html");
  assert.ok(await noJs.locator("#navigation a").first().isVisible());
  await noJs.close();
  assert.deepEqual(failures, []);
  const html = await readFile(join(site, "en/overview.html"), "utf8");
  assert.match(html, /llms\.txt/);
  assert.match(html, /assets\/site\.js/);
  const manifest = JSON.parse(
    await readFile(join(site, "manifest.json"), "utf8"),
  );
  assert.ok(
    Object.keys(manifest.files).some((path) =>
      path.endsWith("IBMPlexSans-Regular.woff2"),
    ),
  );
});
