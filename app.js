/*
 * YarnSwap — UI layer (DOM wiring, rendering, filters).
 * Pure scoring/data lives in scoring.js and is reached via the global YarnSwap.
 */
(function () {
  "use strict";

  const {
    WEIGHTS, FIBERS, YARNS, MIN_SCORE, MAX_RESULTS,
    escapeHtml, famPct, fiberLabel, score, whyText, displayScore, buyLinks,
  } = window.YarnSwap;

  // ---------- UI ----------
  let tab = "pick";
  function setTab(t) {
    tab = t;
    document.getElementById("tabPick").classList.toggle("active", t === "pick");
    document.getElementById("tabSpecs").classList.toggle("active", t === "specs");
    document.getElementById("modePick").style.display = t === "pick" ? "" : "none";
    document.getElementById("modeSpecs").style.display = t === "specs" ? "" : "none";
  }

  // validate the specs form; returns an array of human-readable error messages.
  // also toggles the .invalid outline on offending fields. empty array === valid.
  function validateSpecs() {
    const errs = [];
    const ids = ["sYds", "sGrams", "sGauge", "sFiberPct"];
    ids.forEach(id => document.getElementById(id).classList.remove("invalid"));
    const mark = (id, msg) => { document.getElementById(id).classList.add("invalid"); errs.push(msg); };
    const raw = id => document.getElementById(id).value.trim();
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
    if (tab === "pick") return YARNS[+document.getElementById("yarnSelect").value];
    const fib = document.getElementById("sFiber").value;
    const pct = Math.min(100, Math.max(1, +document.getElementById("sFiberPct").value || 100));
    const fib2 = document.getElementById("sFiber2").value;   // "" = unknown / not specified
    const f = {[fib]: pct};
    // assign the <100% remainder to an explicit secondary fiber. if left unknown,
    // leave it unaccounted — it simply won't contribute to fiber overlap, rather
    // than guessing a fiber that could skew the match.
    if (pct < 100 && fib2 && fib2 !== fib) f[fib2] = 100 - pct;
    return {
      b:"(custom)", n:"pattern yarn",
      w: document.getElementById("sWeight").value,
      f, yds:+document.getElementById("sYds").value || 220,
      g:+document.getElementById("sGrams").value || 100,
      ga:+document.getElementById("sGauge").value || null,
      mw: document.getElementById("sWash").checked,
    };
  }

  function findSubs() {
    if (tab === "specs") {
      const errs = validateSpecs();
      if (errs.length) {
        document.getElementById("results").innerHTML =
          `<div class="panel errs"><h2>Please fix the following:</h2><ul>${
            errs.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>`;
        return;
      }
    }

    const target = getTarget();
    const wash = document.getElementById("fWash").value;
    const price = document.getElementById("fPrice").value;
    const fam = document.getElementById("fFam").value;

    const scored = YARNS
      .filter(y => !(tab === "pick" && y === target))
      .filter(y => wash !== "machine" || y.mw)
      .filter(y => price === "any" || y.p <= +price)
      .filter(y => fam === "any" || famPct(y.f)[fam] >= 50)
      .map(y => ({y, s: score(target, y)}))
      .filter(r => r.s !== null)
      .sort((a,b) => b.s - a.s);
    const passing = scored.filter(r => r.s >= MIN_SCORE);
    const rows = passing.slice(0, MAX_RESULTS);
    const belowBar = scored.length - passing.length;

    const el = document.getElementById("results");
    const basis = escapeHtml(`${target.b} ${target.n} — ${target.w}, ${fiberLabel(target.f)}, ${target.yds} yds / ${target.g} g`);
    if (!rows.length) {
      el.innerHTML = `<div class="panel empty">${belowBar
        ? `${belowBar} candidate${belowBar>1?"s":""} matched the filters but scored below the ${MIN_SCORE}-point quality bar. Try loosening the filters.`
        : `No candidates match these filters. Try loosening the filters.`}</div>`;
      return;
    }
    const metaBits = [];
    if (passing.length > rows.length) metaBits.push(`showing the top ${rows.length} of ${passing.length} matches`);
    if (belowBar > 0) metaBits.push(`${belowBar} candidate${belowBar>1?"s":""} below the ${MIN_SCORE}-point quality bar hidden`);
    el.innerHTML = `
      <div class="results-head">
        <h2>${rows.length} substitute${rows.length>1?"s":""} found</h2>
        <span class="basis">for ${basis}</span>
      </div>` +
      (metaBits.length ? `<div class="results-meta">${metaBits.join(" · ")}</div>` : "") +
      rows.map(({y, s}) => `
        <div class="card">
          <div class="score ${s >= 80 ? "great" : "good"}">${displayScore(s)}%</div>
          <div>
            <h3>${escapeHtml(`${y.b} ${y.n}`)}</h3>
            <div class="brand">${s >= 80 ? "Excellent match" : "Good match"}</div>
            <div class="specs">
              <span>${escapeHtml(y.w)}</span><span>${escapeHtml(fiberLabel(y.f))}</span>
              <span>${y.yds} yds / ${y.g} g</span><span>${y.ga} sts / 4 in</span>
              <span>${y.mw ? "machine wash" : "hand wash"}</span>
              <span>${"$".repeat(y.p)}</span>
            </div>
            <div class="why">${escapeHtml(whyText(target, y))}</div>
          </div>
          <div class="buylinks">${buyLinks(y)}</div>
        </div>`).join("");
  }

  // ---------- init ----------
  function init() {
    const sel = document.getElementById("yarnSelect");
    YARNS.map((y, i) => ({i, label:`${y.b} ${y.n} (${y.w})`}))
         .sort((a,b) => a.label.localeCompare(b.label))
         .forEach(({i, label}) => sel.add(new Option(label, i)));
    const sw = document.getElementById("sWeight");
    WEIGHTS.forEach(w => sw.add(new Option(w, w)));
    sw.value = "Worsted";
    const sf = document.getElementById("sFiber");
    FIBERS.forEach(f => sf.add(new Option(f, f)));
    sf.value = "wool";
    const sf2 = document.getElementById("sFiber2");
    sf2.add(new Option("(unknown)", ""));
    FIBERS.forEach(f => sf2.add(new Option(f, f)));
    sf2.value = "";

    // wire up controls (no inline handlers — keeps a strict CSP possible)
    document.getElementById("tabPick").addEventListener("click", () => setTab("pick"));
    document.getElementById("tabSpecs").addEventListener("click", () => setTab("specs"));
    document.getElementById("findBtn").addEventListener("click", findSubs);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
