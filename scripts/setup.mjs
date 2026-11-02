#!/usr/bin/env node
// One-step setup for agentic-workflows: install and build, put the commands on PATH,
// and link each app's agent skills into the agent's skills folder.
// Plain Node (no dependencies), so it runs before `npm install`.
//
//   node scripts/setup.mjs [--agent claude|codex|all] [--skills-dir <dir>]
//                          [--apps image,video,smm,research] [--force]
//                          [--no-install] [--no-link] [--no-browser] [--remove] [--dry-run]

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = homedir();
const win = platform() === "win32";

// Where each agent loads personal skills from. `.agents/skills` is the shared
// folder Codex and other agents read; Claude Code reads its own.
const AGENTS = {
  claude: join(home, ".claude", "skills"),
  codex: join(home, ".agents", "skills"),
};

function parseArgs(argv) {
  const opts = { agents: [], skillsDirs: [], apps: null, force: false, install: true, link: true, browser: true, remove: false, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v) fail(`${a} needs a value`);
      return v;
    };
    if (a === "--agent") opts.agents.push(...next().split(","));
    else if (a === "--skills-dir") opts.skillsDirs.push(resolve(next().replace(/^~(?=$|[\\/])/, home)));
    else if (a === "--apps") opts.apps = next().split(",");
    else if (a === "--force") opts.force = true;
    else if (a === "--no-install") opts.install = false;
    else if (a === "--no-link") opts.link = false;
    else if (a === "--no-browser") opts.browser = false;
    else if (a === "--remove") opts.remove = true;
    else if (a === "--dry-run") opts.dry = true;
    else if (a === "-h" || a === "--help") {
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 8).join("\n").replace(/^\/\/ ?/gm, ""));
      process.exit(0);
    } else fail(`unknown option ${a} (try --help)`);
  }
  return opts;
}

function fail(msg) {
  console.error(`setup: ${msg}`);
  process.exit(1);
}

function run(cmd, args, cwd, dry) {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  if (dry) return true;
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win });
  return r.status === 0;
}

/** Every app in apps/: its folder, package name, command name and skills. */
function findApps() {
  return readdirSync(join(repo, "apps"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(repo, "apps", d.name, "package.json")))
    .map((d) => {
      const dir = join(repo, "apps", d.name);
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const skillsRoot = join(dir, "skills");
      const skills = existsSync(skillsRoot)
        ? readdirSync(skillsRoot).filter((s) => existsSync(join(skillsRoot, s, "SKILL.md")))
        : [];
      return { id: d.name, dir, name: pkg.name, bins: Object.keys(pkg.bin ?? {}), skills: skills.map((s) => join(skillsRoot, s)) };
    });
}

/** Skills folders to use: the ones asked for, else the agents found on this machine. */
function skillsTargets(opts) {
  const names = opts.agents.includes("all") ? Object.keys(AGENTS) : opts.agents;
  for (const n of names) if (!AGENTS[n]) fail(`unknown agent "${n}" (known: ${Object.keys(AGENTS).join(", ")}; or use --skills-dir)`);
  const dirs = [...names.map((n) => AGENTS[n]), ...opts.skillsDirs];
  if (dirs.length) return dirs;
  const found = [];
  if (existsSync(join(home, ".claude"))) found.push(AGENTS.claude);
  if (existsSync(join(home, ".agents")) || existsSync(join(home, ".codex"))) found.push(AGENTS.codex);
  return found;
}

/** What is at `path`: nothing, a link to `target`, a link elsewhere, or a real folder. */
function inspect(path, target) {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return { kind: "none" };
  }
  if (!st.isSymbolicLink()) return { kind: "other" };
  const to = resolve(dirname(path), readlinkSync(path));
  let same = false;
  try {
    same = realpathSync(path) === realpathSync(target);
  } catch {}
  return { kind: same ? "ours" : "elsewhere", to };
}

function linkSkill(skill, dir, opts, report) {
  const name = skill.split(/[\\/]/).pop();
  const path = join(dir, name);
  const now = inspect(path, skill);
  if (opts.remove) {
    if (now.kind === "ours") {
      if (!opts.dry) rmSync(path);
      report.push(`removed   ${path}`);
    }
    return;
  }
  if (now.kind === "ours") return report.push(`ok        ${path}`);
  if (now.kind === "other") return report.push(`SKIPPED   ${path} is a real folder, not a link; move it away and rerun`);
  if (now.kind === "elsewhere" && !opts.force)
    return report.push(`SKIPPED   ${path} already links to ${now.to}; rerun with --force to point it here`);
  if (!opts.dry) {
    mkdirSync(dir, { recursive: true });
    if (now.kind === "elsewhere") rmSync(path);
    // Junctions need no admin rights on Windows.
    symlinkSync(skill, path, win ? "junction" : "dir");
  }
  report.push(`${now.kind === "elsewhere" ? "relinked" : "linked"}  ${path} -> ${skill}`);
}

