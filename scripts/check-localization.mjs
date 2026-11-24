import { readFile } from "node:fs/promises";
import { localizationKeys } from "./localization-catalog.mjs";
const pt = JSON.parse(await readFile("src/i18n/pt-BR.json", "utf8"));
const missing = (await localizationKeys()).filter(
  (key) => typeof pt[key] !== "string",
);
const slots = (s) => [...new Set(s.match(/\{\d+\}/g) ?? [])].sort().join(",");
for (const [key, value] of Object.entries(pt))
  if (slots(key) !== slots(value)) missing.push(`Placeholder mismatch: ${key}`);
const en = JSON.parse(await readFile("package.nls.json", "utf8"));
const nls = JSON.parse(await readFile("package.nls.pt-br.json", "utf8"));
for (const key of Object.keys(en))
  if (!nls[key]) missing.push(`Manifest: ${key}`);
if (missing.length)
  throw new Error(`Incomplete Portuguese localization:\n${missing.join("\n")}`);
console.log(
  `Portuguese localization covers ${(await localizationKeys()).length} source messages and ${Object.keys(en).length} manifest entries; placeholders preserved.`,
);
