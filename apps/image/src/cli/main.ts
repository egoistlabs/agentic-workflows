#!/usr/bin/env node
// agentic-image <command> [args]: dispatches to the command modules in this folder.
const COMMANDS = ["new", "route", "brand", "preview", "render"];

// Planned commands that aren't built yet, and when they arrive (README, "Roadmap").
const PLANNED: Record<string, string> = {
  qa: "arrives in build step 3",
  deliver: "arrives in build step 3",
  publish: "arrives in build step 3",
  learn:
    "is not built yet; append a dated line to the learnings file named in STATUS.md",
};

const [command] = process.argv.splice(2, 1);
if (command && PLANNED[command]) {
  console.error(`agentic-image ${command} ${PLANNED[command]}.`);
  process.exit(1);
}
if (!command || !COMMANDS.includes(command)) {
  console.error(`usage: agentic-image <${COMMANDS.join("|")}> [args]`);
  process.exit(1);
}
try {
  await import(`./${command}.js`);
} catch (e) {
  console.error(`error: ${(e as Error).message}`);
  process.exit(1);
}
