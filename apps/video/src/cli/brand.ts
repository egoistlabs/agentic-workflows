// brand scan: lists files that likely hold the project's colours, fonts, logos and voice.
// brand default: prints the built-in pack's path so a project pack can start from it.
import { brandTokens, defaultBrand, scanBrand } from "../core/index.js";

const [sub] = process.argv.slice(2);
if (sub === "scan") {
  const found = scanBrand(process.cwd());
  if (!Object.keys(found).length)
    console.log(
      "No brand sources found. Ask the human, or use the default pack.",
    );
  for (const [kind, files] of Object.entries(found))
    console.log(`${kind}:\n${files.map((f) => `  ${f}`).join("\n")}`);
} else if (sub === "default") {
  console.log(`${defaultBrand}\n${JSON.stringify(brandTokens(), null, 2)}`);
} else throw new Error("usage: brand <scan|default>");
