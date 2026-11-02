// The slide page the renderer serves: every slide (preview) or one (export),
// each an <article class="slide layout-<name>"> filled from its layout template.
import type { ResolvedSlide } from "./deck.js";
import { escapeHtml, renderTemplate, type Ctx } from "./template.js";

/** One slide's HTML: the layout template filled with its fields and image. */
export function slideHtml(s: ResolvedSlide, count: number): string {
  const ctx: Ctx = {
    ...s.fields,
    slide: { n: s.n, count },
    image: s.image && {
      url: s.image.url,
      alt: s.image.alt,
      crop: s.image.crop,
      position: s.image.position,
      style: `object-fit: ${s.image.crop}; object-position: ${s.image.position}`,
    },
  };
  let inner: string;
  try {
    inner = renderTemplate(s.layout.html, ctx);
  } catch (e) {
    throw new Error(
      `slide ${s.n} (${s.layout.name}): layout.html: ${(e as Error).message}`,
    );
  }
  const cls = `slide layout-${s.layout.name} ${s.image ? "has-image" : "no-image"}`;
  return `<article class="${cls}" data-slide="${s.n}" data-layout="${s.layout.name}">\n${inner.trim()}\n</article>`;
}

export interface PageOptions {
  title: string;
  /** Render only this slide (1-based), for export. */
  only?: number;
  /** Preview chrome around the slides, at this zoom. */
  preview?: { zoom: number; label: string };
}

/** The whole page. Stylesheets: tokens, the shared slide base, each layout used. */
export function slidePage(slides: ResolvedSlide[], opts: PageOptions): string {
  const shown = opts.only ? slides.filter((s) => s.n === opts.only) : slides;
  if (opts.only && !shown.length)
    throw new Error(`no slide ${opts.only}; the deck has ${slides.length}`);
  const layouts = [...new Set(shown.map((s) => s.layout.name))];
  const css = [
    "/tokens.css",
    "/renderer/slide.css",
    ...layouts.map((l) => `/layouts/${l}/layout.css`),
    ...(opts.preview ? ["/renderer/preview.css"] : []),
  ];
  const body = shown.map((s) => {
    const html = slideHtml(s, slides.length);
    if (!opts.preview) return html;
    const label = `${String(s.n).padStart(2, "0")} · ${s.layout.name}${s.layout.source === "job" ? " (job)" : ""}`;
    return `<figure class="frame"><figcaption>${escapeHtml(label)} · <a href="/?slide=${s.n}&amp;zoom=1">full size</a></figcaption><div class="frame-slide">${html}</div></figure>`;
  });
  const p = opts.preview;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
${css.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n")}
${p ? `<style>.frame-slide { zoom: ${p.zoom}; }</style>` : ""}
</head>
<body class="${p ? "preview" : "export"}">
${p ? `<header class="preview-bar"><strong>${escapeHtml(opts.title)}</strong><span>${escapeHtml(p.label)}</span><nav><a href="/">all slides</a><a href="/?zoom=1">full size</a></nav></header>` : ""}
<main class="deck">
${body.join("\n")}
</main>
${p ? `<script src="/renderer/reload.js"></script>` : `<script src="/renderer/guards.js"></script>`}
</body>
</html>
`;
}
