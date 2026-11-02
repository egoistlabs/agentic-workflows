import { qa } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: qa <slug>");
const { checks, report } = qa(slug);
console.log(report);
if (!checks.every((c) => c.ok)) process.exit(2);
