"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Y = require("../scoring.js");

// Direct product links (task 35) + affiliate wrapping (task 26).
// PRODUCTS is sparse by design — these tests enforce the SHAPE of whatever is
// curated into it, not coverage. buyLinks() and affiliateUrl() behaviour is
// tested against injected fixtures so the suite doesn't depend on which
// (yarn, retailer) cells happen to be filled.

const allRetailers = Y.REGIONS.flatMap(r => Y.RETAILERS[r.code] || []);
const yarnKeys = new Set(Y.YARNS.map(y => `${y.b}|${y.n}`));
// PRODUCTS sub-keys are retailer names, so names must be unique ACROSS regions.
const retailerHost = r => new URL(r.search("x")).hostname.replace(/^www\./, "");

test("retailer config: names globally unique, https search URLs, known affiliate networks", () => {
  const names = allRetailers.map(r => r.name);
  assert.equal(new Set(names).size, names.length, "retailer names must be unique across regions");
  for (const r of allRetailers) {
    const url = new URL(r.search(encodeURIComponent("Cascade 220")));
    assert.equal(url.protocol, "https:", `${r.name} search must be https`);
    assert.ok(r.aff && typeof r.aff.network === "string", `${r.name} must declare aff.network`);
    if (r.aff.network === "amazon") {
      assert.ok(r.aff.market in Y.AFFILIATE_IDS.amazon,
        `${r.name} amazon market "${r.aff.market}" has no AFFILIATE_IDS slot`);
    }
  }
});

test("PRODUCTS shape: keys are real yarns, sub-keys real retailers, URLs on the retailer's own host", () => {
  const hostByName = new Map(allRetailers.map(r => [r.name, retailerHost(r)]));
  for (const [key, links] of Object.entries(Y.PRODUCTS)) {
    assert.ok(yarnKeys.has(key), `PRODUCTS key "${key}" matches no yarn in YARNS`);
    for (const [name, url] of Object.entries(links)) {
      assert.ok(hostByName.has(name), `PRODUCTS["${key}"] uses unknown retailer "${name}"`);
      const u = new URL(url); // throws on a relative / malformed URL
      assert.equal(u.protocol, "https:", `${key} → ${name} must be https`);
      assert.equal(u.hostname.replace(/^www\./, ""), hostByName.get(name),
        `${key} → ${name}: URL host must be the retailer's own (got ${u.hostname})`);
      // stored URLs must be PLAIN — affiliate wrapping happens at render time
      assert.ok(!u.searchParams.has("tag"), `${key} → ${name}: strip affiliate tag= from stored URL`);
    }
  }
});

test("buyLinks: a curated cell renders the product page, everything else falls back to search", () => {
  const y = Y.YARNS[0];
  const key = `${y.b}|${y.n}`;
  const direct = "https://www.amazon.ca/dp/B000TEST00";
  const had = Object.prototype.hasOwnProperty.call(Y.PRODUCTS, key);
  const prev = Y.PRODUCTS[key];
  Y.PRODUCTS[key] = { "Amazon.ca": direct };
  try {
    const html = Y.buyLinks(y, "CA");
    const anchors = html.match(/<a [^>]*>/g);
    assert.equal(anchors.length, Y.RETAILERS.CA.length);
    const amazon = anchors.find(a => a.includes(">") && html.includes(`${a}Amazon.ca</a>`));
    assert.ok(amazon.includes('data-buy="direct"'), "curated cell should be marked direct");
    assert.ok(amazon.includes(`href="${direct}"`), "curated cell should link the product page");
    for (const a of anchors.filter(a => a !== amazon)) {
      assert.ok(a.includes('data-buy="search"'), `uncurated cell should fall back to search: ${a}`);
    }
  } finally {
    if (had) Y.PRODUCTS[key] = prev; else delete Y.PRODUCTS[key];
  }
});

test("buyLinks: with no curated entry every link is the retailer search", () => {
  const y = { b: "No Such Brand", n: "No Such Yarn" };
  for (const reg of Y.REGIONS) {
    const html = Y.buyLinks(y, reg.code);
    const kinds = html.match(/data-buy="(\w+)"/g);
    assert.equal(kinds.length, Y.RETAILERS[reg.code].length);
    assert.ok(kinds.every(k => k === 'data-buy="search"'), `${reg.code}: expected all-search`);
  }
});