function onPath(cmd) {
  const r = spawnSync(win ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null;
}

const opts = parseArgs(process.argv.slice(2));

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) fail(`Node 22 or later is needed (this is ${process.version}). Install it from https://nodejs.org and rerun.`);

let apps = findApps();
if (opts.apps) {
  const unknown = opts.apps.filter((a) => !apps.some((x) => x.id === a));
  if (unknown.length) fail(`unknown app(s): ${unknown.join(", ")} (have: ${apps.map((a) => a.id).join(", ")})`);
  apps = apps.filter((a) => opts.apps.includes(a.id));
}

// Resolve (and validate) the skills folders before changing anything.
const targets = skillsTargets(opts);

console.log(`agentic-workflows setup in ${repo}${opts.dry ? " (dry run)" : ""}`);

// 1. Install dependencies and build (each app builds in its `prepare` script).
if (opts.install && !opts.remove) {
  console.log("\n1. Installing and building");
  const ws = opts.apps ? apps.flatMap((a) => ["-w", `apps/${a.id}`]) : [];
  if (!run("npm", ["install", "--no-audit", "--no-fund", ...ws], repo, opts.dry)) fail("npm install failed; see the output above");
}

// 2. Put the commands on PATH with npm link. Optional: the skills fall back to
//    `node <app>/dist/cli/main.js` when a command is not on PATH.
const cmdReport = [];
if (opts.link) {
  console.log(`\n2. ${opts.remove ? "Unlinking" : "Linking"} the commands`);
  for (const app of apps) {
    const ok = run("npm", [opts.remove ? "unlink" : "link", "--no-audit", "--no-fund", ...(opts.remove ? ["-g", app.name] : [])], app.dir, opts.dry);
    for (const bin of app.bins) cmdReport.push(ok ? `${opts.remove ? "unlinked" : "on PATH "}  ${bin}` : `NOT LINKED ${bin} (agents will run node ${join(app.dir, "dist", "cli", "main.js")})`);
  }
}

// 3. Link the skills into each agent's skills folder.
const skillReport = [];
console.log(`\n3. ${opts.remove ? "Removing" : "Linking"} the skills`);
if (!targets.length) {
  skillReport.push("No agent skills folder found. Rerun with --agent claude, --agent codex, or --skills-dir <your agent's skills folder>.");
}
for (const dir of targets) for (const app of apps) for (const skill of app.skills) linkSkill(skill, dir, opts, skillReport);

// 4. Optional tools some apps use.
const tools = [];
if (!opts.remove) {
  if (apps.some((a) => a.id === "video")) tools.push(`ffmpeg (video, optional; faster cuts and contact sheets): ${onPath("ffmpeg") ?? "not found"}`);
  if (apps.some((a) => a.id === "image")) {
    // The image app's own lookup (Linux, macOS, Windows), so setup and render agree.
    // Missing: install Playwright's Chromium (user folder, no admin rights needed).
    const find = async () => {
      const url = pathToFileURL(join(repo, "apps", "image", "dist", "renderer", "chromium.js")).href;
      const { findChromium } = await import(`${url}?t=${Date.now()}`);
      return findChromium();
    };
    let chromium;
    try {
      chromium = await find();
      if (!chromium && opts.browser) {
        console.log("\n4. Installing Chromium for agentic-image (about 150 MB, once)");
        if (run("npx", ["playwright-core", "install", "chromium"], repo, opts.dry) && !opts.dry) chromium = await find();
      }
      chromium ??= opts.dry && opts.browser ? "would be installed" : "not found; run: npx playwright-core install chromium";
    } catch (e) {
      chromium = opts.dry ? "checked after the build" : `not checked (${e.message})`;
    }
    tools.push(`Chromium (image, needed to render): ${chromium}`);
  }
}

console.log("\nSummary");
for (const line of [...cmdReport, ...skillReport]) console.log(`  ${line}`);
for (const line of tools) console.log(`  ${line}`);
if (!opts.remove) {
  console.log(`\nAPI keys are optional: copy ${join(repo, ".env.example")} to .env in the same folder and fill in the ones you want.`);
  console.log("Restart your agent so it picks up the new skills, then ask it to e.g. \"make a carousel about X\".");
}
