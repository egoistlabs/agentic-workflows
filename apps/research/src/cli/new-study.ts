import { newStudy } from "../core/index.js";

const name = process.argv[2];
if (!name) throw new Error("usage: new-study <name>");
newStudy(name);
console.log(`created .studies/${name}; next: route ${name}`);
