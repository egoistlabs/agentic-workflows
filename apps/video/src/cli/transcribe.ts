import { writeFileSync } from "node:fs";
import { type Engine, transcribe } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [file, out] = pos;
if (!file || !out)
  throw new Error(
    "usage: transcribe <audio> <out.json> [--model base|small|medium] [--language tl|es|…] [--engine local|groq]",
  );
const str = (v: string | true | undefined) =>
  typeof v === "string" ? v : undefined;
const engine = str(flags.engine) as Engine | undefined;
if (engine && engine !== "local" && engine !== "groq")
  throw new Error(`unknown engine "${engine}"`);
const words = await transcribe(
  file,
  str(flags.model) ?? "base",
  str(flags.language),
  engine,
);
writeFileSync(out, JSON.stringify(words, null, 0));
console.log(`${words.length} words → ${out}`);
