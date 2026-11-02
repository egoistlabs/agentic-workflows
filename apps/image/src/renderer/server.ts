// The local slide server (node:http on 127.0.0.1). It reads the deck, layouts and
// tokens on every request, so a preview shows edits on reload.
//   /                 the slide page (?slide=n for one slide, ?zoom= in preview)
//   /tokens.css       the brand font's @font-face and every token as --x on .slide
//   /font/<file>      the brand font, and the mono font if the pack sets one
//   /renderer/<file>  the shared slide base CSS and the in-page checks
//   /layouts/<name>/layout.css   the job's layout of that name, else the shared one
//   /job/images/<f>   images in the job's 02-layout/images/
//   /brand/<f>        files in the brand's assets/
//   /stamp            changes when any of those files change (preview reload)
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  basename,
  extname,
  join,
  normalize,
  relative,
  isAbsolute,
} from "node:path";
import {
  type ResolvedSlide,
  type SizeName,
  SIZES,
  deckPath,
  findLayout,
  fontPath,
  fontWarning,
  loadDeck,
  loadTokens,
  root,
  slidePage,
  tokensCss,
  unsetVars,
} from "../core/index.js";

export interface JobContext {
  slug: string;
  dir: string;
  brand: string;
  size: SizeName;
  format: string;
}

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

export const rendererAssets = join(root, "renderer");

/**
 * Everything a render needs from the job, checked: the font and tokens load,
 * the deck is valid, and every property a layout reads is set.
 */
export function loadJob(job: JobContext) {
  const warning = fontWarning(job.brand);
  if (warning) throw new Error(`brand font: ${warning}`);
  const tokens = loadTokens(job.brand);
  const mark = tokens.markFile?.trim();
  if (mark && mark !== "none" && !existsSync(join(job.brand, "assets", mark)))
    throw new Error(
      `token "markFile" names ${mark}, which isn't in ${join(job.brand, "assets")}`,
    );
  const font = fontPath(job.brand);
  const fontUrl = `/font/${encodeURIComponent(basename(font))}`;
  const mono = fontPath(job.brand, true);
  const monoUrl = mono && `/font/${encodeURIComponent(basename(mono))}`;
  const css = tokensCss(tokens, SIZES[job.size], fontUrl, monoUrl);
  const slides = loadDeck(job.dir, job.brand, job.format);
  const unset: string[] = [];
  for (const s of slides)
    for (const v of unsetVars(s.layout.css, tokens))
      unset.push(
        `slide ${s.n} (${s.layout.name}): layout.css reads var(--${v}), which no token sets`,
      );
  if (unset.length)
    throw new Error(
      `required tokens missing:\n  ${[...new Set(unset)].join("\n  ")}`,
    );
  return { tokens, font, fontUrl, css, slides };
}

/** A path under `base`, or undefined if `rel` would leave it. */
function under(base: string, rel: string): string | undefined {
  const p = normalize(join(base, rel));
  const r = relative(base, p);
  return r && !r.startsWith("..") && !isAbsolute(r) ? p : undefined;
}

/** Newest modification time of the files a page is built from. */
function stamp(job: JobContext): string {
  const files = [
    deckPath(job.dir),
    join(job.brand, "tokens.json"),
    join(rendererAssets, "slide.css"),
  ];
  let slides: ResolvedSlide[] = [];
  try {
    slides = loadDeck(job.dir, job.brand, job.format);
  } catch {
    // An invalid deck still reloads when deck.json changes.
  }
  for (const s of slides)
    files.push(
      ...["layout.html", "layout.css", "layout.json"].map((f) =>
        join(s.layout.dir, f),
      ),
    );
  return String(
    Math.max(...files.map((f) => (existsSync(f) ? statSync(f).mtimeMs : 0))),
  );
}

export interface SlideServer {
  url: string;
  server: Server;
  close(): Promise<void>;
}

export interface ServeOptions {
  port?: number;
  /** Serve the preview chrome (all slides, zoomed) at `/`. */
  preview?: boolean;
}

export function startServer(
  job: JobContext,
  opts: ServeOptions = {},
): Promise<SlideServer> {
  const server = createServer((req, res) => {
    const send = (status: number, body: string | Buffer, type: string) => {
      res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-store",
      });
      res.end(body);
    };
    const file = (p: string | undefined) => {
      if (!p || !existsSync(p) || !statSync(p).isFile())
        return send(404, `Not found: ${req.url}`, "text/plain; charset=utf-8");
      send(
        200,
        readFileSync(p),
        MIME[extname(p).toLowerCase()] ?? "application/octet-stream",
      );
    };
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const path = decodeURIComponent(url.pathname);
      if (path === "/") {
        const { slides } = loadJob(job);
        const only = Number(url.searchParams.get("slide")) || undefined;
        const zoom = Number(url.searchParams.get("zoom")) || 0.5;
        const size = SIZES[job.size];
        return send(
          200,
          slidePage(slides, {
            title: job.slug,
            only,
            preview: opts.preview
              ? {
                  zoom,
                  label: `${slides.length} slides · ${job.size} ${size.width}×${size.height} · ${job.brand}`,
                }
              : undefined,
          }),
          MIME[".html"]!,
        );
      }
      if (path === "/tokens.css")
        return send(200, loadJob(job).css, MIME[".css"]!);
      if (path === "/stamp") return send(200, stamp(job), "text/plain");
      if (path === "/favicon.ico") return send(204, "", "image/x-icon");
      if (path.startsWith("/font/")) {
        const fonts = [fontPath(job.brand), fontPath(job.brand, true)];
        return file(fonts.find((f) => f && path === `/font/${basename(f)}`));
      }
      if (path.startsWith("/renderer/"))
        return file(under(rendererAssets, path.slice("/renderer/".length)));
      const layout = /^\/layouts\/([a-z][a-z0-9-]*)\/layout\.css$/.exec(path);
      if (layout) {
        const l = findLayout(layout[1]!, job.dir);
        return l ? send(200, l.css, MIME[".css"]!) : file(undefined);
      }
      if (path.startsWith("/job/images/"))
        return file(
          under(
            join(job.dir, "02-layout", "images"),
            path.slice("/job/images/".length),
          ),
        );
      if (path.startsWith("/brand/"))
        return file(
          under(join(job.brand, "assets"), path.slice("/brand/".length)),
        );
      file(undefined);
    } catch (e) {
      const msg = (e as Error).message;
      send(
        500,
        opts.preview
          ? `<!doctype html><meta charset="utf-8"><title>Error</title><body style="font:16px/1.5 monospace;padding:24px;background:#1b1b1b;color:#f4f4f4"><h1 style="font-size:20px">Can't render ${job.slug}</h1><pre style="white-space:pre-wrap">${msg.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre><script src="/renderer/reload.js"></script>`
          : msg,
        opts.preview ? MIME[".html"]! : "text/plain; charset=utf-8",
      );
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        server,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
