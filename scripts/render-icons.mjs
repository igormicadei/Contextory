import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const artwork = await readFile(
  new URL("media/contextory-icon.svg", root),
  "utf8",
);
const mark = await readFile(new URL("media/contextory.svg", root), "utf8");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 256, height: 256 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<style>body{margin:0}</style>${artwork}`);
  await page.screenshot({
    path: fileURLToPath(new URL("media/contextory-icon.png", root)),
    omitBackground: true,
  });
  await page.setViewportSize({ width: 760, height: 340 });
  const sizes = [16, 24, 48];
  const samples = (color) =>
    sizes
      .map(
        (size) =>
          `<span style="display:inline-grid;place-items:center;width:64px;height:64px">${mark.replace('width="24" height="24"', `width="${size}" height="${size}"`).replaceAll("#c5c5c5", color)}</span>`,
      )
      .join("");
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;background:#eef3f1;font:14px system-ui;color:#263b41;display:flex;align-items:center;gap:32px;padding:36px}h1{margin:0 0 4px;font-size:25px}p{margin:0 0 16px}.sample{border-radius:12px;padding:10px;display:flex}.dark{background:#1c1f26}.light{background:white;margin-top:12px}.art svg{width:236px;height:236px}</style><div class="art">${artwork}</div><div><h1>Contextory</h1><p>Requests connected to context.</p><div class="sample dark">${samples("#d9dfe8")}</div><div class="sample light">${samples("#263b41")}</div></div>`,
  );
  await mkdir(new URL("artifacts/", root), { recursive: true });
  await page.screenshot({
    path: fileURLToPath(new URL("artifacts/contextory-brand.png", root)),
  });
} finally {
  await browser.close();
}
console.log("Rendered Contextory extension icon and light/dark size preview.");
