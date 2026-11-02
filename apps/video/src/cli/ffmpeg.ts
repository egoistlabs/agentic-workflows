// Runs Remotion's bundled ffmpeg, so videos need no system install. It is a
// slim build: WAV/PNG/MP4 out, no fps or tile filters (use -r for stills).
import { RenderInternals } from "@remotion/renderer";

const p = RenderInternals.callFf({
  bin: "ffmpeg",
  args: process.argv.slice(2),
  indent: false,
  logLevel: "error",
  binariesDirectory: null,
  cancelSignal: undefined,
  options: { stdio: "inherit", reject: false },
});
process.exitCode = (await p).exitCode;
