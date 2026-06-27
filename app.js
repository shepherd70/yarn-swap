/*
 * YarnSwap — UI layer (DOM wiring, rendering, filters).
 * Pure scoring/data lives in scoring.js and is reached via the global YarnSwap.
 * No inline styles are emitted: dynamic visuals (score ring, swatch) use SVG
 * presentation attributes, so the page runs under a strict style-src CSP.
 */
(function () {
  "use strict";

  const {
    WEIGHTS, FIBERS, TEXTURES, YARNS, MIN_SCORE, MAX_RESULTS, SPECS_REVIEWED, REGIONS, DEFAULT_REGION,
    escapeHtml, famPct, fiberLabel, swatchColor, score, whyText, displayScore, buyLinks,
  } = window.YarnSwap;

  const $ = id => document.getElementById(id);

  // ---------- tabs ----------
  let tab = "pick";
  let hasSearched = false;   // gate live re-runs until the first explicit search
  function setTab(t) {
    tab = t;
    const pick = t === "pick";
    $("tabPick").setAttribute("aria-selected", String(pick));
    $("tabSpecs").setAttribute("aria-selected", String(!pick));
    $("modePick").hidden = !pick;
    $("modeSpecs").hidden = pick;
  }

  // ---------- specs validation ----------
  // returns an array of human-readable error messages and toggles .invalid.
  function validateSpecs() {
    const errs = [];
    const ids = ["sYds", "sGrams", "sGauge", "sFiberPct"];
    ids.forEach(id => $(id).classList.remove("invalid"));
    const mark = (id, msg) => { $(id).classList.add("invalid"); errs.push(msg); };
    const raw = id => $(id).value.trim();
    const num = id => raw(id) === "" ? NaN : Number(raw(id));

    const yds = num("sYds");
    if (!Number.isFinite(yds) || yds <= 0) mark("sYds", "Yards per ball must be a number greater than 0.");
    else if (yds > 3000) mark("sYds", "Yards per ball looks too high (max 3000).");

    const grams = num("sGrams");
    if (!Number.isFinite(grams) || grams <= 0) mark("sGrams", "Grams per ball must be a number greater than 0.");
    else if (grams > 1000) mark("sGrams", "Grams per ball looks too high (max 1000).");

    const gaugeRaw = raw("sGauge");
    if (gaugeRaw !== "") {                       // gauge is optional
      const ga = Number(gaugeRaw);
      if (!Number.isFinite(ga) || ga < 4 || ga > 50) mark("sGauge", "Gauge must be between 4 and 50 sts / 4 in (or left blank).");
    }

    const pct = num("sFiberPct");
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) mark("sFiberPct", "Main fiber % must be between 1 and 100.");

    return errs;
  }

  function getTarget() {
    if (tab === "pick") return YARNS[+$("yarnSelect").value];
    const fib = $("sFiber").value;
    const pct = Math.min(100, Math.max(1, +$("sFiberPct").value || 100));
    const fib2 = $("sFiber2").value;   // "" = unknown / not specified
    const f = { [fib]: pct };
    // assign the <100% remainder to an explicit secondary fiber. if left unknown,
    // leave it unaccounted — it won't contribute to fiber overlap rather than
    // guessing a fiber that could skew the match.
    if (pct < 100 && fib2 && fib2 !== fib) f[fib2] = 100 - pct;
    return {
      b: "(custom)", n: "pattern yarn",
      w: $("sWeight").value,
      f, yds: +$("sYds").value || 220,
      g: +$("sGrams").value || 100,
      ga: +$("sGauge").value || null,
      t: $("sTexture").value || undefined,   // "" → unknown → neutral texture credit
      mw: $("sWash").checked,
    };
  }

  // ---------- shareable URL state ----------
  // Encode the current query into the URL hash so a result page can be linked,
  // bookmarked, and restored on load.
  function collectState() {
    const p = new URLSearchParams();
    p.set("m", tab);
    if (tab === "pick") {
      const y = YARNS[+$("yarnSelect").value];
      p.set("y", `${y.b}|${y.n}`);
    } else {
      p.set("w", $("sWeight").value);
      p.set("yds", $("sYds").value);
      p.set("g", $("sGrams").value);
      if ($("sGauge").value) p.set("ga", $("sGauge").value);
      p.set("f", $("sFiber").value);
      p.set("pct", $("sFiberPct").value);
      if ($("sFiber2").value) p.set("f2", $("sFiber2").value);
      if ($("sTexture").value) p.set("tx", $("sTexture").value);
      p.set("mw", $("sWash").checked ? "1" : "0");
    }
    p.set("care", $("fWash").value);
    p.set("price", $("fPrice").value);
    p.set("fam", $("fFam").value);
    p.set("region", $("fRegion").value);
    return p.toString();
  }

  // Restore controls from a hash string. Returns true if any state was applied.
  function applyState(str) {
    const p = new URLSearchParams(str);
    if (![...p.keys()].length) return false;
    setTab(p.get("m") === "specs" ? "specs" : "pick");
    if (tab === "pick") {
      const i = YARNS.findIndex(y => `${y.b}|${y.n}` === (p.get("y") || ""));
      if (i >= 0) $("yarnSelect").value = String(i);
    } else {
      const set = (id, key) => { const v = p.get(key); if (v !== null) $(id).value = v; };
      set("sWeight", "w"); set("sYds", "yds"); set("sGrams", "g");
      $("sGauge").value = p.get("ga") || "";
      set("sFiber", "f"); set("sFiberPct", "pct");
      $("sFiber2").value = p.get("f2") || "";
      $("sTexture").value = p.get("tx") || "";
      $("sWash").checked = p.get("mw") === "1";
    }
    const setf = (id, key) => { const v = p.get(key); if (v !== null) $(id).value = v; };
    setf("fWash", "care"); setf("fPrice", "price"); setf("fFam", "fam"); setf("fRegion", "region");
    return true;
  }

  async function copyLink() {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); return true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.setAttribute("readonly", "");
        ta.style.position = "absolute"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); return ok;
      } catch { return false; }
    }
  }

  // ---------- rendering ----------
  const RING_R = 26, RING_C = 2 * Math.PI * RING_R;
  function ringSvg(d, tier) {
    const off = RING_C * (1 - d / 100);
    return `<svg class="ring" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${d} percent match">
      <circle class="ring-track" cx="32" cy="32" r="${RING_R}"></circle>
      <circle class="ring-val ${tier}" cx="32" cy="32" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 32 32)"></circle>
      <text class="ring-num" x="32" y="33" text-anchor="middle">${d}</text>
    </svg>`;
  }
  function swatchSvg(y) {
    // swatchColor returns a #rrggbb derived from fiber family — safe in a fill attr
    return `<svg class="swatch" width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="6.5" cy="6.5" r="6.5" fill="${swatchColor(y)}"></circle></svg>`;
  }

  function cardHtml(y, s, stretch) {
    const d = displayScore(s);
    const tier = stretch ? "stretch" : (s >= 80 ? "great" : "good");
    const label = stretch ? "Stretch match" : (s >= 80 ? "Excellent match" : "Good match");
    const name = escapeHtml(`${y.b} ${y.n}`);
    const target = currentTarget;
    return `<article class="card">
      ${ringSvg(d, tier)}
      <div class="card-main">
        <div class="card-top">
          <h3>${name}</h3>
          <span class="match-label ${tier}">${label}</span>
        </div>
        <p class="fiber">${swatchSvg(y)}<span>${escapeHtml(fiberLabel(y.f))}</span></p>
        <ul class="pills">
          <li>${escapeHtml(y.w)}</li>
          <li>${y.yds} yds / ${y.g} g</li>
          <li>${y.ga} sts/4in</li>
          <li class="cap">${escapeHtml(y.t)}</li>
          <li>${y.mw ? "machine wash" : "hand wash"}</li>
          <li>${"$".repeat(y.p)}</li>
        </ul>
        <p class="why">${escapeHtml(whyText(target, y))}</p>
      </div>
      <div class="buys" role="group" aria-label="Where to buy ${name}">
        <span class="buys-label">Shop</span>
        ${buyLinks(y, $("fRegion").value)}
      </div>
    </article>`;
  }

  let currentTarget = null;

  function findSubs() {
    if (tab === "specs") {
      const errs = validateSpecs();
      if (errs.length) {
        $("results").innerHTML =
          `<div class="panel state-error"><h2>Please fix the following:</h2><ul>${
            errs.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>`;
        return;
      }
    }

    const target = currentTarget = getTarget();
    const wash = $("fWash").value;
    const price = $("fPrice").value;
    const fam = $("fFam").value;

    history.replaceState(null, "", "#" + collectState());
    hasSearched = true;

    const scored = YARNS
      .filter(y => !(tab === "pick" && y === target))
      .filter(y => wash !== "machine" || y.mw)
      .filter(y => price === "any" || y.p <= +price)
      .filter(y => fam === "any" || famPct(y.f)[fam] >= 50)
      .map(y => ({ y, s: score(target, y) }))
      .filter(r => r.s !== null)
      .sort((a, b) => b.s - a.s);
    const passing = scored.filter(r => r.s >= MIN_SCORE);
    const rows = passing.slice(0, MAX_RESULTS);
    const belowBar = scored.length - passing.length;

    // When very few candidates clear the quality bar, reveal the best one or two
    // that fell just short as clearly-labelled "stretch" matches — more useful than
    // hiding the closest-in-character yarn behind a count. Purely presentational:
    // no scores change, and only candidates within reach of the bar are shown.
    const STRETCH_TRIGGER = 3, STRETCH_MAX = 2, STRETCH_FLOOR = 40;
    const stretch = rows.length < STRETCH_TRIGGER
      ? scored.slice(passing.length, passing.length + STRETCH_MAX).filter(r => r.s >= STRETCH_FLOOR)
      : [];

    const el = $("results");
    const basis = escapeHtml(`${target.b} ${target.n} — ${target.w}, ${fiberLabel(target.f)}, ${target.yds} yds / ${target.g} g`);

    if (!rows.length && !stretch.length) {
      el.innerHTML = `<div class="panel state state-empty">${belowBar
        ? `${belowBar} candidate${belowBar > 1 ? "s" : ""} matched your filters but scored below the ${MIN_SCORE}-point quality bar. Try loosening the filters.`
        : `No candidates match these filters. Try loosening the filters.`}</div>`;
      return;
    }

    const stretchBlock = stretch.length ? `
      <div class="stretch-block">
        <p class="stretch-head">Below our ${MIN_SCORE}-point bar — close in character, but swatch carefully:</p>
        <div class="cards">${stretch.map(({ y, s }) => cardHtml(y, s, true)).join("")}</div>
      </div>` : "";

    if (rows.length) {
      const metaBits = [`for ${basis}`];
      if (passing.length > rows.length) metaBits.push(`showing the top ${rows.length} of ${passing.length} matches`);
      const hidden = belowBar - stretch.length;
      if (hidden > 0) metaBits.push(`${hidden} more below the ${MIN_SCORE}-point quality bar hidden`);
      el.innerHTML = `
        <div class="results-head">
          <h2>${rows.length} substitute${rows.length > 1 ? "s" : ""} found</h2>
          <div class="results-actions">
            <button type="button" class="copybtn">Copy link</button>
          </div>
        </div>
        <p class="results-meta">${metaBits.join(" · ")}</p>
        <div class="cards">${rows.map(({ y, s }) => cardHtml(y, s)).join("")}</div>
        ${stretchBlock}`;
    } else {
      el.innerHTML = `
        <div class="results-head">
          <h2>No strong matches found</h2>
          <div class="results-actions">
            <button type="button" class="copybtn">Copy link</button>
          </div>
        </div>
        <p class="results-meta">for ${basis} · showing the ${stretch.length} closest${belowBar > stretch.length ? ` of ${belowBar}` : ""} below the ${MIN_SCORE}-point bar</p>
        ${stretchBlock}`;
    }
  }

  // ---------- init ----------
  function init() {
    const sel = $("yarnSelect");
    YARNS.map((y, i) => ({ i, label: `${y.b} ${y.n} (${y.w})` }))
         .sort((a, b) => a.label.localeCompare(b.label))
         .forEach(({ i, label }) => sel.add(new Option(label, i)));
    const sw = $("sWeight");
    WEIGHTS.forEach(w => sw.add(new Option(w, w)));
    sw.value = "Worsted";
    const sf = $("sFiber");
    FIBERS.forEach(f => sf.add(new Option(f, f)));
    sf.value = "wool";
    const sf2 = $("sFiber2");
    sf2.add(new Option("(unknown)", ""));
    FIBERS.forEach(f => sf2.add(new Option(f, f)));
    sf2.value = "";
    const st = $("sTexture");
    st.add(new Option("(unknown)", ""));
    TEXTURES.forEach(t => st.add(new Option(t, t)));
    st.value = "";
    const sr = $("fRegion");
    REGIONS.forEach(r => sr.add(new Option(r.label, r.code)));
    sr.value = DEFAULT_REGION;

    $("reviewed").textContent = SPECS_REVIEWED;

    // wire up controls (no inline handlers — keeps a strict CSP possible)
    $("tabPick").addEventListener("click", () => setTab("pick"));
    $("tabSpecs").addEventListener("click", () => setTab("specs"));
    // arrow-key navigation across the tablist
    document.querySelector(".seg").addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = tab === "pick" ? "specs" : "pick";
      setTab(next);
      $(next === "pick" ? "tabPick" : "tabSpecs").focus();
    });
    $("findBtn").addEventListener("click", findSubs);

    // live-feel: once the user has run a search, re-run as they tweak controls
    let debounce;
    const live = () => { if (!hasSearched) return; clearTimeout(debounce); debounce = setTimeout(findSubs, 250); };
    ["yarnSelect","sWeight","sYds","sGrams","sGauge","sFiber","sFiberPct","sFiber2","sTexture","sWash","fWash","fPrice","fFam","fRegion"]
      .forEach(id => {
        const el = $(id);
        el.addEventListener("change", live);
        if (el.tagName === "INPUT" && el.type === "number") el.addEventListener("input", live);
      });

    // copy-link button (delegated so it survives re-renders)
    $("results").addEventListener("click", async e => {
      const btn = e.target.closest(".copybtn");
      if (!btn) return;
      const ok = await copyLink();
      btn.classList.toggle("copied", ok);
      btn.textContent = ok ? "Link copied!" : "Press Ctrl+C to copy";
      setTimeout(() => { btn.classList.remove("copied"); btn.textContent = "Copy link"; }, 1800);
    });

    // restore a shared/bookmarked query from the URL hash and show it immediately
    if (applyState(location.hash.replace(/^#/, ""))) findSubs();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
