// render: the next version into 03-render/v<n>/, or a draft into 03-render/draft/.
// A version needs approved copy; a draft doesn't, and is never a version.
import {
  copyFileSync,
  existsSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  SIZES,
  copyApproved,
  deckPath,
  draftDir,
  fontPath,
  jobState,
  loadDeck,
  nextVersion,
  renderDir,
  versionDir,
} from "../core/index.js";
import { exportSlides } from "./export.js";
import type { JobContext } from "./server.js";

export interface RenderOptions {
  /** Render to 03-render/draft/ without approved copy. Not a version. */
  draft?: boolean;
  cwd?: string;
}

export interface RenderResult {
  dir: string;
  /** The version number, or undefined for a draft. */
  version?: number;
  files: string[];
}

/** The job's render context from STATUS.md. */
export function jobContext(slug: string, cwd = process.cwd()): JobContext {
  const s = jobState(slug, cwd);
  return { slug, dir: s.dir, brand: s.brand, size: s.size, format: s.format };
}

export async function renderJob(
  slug: string,
  opts: RenderOptions = {},
): Promise<RenderResult> {
  const job = jobContext(slug, opts.cwd);
  if (!opts.draft && !copyApproved(job.dir))
    throw new Error(
      `01-copy/copy.md is not approved, so nothing is rendered as a version. ` +
        `Get the human's copy approval first, or use --draft for a look that is not a version (03-render/draft/).`,
    );
  // Validate before touching 03-render, so a bad deck leaves no folder behind.
  const slides = loadDeck(job.dir, job.brand, job.format);
  const version = opts.draft ? undefined : nextVersion(job.dir);
  const dir = opts.draft ? draftDir(job.dir) : versionDir(job.dir, version!);
  // Written beside its final name and renamed only when every slide passed,
  // so a failed render leaves no half version (and keeps the last draft).
  const work = join(
    renderDir(job.dir),
    `.${opts.draft ? "draft" : `v${version}`}.partial`,
  );
  if (existsSync(work)) rmSync(work, { recursive: true, force: true });
  try {
    const { files } = await exportSlides(job, work);
    copyFileSync(deckPath(job.dir), join(work, "deck.json"));
    const size = SIZES[job.size];
    writeFileSync(
      join(work, "render.json"),
      JSON.stringify(
        {
          version: version ?? "draft",
          draft: !!opts.draft,
          copyApproved: copyApproved(job.dir),
          renderedAt: new Date().toISOString(),
          size: { name: job.size, width: size.width, height: size.height },
          brand: job.brand,
          font: fontPath(job.brand),
          ...(fontPath(job.brand, true)
            ? { fontMono: fontPath(job.brand, true) }
            : {}),
          slides: slides.map((s) => ({
            file: basename(files[s.n - 1] ?? ""),
            layout: s.layout.name,
            layoutSource: s.layout.source,
            ...(s.image ? { image: s.image.file } : {}),
          })),
        },
        null,
        2,
      ) + "\n",
    );
    if (opts.draft && existsSync(dir)) rmSync(dir, { recursive: true });
    renameSync(work, dir);
    return {
      dir,
      version,
      files: files.map((f) => join(dir, basename(f))),
    };
  } catch (e) {
    rmSync(work, { recursive: true, force: true });
    throw e;
  }
}