// ---------- affiliateUrl ----------
// IDs ship EMPTY, so by default every branch must be a no-op (plain links, zero
// tracking). With IDs set, each network produces its documented format —
// Amazon ?tag= and Awin cread.php are verified; CJ is the scaffolded shape.

const withIds = (ids, fn) => {
  const prev = { amazon: { ...Y.AFFILIATE_IDS.amazon }, cj: Y.AFFILIATE_IDS.cj, awin: Y.AFFILIATE_IDS.awin };
  Object.assign(Y.AFFILIATE_IDS.amazon, ids.amazon || {});
  if ("cj" in ids) Y.AFFILIATE_IDS.cj = ids.cj;
  if ("awin" in ids) Y.AFFILIATE_IDS.awin = ids.awin;
  try { fn(); } finally {
    Object.assign(Y.AFFILIATE_IDS.amazon, prev.amazon);
    Y.AFFILIATE_IDS.cj = prev.cj;
    Y.AFFILIATE_IDS.awin = prev.awin;
  }
};

test("affiliateUrl: with IDs unset (the shipped state) every network passes the URL through", () => {
  const url = "https://www.amazon.ca/dp/B000TEST00";
  assert.equal(Y.affiliateUrl(url, undefined), url);
  assert.equal(Y.affiliateUrl(url, { network: "amazon", market: "CA" }), url);
  assert.equal(Y.affiliateUrl(url, { network: "awin", mid: "40388" }), url);
  assert.equal(Y.affiliateUrl(url, { network: "cj" }), url);
  assert.equal(Y.affiliateUrl(url, { network: "shareasale" }), url, "unhandled network stays plain");
});

test("affiliateUrl: Amazon appends the marketplace tag with ? or & as needed", () => {
  withIds({ amazon: { CA: "yarnswap0c-20", US: "yarnswap-20" } }, () => {
    assert.equal(
      Y.affiliateUrl("https://www.amazon.ca/dp/B000TEST00", { network: "amazon", market: "CA" }),
      "https://www.amazon.ca/dp/B000TEST00?tag=yarnswap0c-20");
    assert.equal(
      Y.affiliateUrl("https://www.amazon.com/s?k=cascade+220+yarn", { network: "amazon", market: "US" }),
      "https://www.amazon.com/s?k=cascade+220+yarn&tag=yarnswap-20");
  });
});

test("affiliateUrl: Awin wraps in cread.php with mid + affid + encoded destination", () => {
  withIds({ awin: "123456" }, () => {
    const dest = "https://marymaxim.ca/search?q=Bernat%20Blanket";
    assert.equal(
      Y.affiliateUrl(dest, { network: "awin", mid: "40388" }),
      `https://www.awin1.com/cread.php?awinmid=40388&awinaffid=123456&ued=${encodeURIComponent(dest)}`);
    // a retailer whose Awin MID is still unknown (LoveCrafts) must stay plain
    assert.equal(Y.affiliateUrl(dest, { network: "awin", mid: "" }), dest);
  });
});

test("affiliateUrl: CJ wraps in the anrdoezrs deep link (scaffold format)", () => {
  withIds({ cj: "100" }, () => {
    const dest = "https://www.yarnspirations.com/search?q=Caron%20Simply%20Soft";
    assert.equal(
      Y.affiliateUrl(dest, { network: "cj" }),
      `https://www.anrdoezrs.net/links/100/type/dlg/${encodeURIComponent(dest)}`);
  });
});

test("buyLinks composes: a curated Amazon product page gets the tag once IDs are set", () => {
  const y = Y.YARNS[0];
  const key = `${y.b}|${y.n}`;
  const had = Object.prototype.hasOwnProperty.call(Y.PRODUCTS, key);
  const prev = Y.PRODUCTS[key];
  Y.PRODUCTS[key] = { "Amazon.ca": "https://www.amazon.ca/dp/B000TEST00" };
  try {
    withIds({ amazon: { CA: "yarnswap0c-20" } }, () => {
      const html = Y.buyLinks(y, "CA");
      assert.ok(html.includes('href="https://www.amazon.ca/dp/B000TEST00?tag=yarnswap0c-20"'),
        "direct link should carry the Associates tag");
    });
  } finally {
    if (had) Y.PRODUCTS[key] = prev; else delete Y.PRODUCTS[key];
  }
});
