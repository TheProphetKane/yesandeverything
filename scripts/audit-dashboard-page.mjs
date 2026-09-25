// audit-dashboard-page.mjs: read the LIVE dashboard, status page and homepage the way a
// visitor sees them, past the gate, and write every value they show to one JSON capture.
// scripts/audit-dashboard-page.py then compares the capture with the feeds and the
// canonical status files. Written 2026-09-23 after a session verified the feeds, called
// the dashboard fresh, and left four stale panels on the page.
//
//   node scripts/audit-dashboard-page.mjs [out.json]
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
const out = process.argv[2] || "scripts/.audit-capture.json";
const chrome = "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe";
const port = 9340;
const profile = "X:/YesAndEverything/scripts/.chrome-audit";
const site = "https://yesandeverything.com";
const gateHash = (readFileSync("dashboard/index.html", "utf8").match(/GATE_HASH = "([0-9a-f]+)"/) || [])[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The headless Chrome profile at `profile` is scratch space, not an artifact: it held 81
// megabytes of cache left behind by the 2026-09-23 run because the removal below was an
// empty catch, so a failure here vanished with nothing said. Cleanup now runs in a finally,
// so it happens whether the capture above succeeded or threw, and a failure is logged
// instead of swallowed.
let proc;
let ws;
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
  const cap = { capturedAt: new Date().toISOString(), dashboard: {}, status: {}, homepage: {} };
  // ----- dashboard -----
  await send("Page.navigate", { url: `${site}/dashboard/?audit=${Date.now()}` });
  await sleep(16000);
  const D = cap.dashboard;
  D.errorBanner = await ev('document.getElementById("error-banner").innerText');
  D.ticker = await ev('document.getElementById("ticker").innerText');
  D.band = { health: await ev('document.getElementById("band-health").innerText'), verdict: await ev('document.getElementById("band-verdict-word").innerText'), sub: await ev('document.getElementById("band-sub").innerText'), nums: await texts("#band-nums .band-num"), actions: await texts("#band-actions .band-act"), risk: await ev('document.getElementById("band-risk").innerText') };
  D.totals = await texts("#totals .total");
  D.legend = await texts("#core-legend > span");
  D.radar = await ev('document.getElementById("panel-radar").innerText');
  D.spotlights = [];
  for (let i = 0; i < 14; i++) {
    D.spotlights.push({ text: await ev('document.getElementById("spotlight").innerText'), chips: await texts("#spotlight .chip") });
    await ev('document.getElementById("nav-next").click()'); await sleep(700);
  }
  D.strip = await texts("#strip .mini");
  D.lists = {};
  await ev('document.getElementById("lists-btn").click()'); await sleep(900);
  for (const k of ["done", "found", "queue"]) {
    await ev(`([...document.querySelectorAll(".list-tabs > *")].find(function(t){return t.getAttribute("data-k")==="${k}"})||{click:function(){}}).click()`); await sleep(600);
    D.lists[k] = await ev('document.getElementById("glass-body").innerText');
  }
  await ev('document.getElementById("glass-close").click()');
  // ----- status page -----
  await send("Page.navigate", { url: `${site}/status/?audit=${Date.now()}` });
  await sleep(12000);
  cap.status.top = await ev('(document.getElementById("constellation")||{innerText:""}).innerText');
  cap.status.cards = await texts(".card, .project-card, [data-project]");
  if (!cap.status.cards || !cap.status.cards.length) cap.status.body = await ev("document.body.innerText");
  // ----- homepage -----
  await send("Page.navigate", { url: `${site}/?audit=${Date.now()}` });
  await sleep(8000);
  cap.homepage.body = await ev("document.body.innerText");
  writeFileSync(out, JSON.stringify(cap, null, 1));
  console.log("wrote " + out);
} finally {
  try { ws && ws.close(); } catch {}
  try { proc && proc.kill(); } catch {}
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch (err) {
    console.error(`failed to remove the headless Chrome profile at ${profile}: ${err.message}`);
  }
}
