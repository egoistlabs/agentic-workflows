// count <study> [--by <column>]   Sample section and counts per pain label (or column)
import { count, countsMarkdown, studyDir } from "../core/index.js";

const [name, flag, column] = process.argv.slice(2);
if (!name) throw new Error("usage: count <study> [--by <column>]");
const by = flag === "--by" && column ? column : "pain";
console.log(countsMarkdown(count(studyDir(name), by), by));
