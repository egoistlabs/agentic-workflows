#!/usr/bin/env node
// agentic-smm <command> [args]: dispatches to the command modules in this folder.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { root } from "../core/files.js";

// Meta app and API keys: the creator's .env, then the tool's, then the
// agentic-workflows checkout's. Real env vars win.
for (const dir of [process.cwd(), root, join(root, "..", "..")]) {
  const env = join(dir, ".env");
  if (existsSync(env)) process.loadEnvFile(env);
}

const COMMANDS = ["new", "route", "formats"];

const [command] = process.argv.splice(2, 1);
if (!command || !COMMANDS.includes(command)) {
  console.error(`usage: agentic-smm <${COMMANDS.join("|")}> [args]`);
  process.exit(1);
}
try {
  await import(`./${command}.js`);
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exit(1);
}
