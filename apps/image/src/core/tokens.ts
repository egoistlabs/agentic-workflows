// Token mapping: brand tokens become CSS custom properties on each slide.
// Token `x` becomes `--x`, and a token may refer to another (`var(--fg)`).
// Layout CSS reads only these properties; it never holds a colour, font or size.
import { extname } from "node:path";
import { defaultBrand, packTokens, type Tokens } from "./brand.js";

/** Every token the default pack sets is required: layouts may read any of them. */
export const requiredTokens = () => Object.keys(packTokens(defaultBrand));

/** Tokens the font check needs, beyond being set. `fontMono`/`fontMonoFile` are optional. */
export const FONT_TOKENS = [
  "font",
  "fontFile",
  "fontMono",
  "fontMonoFile",
] as const;

/** A brand face: the family token and the file token that loads it. */
export const FACES = {
  sans: { font: "font", file: "fontFile" },
  mono: { font: "fontMono", file: "fontMonoFile" },
} as const;
export type Face = keyof typeof FACES;

/** Tokens that hold colours: the renderer checks every slide's computed colours against these. */
export function colourTokens(tokens: Tokens): string[] {
  return Object.entries(tokens)
    .filter(([k, v]) => !FONT_TOKENS.includes(k as never) && isColour(v))
    .map(([k]) => k);
}

const isColour = (v: string) =>
  /^#[\da-f]{3,8}$/i.test(v) ||
  /^(rgba?|hsla?|color-mix|color|oklch|oklab|lab|lch)\(/i.test(v) ||
  /^var\(--[\w-]+\)$/.test(v) ||
  v === "transparent";

/** Names of required tokens that are missing or empty. */
export function missingTokens(tokens: Tokens): string[] {
  return requiredTokens().filter((k) => !tokens[k]?.trim());
}

/** A token value goes into CSS as is, so it may not end the declaration or the rule. */
export function checkTokenValue(name: string, value: string): void {
  if (!/^[A-Za-z][\w-]*$/.test(name))
    throw new Error(
      `token "${name}" can't be a CSS property name (letters, digits, - and _)`,
    );
  if (/[;{}<>]|\/\*/.test(value))
    throw new Error(
      `token "${name}" has a value CSS can't hold: ${JSON.stringify(value)}`,
    );
}

/** The `--x: value;` declarations for every token. */
export function tokenDeclarations(tokens: Tokens): string[] {
  return Object.entries(tokens).map(([k, v]) => {
    checkTokenValue(k, v);
    return `--${k}: ${v};`;
  });
}

/** The first family in the face's font token, without quotes: what @font-face declares. */
export function fontFamily(tokens: Tokens, face: Face = "sans"): string {
  const key = FACES[face].font;
  const first = (tokens[key] ?? "").split(",")[0]?.trim() ?? "";
  const family = first.replace(/^["']|["']$/g, "").trim();
  if (!family) throw new Error(`token "${key}" is missing`);
  return family;
}

/** Whether the pack sets the face (the sans face is always required). */
export const hasFace = (tokens: Tokens, face: Face) =>
  face === "sans" || !!tokens[FACES[face].font]?.trim();

/** Every family the slides may set text in: the brand font, plus the mono font if set. */
export const fontFamilies = (tokens: Tokens) =>
  (Object.keys(FACES) as Face[])
    .filter((f) => hasFace(tokens, f))
    .map((f) => fontFamily(tokens, f));

const FONT_FORMATS: Record<string, string> = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype",
};

/** The @font-face rule for a brand face (the brand font by default), served from `url`. */
export function fontFace(
  tokens: Tokens,
  url: string,
  face: Face = "sans",
): string {
  const key = FACES[face].file;
  const file = tokens[key] ?? "";
  const format = FONT_FORMATS[extname(file).toLowerCase()];
  if (!format)
    throw new Error(
      `token "${key}" (${file || "missing"}) must be a .woff2, .woff, .ttf or .otf file`,
    );
  return [
    "@font-face {",
    `  font-family: "${fontFamily(tokens, face)}";`,
    `  src: url("${url}") format("${format}");`,
    "  font-weight: 100 900;",
    "  font-style: normal;",
    "  font-display: block;",
    "}",
  ].join("\n");
}

/**
 * The brand mark as a CSS image: `markFile` in the pack's assets/, served at /brand/,
 * or `none` when the pack has no mark (`markFile: "none"`, the default).
 */
export function markUrl(tokens: Tokens): string {
  const file = tokens.markFile?.trim();
  return file && file !== "none"
    ? `url("/brand/${encodeURIComponent(file)}")`
    : "none";
}

export interface SlideSize {
  width: number;
  height: number;
}

/**
 * The stylesheet the slide page loads: the brand font (and mono font, if the pack
 * sets one) and every token as a custom property on `.slide`, plus the slide's
 * pixel size (not a brand token).
 */
export function tokensCss(
  tokens: Tokens,
  size: SlideSize,
  fontUrl: string,
  monoUrl?: string,
): string {
  const missing = missingTokens(tokens);
  if (missing.length)
    throw new Error(`brand tokens missing: ${missing.join(", ")}`);
  const decls = [
    ...tokenDeclarations(tokens),
    `--slideW: ${size.width}px;`,
    `--slideH: ${size.height}px;`,
    `--markUrl: ${markUrl(tokens)};`,
  ];
  const faces = [fontFace(tokens, fontUrl)];
  if (hasFace(tokens, "mono")) {
    if (!monoUrl)
      throw new Error('token "fontMono" is set but its file isn\'t served');
    faces.push(fontFace(tokens, monoUrl, "mono"));
  }
  return `${faces.join("\n\n")}\n\n.slide {\n${decls.map((d) => `  ${d}`).join("\n")}\n}\n`;
}

/** `var(--x)` names a stylesheet reads. */
export const cssVarsUsed = (css: string) => [
  ...new Set([...css.matchAll(/var\(\s*--([\w-]+)/g)].map((m) => m[1]!)),
];

/** Custom properties a stylesheet defines itself (`--x:`), which it may read without a token. */
export const cssVarsDefined = (css: string) => [
  ...new Set(
    [...css.matchAll(/(?:^|[;{\s])--([\w-]+)\s*:/g)].map((m) => m[1]!),
  ),
];

/** Properties a stylesheet reads that neither a token, the slide size nor the sheet itself sets. */
export function unsetVars(css: string, tokens: Tokens): string[] {
  const own = new Set([...cssVarsDefined(css), "slideW", "slideH", "markUrl"]);
  return cssVarsUsed(css).filter((v) => !own.has(v) && !tokens[v]?.trim());
}
