// Finds a Chromium for playwright-core, which ships no browser of its own.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

type Platform = NodeJS.Platform;

/** Revision-numbered folders in Playwright's cache, newest first. */
function cached(
  cache: string,
  prefix: string,
  join: typeof posix.join,
): string[] {
  if (!existsSync(cache)) return [];
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  return readdirSync(cache)
    .filter((d) => re.test(d))
    .sort((a, b) => Number(re.exec(b)![1]) - Number(re.exec(a)![1]))
    .map((d) => join(cache, d));
}

/** Playwright's default browser cache on each platform. */
function defaultCache(
  home: string,
  env: NodeJS.ProcessEnv,
  platform: Platform,
): string {
  if (platform === "darwin")
    return posix.join(home, "Library", "Caches", "ms-playwright");
  if (platform === "win32")
    return win32.join(
      env.LOCALAPPDATA ?? win32.join(home, "AppData", "Local"),
      "ms-playwright",
    );
  return posix.join(home, ".cache", "ms-playwright");
}

/** Executables inside one cached Chromium or headless-shell folder, per platform. */
function inCache(platform: Platform): {
  chromium: string[][];
  shell: string[][];
} {
  if (platform === "darwin")
    return {
      chromium: [
        [
          "chrome-mac-arm64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing",
        ],
        [
          "chrome-mac-x64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing",
        ],
        ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
      ],
      shell: [
        ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
        ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
      ],
    };
  if (platform === "win32")
    return {
      chromium: [
        ["chrome-win64", "chrome.exe"],
        ["chrome-win", "chrome.exe"],
      ],
      shell: [["chrome-headless-shell-win64", "chrome-headless-shell.exe"]],
    };
  return {
    chromium: [
      ["chrome-linux", "chrome"],
      ["chrome-linux64", "chrome"],
    ],
    shell: [["chrome-headless-shell-linux64", "chrome-headless-shell"]],
  };
}

/** Installed Chrome or Chromium outside Playwright's cache. */
function system(
  home: string,
  env: NodeJS.ProcessEnv,
  platform: Platform,
): string[] {
  if (platform === "darwin")
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      posix.join(
        home,
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome",
      ),
    ];
  if (platform === "win32") {
    const exe = ["Google", "Chrome", "Application", "chrome.exe"];
    return [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA]
      .filter((d): d is string => !!d)
      .map((d) => win32.join(d, ...exe));
  }
  return [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];
}

/** Every place a Chromium may be on this platform, in the order they are tried. */
export function chromiumCandidates(
  home = homedir(),
  env: NodeJS.ProcessEnv = process.env,
  platform: Platform = process.platform,
): string[] {
  const join = platform === "win32" ? win32.join : posix.join;
  const cache =
    env.PLAYWRIGHT_BROWSERS_PATH ?? defaultCache(home, env, platform);
  const exes = inCache(platform);
  return [
    ...cached(cache, "chromium", join).flatMap((d) =>
      exes.chromium.map((parts) => join(d, ...parts)),
    ),
    ...cached(cache, "chromium_headless_shell", join).flatMap((d) =>
      exes.shell.map((parts) => join(d, ...parts)),
    ),
    ...system(home, env, platform),
  ];
}

/**
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if set (it must exist), else the newest
 * Chromium in Playwright's cache, else a system Chrome. Undefined if none.
 */
export function findChromium(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const set = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (set) {
    if (!existsSync(set))
      throw new Error(
        `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is ${set}, which doesn't exist`,
      );
    return set;
  }
  return chromiumCandidates(homedir(), env).find((p) => existsSync(p));
}

export function requireChromium(): string {
  const p = findChromium();
  if (!p)
    throw new Error(
      "no Chromium found: set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, or run `npx playwright-core install chromium`",
    );
  return p;
}
