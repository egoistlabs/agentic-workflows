// In-page export checks, run by the renderer before each screenshot.
// Returns a list of problems, each naming the slide and the element or property.
// The renderer refuses to export a slide with any problem.
window.agenticImageGuards = async ({ families, required, colours }) => {
  await document.fonts.ready;
  const problems = [];
  const slide = document.querySelector(".slide");
  if (!slide) return ["the page has no slide"];
  const at = `slide ${slide.dataset.slide} (${slide.dataset.layout})`;
  const name = (el) =>
    el.tagName.toLowerCase() + [...el.classList].map((c) => `.${c}`).join("");
  const norm = (s) => s.replace(/["']/g, "").trim().toLowerCase();

  // Images: every one loaded and decoded.
  for (const img of slide.querySelectorAll("img")) {
    try {
      await img.decode();
    } catch {
      problems.push(`${at}: image ${img.getAttribute("src")} failed to load`);
    }
  }

  // 1. Tokens: every required token is set on the slide.
  const cs = getComputedStyle(slide);
  for (const k of required)
    if (!cs.getPropertyValue(`--${k}`).trim())
      problems.push(`${at}: token --${k} is not set on the slide (tokens.css didn't load or the token is empty)`);

  // 2. Font: the brand faces (the brand font, and the mono font if the pack sets one)
  // are loaded, and every text element asks for one of them first.
  const texts = [...slide.querySelectorAll("*")].filter((el) =>
    [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()),
  );
  const firstFamily = (el) => getComputedStyle(el).fontFamily.split(",")[0].trim();
  const used = new Set(texts.map((el) => norm(firstFamily(el))));
  for (const family of families) {
    // The mono font only has to load when some text uses it.
    if (family !== families[0] && !used.has(norm(family))) continue;
    const faces = [...document.fonts].filter((f) => norm(f.family) === norm(family));
    if (!faces.length)
      problems.push(`${at}: no @font-face for ${family}; tokens.css didn't load`);
    else if (!faces.some((f) => f.status === "loaded"))
      problems.push(
        `${at}: font ${family} did not load (${faces.map((f) => f.status).join(", ")}); the browser would fall back to another font`,
      );
  }
  for (const el of texts) {
    const first = firstFamily(el);
    if (!families.some((f) => norm(f) === norm(first)))
      problems.push(`${at}: ${name(el)} font-family is ${first}, not ${families.join(" or ")}`);
    // Marked for the renderer's check of the font each glyph was drawn in.
    el.setAttribute("data-text-check", name(el));
  }

  // Characters no installed font has are drawn as the brand font's empty box
  // (the renderer's platform-font check can't see those): compare each
  // character with the box drawn for an unassigned code point.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const draw = (ch, family) => {
    ctx.clearRect(0, 0, 96, 96);
    ctx.font = `64px "${family}"`;
    ctx.fillText(ch, 8, 72);
    return ctx.getImageData(0, 0, 96, 96).data.join();
  };
  for (const el of texts) {
    const family = norm(firstFamily(el));
    const box = draw("͸", family);
    const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("");
    const missing = [...new Set(own)].filter((ch) => ch.trim() && draw(ch, family) === box);
    if (missing.length)
      problems.push(
        `${at}: ${name(el)} has characters the brand font lacks, drawn as empty boxes: ${missing.join(" ")}`,
      );
  }

  // 3. Colours: every computed colour on the slide is a colour token (or transparent).
  const probe = document.createElement("div");
  slide.appendChild(probe);
  const allowed = new Map([["rgba(0, 0, 0, 0)", "transparent"]]);
  for (const k of colours) {
    probe.style.backgroundColor = `var(--${k})`;
    const v = getComputedStyle(probe).backgroundColor;
    if (!allowed.has(v)) allowed.set(v, k);
  }
  probe.remove();
  const colourFns = /(?:rgba?|hsla?|color|oklab|oklch|lab|lch)\([^()]*\)/g;
  const check = (el, prop, value) => {
    for (const c of value.match(colourFns) ?? [])
      if (!allowed.has(c))
        problems.push(`${at}: ${name(el)} ${prop} is ${c}, which is not a colour token`);
  };
  for (const el of [slide, ...slide.querySelectorAll("*")]) {
    const s = getComputedStyle(el);
    if (texts.includes(el)) check(el, "color", s.color);
    check(el, "background-color", s.backgroundColor);
    check(el, "background-image", s.backgroundImage);
    for (const side of ["top", "right", "bottom", "left"])
      if (s[`border-${side}-style`] !== "none" && parseFloat(s[`border-${side}-width`]) > 0)
        check(el, `border-${side}-color`, s[`border-${side}-color`]);
    if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0)
      check(el, "outline-color", s.outlineColor);
    if (s.textDecorationLine !== "none")
      check(el, "text-decoration-color", s.textDecorationColor);
    check(el, "box-shadow", s.boxShadow);
    check(el, "text-shadow", s.textShadow);
    if (el instanceof SVGElement && el.tagName.toLowerCase() !== "svg") {
      check(el, "fill", s.fill);
      check(el, "stroke", s.stroke);
    }
  }
  return problems;
};
