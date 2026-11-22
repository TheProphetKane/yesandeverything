// audit-dashboard-page.mjs: read the LIVE dashboard, status page and homepage the way a
// visitor sees them, past the gate, and write every value they show to one JSON capture.
// scripts/audit-dashboard-page.py then compares the capture with the feeds and the
// canonical status files. Written 2026-09-23 after a session verified the feeds, called
// the dashboard fresh, and left four stale panels on the page.
//
//   node scripts/audit-dashboard-page.mjs [out.json]
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
const out = process.argv[2] || "scripts/.audit-capture.json";
// Chrome sits under Program Files (x86) on kane-pc and under Program Files on the
// Dungeons and Dragons computer; the first one that exists runs.
const chromePaths = ["C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"];
const chrome = chromePaths.find((p) => existsSync(p)) || chromePaths[0];
const port = 9340;
const profile = "X:/YesAndEverything/scripts/.chrome-audit";
const site = "https://yesandeverything.com";
const worker = "https://usage.yesandeverything.com";
const gateHash = (readFileSync("dashboard/index.html", "utf8").match(/GATE_HASH = "([0-9a-f]+)"/) || [])[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The two worker feeds the dashboard reads. Every release on the collecting machine runs the
// collector, so they can move during the minute a capture takes. On 2026-11-20 one landed two
// minutes after the page was read, and every usage number was then judged against data the
// page never showed. So the capture reads both feeds before and after the dashboard, keeps
// them only when the two reads agree, and reads the dashboard again when they do not.
const readFeeds = async () => {
  try {
    const o = {};
    for (const k of ["usage", "statuses"]) {
      const r = await fetch(`${worker}/${k}.json?audit=${Date.now()}`, { headers: { "Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0 audit-dashboard-page" } });
      if (!r.ok) throw new Error(`${k}.json answered ${r.status}`);
      o[k] = await r.text();
    }
    // The local copy is held in the same reads. On the collecting machine a collector run
    // between the capture and the comparison rewrote it, and the worker then read as older
    // than a file it had never been compared with (review of 2026-11-21).
    o.local_usage = readFileSync("dashboard/data/usage.json", "utf8");
    return o;
  } catch (err) {
    // An error page read twice would match itself, so a failed read counts as a mismatch.
    console.error(`could not read the worker feeds: ${err.message}`);
    return null;
  }
};

// The headless Chrome profile at `profile` is scratch space, not an artifact: it held 81
// megabytes of cache left behind by the 2026-09-23 run because the removal below was an
// empty catch, so a failure here vanished with nothing said. Cleanup now runs in a finally,
// so it happens whether the capture above succeeded or threw, and a failure is logged
// instead of swallowed.
let proc;
let ws;
// A run that fails partway writes nothing, so the comparison must not find an earlier capture
// from the same day and pass it against its own old feeds (review of 2026-11-21).
rmSync(out, { force: true });
try {
  proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=1600,4000", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(300); } }
  const page = targets.find((t) => t.type === "page") || targets[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) pending[d.id](d); };
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending[n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); if (r.result && r.result.exceptionDetails) return "EXC " + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result && r.result.result ? r.result.result.value : null; };
  const texts = (sel) => ev(`JSON.stringify([...document.querySelectorAll(${JSON.stringify(sel)})].map(function(x){return x.innerText}))`).then((s) => (typeof s === "string" && s.startsWith("[") ? JSON.parse(s) : s));
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{sessionStorage.setItem("dashGate",${JSON.stringify(gateHash)})}catch(e){}` });
  // The wheel's length comes from the page. This loop clicked a fixed 14 times, written when
  // the wheel held 14 cards. It holds 13 since a project left the live roster, so the loop
  // stopped one card past the start, on Agents, and the lists below opened scoped to Agents
  // alone: every other project's "lists found" row failed (2026-11-20).
  const spotPos = async () => { const m = /(\d+) \/ (\d+)/.exec((await ev('(document.querySelector(".spot-pos")||{innerText:""}).innerText')) || ""); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };
  const captureDashboard = async () => {
    const D = {};
    await send("Page.navigate", { url: `${site}/dashboard/?audit=${Date.now()}` });
    await sleep(16000);
    D.errorBanner = await ev('document.getElementById("error-banner").innerText');
    D.ticker = await ev('document.getElementById("ticker").innerText');
    D.band = { health: await ev('document.getElementById("band-health").innerText'), verdict: await ev('document.getElementById("band-verdict-word").innerText'), sub: await ev('document.getElementById("band-sub").innerText'), nums: await texts("#band-nums .band-num"), actions: await texts("#band-actions .band-act"), risk: await ev('document.getElementById("band-risk").innerText') };
    D.totals = await texts("#totals .total");
    D.legend = await texts("#core-legend > span");
    D.radar = await ev('document.getElementById("panel-radar").innerText');
    D.wheel = (await spotPos())[1];
    D.spotlights = [];
    // The card's header is read element by element. Read as text, the stale badge ran into
    // the position ("Here Be Hordesv0.99.86↗STALE11 / 13") and the card fell out of every row.
    const head = `JSON.stringify((function(){var n=document.querySelector("#spotlight .spot-head .name");if(!n)return null;var t="";n.childNodes.forEach(function(c){if(c.nodeType===3)t+=c.textContent;});var v=n.querySelector(".ver"),p=n.querySelector(".spot-pos");return {name:t.trim(),version:v?v.textContent:null,pos:p?p.textContent:null,stale:!!n.querySelector(".stale-badge")};})())`;
    for (let i = 0; i < (D.wheel || 14); i++) {
      const h = await ev(head);
      D.spotlights.push({ text: await ev('document.getElementById("spotlight").innerText'), chips: await texts("#spotlight .chip"), head: typeof h === "string" && h.startsWith("{") ? JSON.parse(h) : null });
      await ev('document.getElementById("nav-next").click()'); await sleep(700);
    }
    // Land on card 1, All Projects, before opening the lists, so they cover every project.
    for (let i = 0; i < 20 && (await spotPos())[0] !== 1; i++) { await ev('document.getElementById("nav-next").click()'); await sleep(700); }
    D.strip = await texts("#strip .mini");
    D.lists = {};
    await ev('document.getElementById("lists-btn").click()'); await sleep(900);
    D.listsTitle = await ev('document.getElementById("glass-title").innerText');
    for (const k of ["done", "found", "queue"]) {
      await ev(`([...document.querySelectorAll(".list-tabs > *")].find(function(t){return t.getAttribute("data-k")==="${k}"})||{click:function(){}}).click()`); await sleep(600);
      D.lists[k] = await ev('document.getElementById("glass-body").innerText');
    }
    await ev('document.getElementById("glass-close").click()');
    return D;
  };
  const cap = { capturedAt: null, feeds: null, dashboard: {}, status: {}, homepage: {} };
  // ----- dashboard -----
  for (let attempt = 1; attempt <= 3; attempt++) {
    const before = await readFeeds();
    cap.capturedAt = new Date().toISOString();
    cap.dashboard = await captureDashboard();
    const after = await readFeeds();
    if (before && after && before.usage === after.usage && before.statuses === after.statuses && before.local_usage === after.local_usage) { cap.feeds = after; break; }
    console.log(`the worker feeds moved during dashboard read ${attempt} of 3; reading it again`);
  }
  // ----- status page -----
  await send("Page.navigate", { url: `${site}/status/?audit=${Date.now()}` });
  await sleep(12000);
  cap.status.top = await ev('(document.getElementById("constellation")||{innerText:""}).innerText');
  cap.status.cards = await texts(".card, .project-card, [data-project]");
  // The version pill read on its own, in card order. Read out of the card text, a stale
  // badge runs straight into it ("STALEv1.4.1"), which no version pattern can split.
  cap.status.versions = await ev(`JSON.stringify([...document.querySelectorAll(".card, .project-card, [data-project]")].map(function(c){var p=c.querySelector(".version-pill");return p?p.innerText:null}))`).then((s) => (typeof s === "string" && s.startsWith("[") ? JSON.parse(s) : s));
  if (!cap.status.cards || !cap.status.cards.length) cap.status.body = await ev("document.body.innerText");
  // ----- homepage -----
  await send("Page.navigate", { url: `${site}/?audit=${Date.now()}` });
  await sleep(8000);
  cap.homepage.body = await ev("document.body.innerText");
  writeFileSync(out, JSON.stringify(cap, null, 1));
  console.log("wrote " + out);
} finally {
  try { ws && ws.close(); } catch {}
  // proc.kill() ends the browser process alone. On Windows its child processes hold the
  // profile's files open a moment longer, so the removal below failed with EPERM and left
  // 62 megabytes behind (2026-11-20). taskkill ends the whole tree, and the removal retries
  // while the last handles close.
  try {
    if (proc && process.platform === "win32") spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
    else if (proc) proc.kill();
  } catch {}
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (err) {
    console.error(`failed to remove the headless Chrome profile at ${profile}: ${err.message}`);
  }
}
