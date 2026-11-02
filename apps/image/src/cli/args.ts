// Minimal flag parsing: positional args plus --key value / --flag.
export function parse(argv = process.argv.slice(2)) {
  const pos: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) pos.push(a);
    else if (argv[i + 1] && !argv[i + 1]!.startsWith("--"))
      flags[a.slice(2)] = argv[++i]!;
    else flags[a.slice(2)] = true;
  }
  return { pos, flags };
}
