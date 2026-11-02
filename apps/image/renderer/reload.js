// Preview only: reloads the page when deck.json, a layout or the tokens change.
(() => {
  let last;
  setInterval(async () => {
    try {
      const s = await (await fetch("/stamp", { cache: "no-store" })).text();
      if (last && s !== last) location.reload();
      last = s;
    } catch {
      // The preview server stopped; keep the page as it is.
    }
  }, 1000);
})();
