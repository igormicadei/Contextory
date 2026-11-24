import portuguese from "./pt-BR.json";

export type UiLanguage = "en" | "pt-BR";
export function normalizeLanguage(value?: string): UiLanguage {
  return /^pt(?:-br)?$/i.test(value ?? "") ? "pt-BR" : "en";
}
let current: UiLanguage = "en";
export function setLanguage(value?: string) {
  current = normalizeLanguage(value);
}
export function language() {
  return current;
}
const translations: Record<string, string> = portuguese;
const marker = /\uE000(\d+)\uE001/g;
const normalize = (s: string) => s.trim().replace(/\s+/g, " ");

export function translate(
  message: string,
  locale: UiLanguage = current,
): string {
  if (locale === "en") return message;
  const key = normalize(message);
  const result = translations[key];
  if (result === undefined) return message;
  return message.replace(/\S[\s\S]*\S|\S/, () => result);
}
export const tx = (message: string | null | undefined) =>
  translate(message ?? "");

// EN: Translate the source-owned skeleton before inserting any dynamic values.
// PT-BR: Traduzir o texto do código antes de inserir valores dinâmicos.
// Stored prose, code, identifiers and escaped HTML never enter the catalog lookup.
function fragment(text: string) {
  const slots: string[] = [];
  const key = text.replace(marker, (m) => `{${slots.push(m) - 1}}`);
  return translate(key).replace(/\{(\d+)\}/g, (m, n) => slots[Number(n)] ?? m);
}
export function localizeMarkup(skeleton: string) {
  const attributes = (part: string) =>
    part.replace(
      /\b(title|aria-label|placeholder|alt)=("([^"]*)"|'([^']*)')/g,
      (_all, attr, quoted, double, single) =>
        `${attr}=${quoted[0]}${fragment(double ?? single)}${quoted[0]}`,
    );
  if (!/<\/?[a-z!]/i.test(skeleton)) return attributes(skeleton);
  let literal = "";
  return skeleton
    .split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/g)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<\/(?:pre|code|script|style)\b/i.test(part)) literal = "";
        else if (/^<(pre|code|script|style)\b/i.test(part)) literal = part;
        return attributes(part);
      }
      return literal ? part : fragment(part);
    })
    .join("");
}
export function ui(
  strings: TemplateStringsArray | string,
  ...values: unknown[]
): string {
  if (typeof strings === "string") return localizeMarkup(strings);
  const skeleton = strings.reduce(
    (out, part, i) => out + (i ? `\uE000${i - 1}\uE001` : "") + part,
    "",
  );
  const translated = /<\/?[a-z!]|\b(?:aria-label|title|placeholder|alt)=/i.test(
    skeleton,
  )
    ? localizeMarkup(skeleton)
    : fragment(skeleton);
  return translated.replace(marker, (_match, n) =>
    String(values[Number(n)] ?? ""),
  );
}

export function contentLanguageInstruction(locale: UiLanguage) {
  return `Contextory UI language: ${locale}. Write all NEW UI-facing record prose (titles, descriptions, criteria, findings/fixes, decision choices/rationale, review reasons, catalog/UI contracts, outcomes and reports) in ${locale === "pt-BR" ? "Brazilian Portuguese" : "English"}, even when this conversation uses another language. Preserve existing/historical text and exact IDs, paths, symbols, code, commands and protocol keys. Read contextory_context_get for the current project's uiLanguage; do not infer it from chat language. Bilingual documentation keeps its paired locales.`;
}
