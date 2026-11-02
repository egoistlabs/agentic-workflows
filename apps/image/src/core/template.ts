// A small Mustache subset for layout templates (layout.html):
//   {{name}}               the value, HTML-escaped; a newline becomes <br>
//   {{#name}}…{{/name}}    once if name is set; once per entry if it is a list
//   {{^name}}…{{/name}}    only if name is unset or an empty list
//   {{.}}                  the current list entry
//   {{@n}}                 the current entry's position, 1-based ({{@nn}}: two digits)
// Names may be dotted (image.src). Everything else is copied as is.

export type Value = string | number | boolean | Value[] | Ctx | undefined;
export interface Ctx {
  [key: string]: Value;
}

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

interface Frame {
  value: Value;
  index?: number;
}

function lookup(stack: Frame[], name: string): Value {
  if (name === ".") return stack.at(-1)?.value;
  for (let i = stack.length - 1; i >= 0; i--) {
    const v = stack[i]!.value;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const parts = name.split(".");
      if (!(parts[0]! in v)) continue;
      let cur: Value = v;
      for (const p of parts)
        cur =
          cur && typeof cur === "object" && !Array.isArray(cur)
            ? cur[p]
            : undefined;
      return cur;
    }
  }
  return undefined;
}

const isSet = (v: Value) =>
  Array.isArray(v) ? v.length > 0 : v !== undefined && v !== false && v !== "";

function position(stack: Frame[], digits: number): string {
  const f = [...stack].reverse().find((s) => s.index !== undefined);
  if (!f) throw new Error("template: {{@n}} outside a list section");
  return String(f.index! + 1).padStart(digits, "0");
}

/** Renders a template against a context. Throws on an unclosed or mismatched section. */
export function renderTemplate(tpl: string, ctx: Ctx): string {
  const tag = /\{\{\s*([#^/]?)\s*([\w.@]+|\.)\s*\}\}/g;
  const render = (start: number, stack: Frame[], close?: string) => {
    let out = "";
    let pos = start;
    tag.lastIndex = start;
    for (let m = tag.exec(tpl); m; m = tag.exec(tpl)) {
      out += tpl.slice(pos, m.index);
      pos = tag.lastIndex;
      const [, kind, name] = m as unknown as [string, string, string];
      if (kind === "/") {
        if (name !== close)
          throw new Error(
            `template: {{/${name}}} closes ${close ? `{{#${close}}}` : "nothing"}`,
          );
        return { out, end: pos };
      }
      if (kind === "#" || kind === "^") {
        const v = lookup(stack, name);
        // Render the body once to find where it ends, then for real.
        const body = render(
          pos,
          [...stack, { value: undefined, index: 0 }],
          name,
        );
        const end = body.end;
        if (kind === "^") {
          if (!isSet(v)) out += render(pos, stack, name).out;
        } else if (Array.isArray(v)) {
          v.forEach((item, index) => {
            out += render(pos, [...stack, { value: item, index }], name).out;
          });
        } else if (isSet(v)) {
          out += render(pos, [...stack, { value: v }], name).out;
        }
        pos = end;
        tag.lastIndex = end;
        continue;
      }
      if (name === "@n" || name === "@nn")
        out += position(stack, name === "@nn" ? 2 : 1);
      else {
        const v = lookup(stack, name);
        if (v !== undefined && typeof v !== "object")
          out += escapeHtml(String(v)).replace(/\r?\n/g, "<br>");
      }
    }
    if (close) throw new Error(`template: {{#${close}}} is never closed`);
    return { out: out + tpl.slice(pos), end: tpl.length };
  };
  return render(0, [{ value: ctx }]).out;
}
