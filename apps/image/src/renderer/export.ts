// Playwright export: one browser, one slide at a time, checked before each screenshot.
// Refuses to export when a token is missing, the real font didn't load or fell back,
// or a slide's computed colours aren't the tokens.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  chromium,
  type Browser,
  type CDPSession,
  type Page,
} from "playwright-core";
import {
  SIZES,
  colourTokens,
  fontFamilies,
  requiredTokens,
  slideFile,
} from "../core/index.js";
import { requireChromium } from "./chromium.js";
import { loadJob, startServer, type JobContext } from "./server.js";

/** Pixel size of a PNG, from its IHDR chunk. */
export function pngSize(path: string): { width: number; height: number } {
  const b = readFileSync(path);
  if (b.toString("ascii", 1, 4) !== "PNG")
    throw new Error(`${path} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Text elements drawn, even in part, in a font other than the loaded web font. */
async function fallbackFonts(cdp: CDPSession, at: string): Promise<string[]> {
  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", {
    nodeId: root.nodeId,
    selector: "[data-text-check]",
  });
  const problems: string[] = [];
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    const bad = fonts.filter((f) => !f.isCustomFont);
    if (!bad.length) continue;
    const { attributes = [] } = (await cdp.send("DOM.describeNode", { nodeId }))
      .node;
    const el = attributes[attributes.indexOf("data-text-check") + 1];
    problems.push(
      `${at}: ${el} falls back to ${bad.map((f) => `${f.familyName} (${f.glyphCount} glyphs)`).join(", ")}; the brand font lacks those characters`,
    );
  }
  return problems;
}

export interface ExportResult {
  files: string[];
}

/**
 * Renders every slide of the job's deck to `outDir/01.png…`. Checks every slide
 * and throws one error listing every problem; a slide with a problem isn't written.
 */
export async function exportSlides(
  job: JobContext,
  outDir: string,
): Promise<ExportResult> {
  const { tokens, slides } = loadJob(job);
  const size = SIZES[job.size];
  const guardOpts = {
    families: fontFamilies(tokens),
    required: requiredTokens(),
    colours: colourTokens(tokens),
  };
  mkdirSync(outDir, { recursive: true });
  const server = await startServer(job);
  let browser: Browser | undefined;
  const problems: string[] = [];
  const files: string[] = [];
  try {
    browser = await chromium.launch({
      executablePath: requireChromium(),
      headless: true,
      args: [
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
        "--disable-gpu",
      ],
    });
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
    });
    const page: Page = await context.newPage();
    const requestProblems: string[] = [];
    // No network: only the local slide server.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(server.url)) return route.continue();
      requestProblems.push(
        `requested ${url}; slides may only load files from the job and brand`,
      );
      return route.abort();
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        requestProblems.push(
          `${r.url().replace(server.url, "")} returned ${r.status()}`,
        );
    });
    page.on("pageerror", (e) =>
      requestProblems.push(`page error: ${e.message}`),
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");

    for (const s of slides) {
      const at = `slide ${s.n} (${s.layout.name})`;
      requestProblems.length = 0;
      await page.goto(`${server.url}/?slide=${s.n}`, { waitUntil: "load" });
      // renderer/guards.js, loaded by the export page.
      const found = (await page.evaluate(
        `window.agenticImageGuards(${JSON.stringify(guardOpts)})`,
      )) as string[];
      found.push(...(await fallbackFonts(cdp, at)));
      found.push(...requestProblems.map((p) => `${at}: ${p}`));
      if (found.length) {
        problems.push(...found);
        continue;
      }
      const path = join(outDir, slideFile(s.n));
      await page.locator(".slide").screenshot({ path, animations: "disabled" });
      const got = pngSize(path);
      if (got.width !== size.width || got.height !== size.height)
        problems.push(
          `${at}: rendered ${got.width}×${got.height}, not ${size.width}×${size.height}`,
        );
      files.push(path);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
  if (problems.length)
    throw new Error(`refusing to export:\n  ${problems.join("\n  ")}`);
  return { files };
}
