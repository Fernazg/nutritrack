// End-to-end test of the meal-photo screen with the AI endpoints stubbed in
// the browser (no Gemini quota used, no real photo sent anywhere):
//  - the app sends a resized JPEG + the access token to /api/ia/foto;
//  - USDA matches use USDA values, the rest are labelled "Estimación IA";
//  - grams are editable and the entries land in the diary.
// Usage: node scripts/e2e-photo.mjs [outDir=.e2e] [baseUrl=http://localhost:3123]
import { spawn } from "node:child_process";
import { killEdge } from "./e2e-cleanup.mjs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = resolve(process.argv[2] ?? ".e2e");
const BASE = process.argv[3] ?? "http://localhost:3123";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const TOKEN = "e2e-token";
mkdirSync(outDir, { recursive: true });

// A plain 800×600 RGB PNG (the content doesn't matter: the AI is stubbed).
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const PW = 2400, PH = 1800;
const raw = Buffer.alloc((PW * 3 + 1) * PH);
for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
  const o = y * (PW * 3 + 1) + 1 + x * 3;
  const inPlate = (x - PW / 2) ** 2 + (y - PH / 2) ** 2 < (PH * 0.4) ** 2;
  raw[o] = inPlate ? 240 : 120; raw[o + 1] = inPlate ? 236 : 90; raw[o + 2] = inPlate ? 225 : 60;
}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 2;
const pngPath = `${outDir}/plate.png`;
writeFileSync(pngPath, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));

// What the stubbed /api/ia/foto answers (same shape as the real route).
const ANALYSIS = {
  isFood: true,
  items: [
    { name: "Arroz blanco", grams: 158, fdcId: 168878, estimate: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 } },
    { name: "Pastel de choclo", grams: 350, fdcId: null, estimate: { calories: 160, protein: 8, carbs: 15, fat: 7.5 } },
  ],
  note: "No se ve si tiene aceite.",
  estimated: true,
};

// --- Browser ----------------------------------------------------------------
const port = 9400 + Math.floor(Math.random() * 500);
const profile = `${outDir}/photo-profile-${Date.now()}`;
const proc = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
const photoRequests = [];
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const json = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64");
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
  if (d.method === "Fetch.requestPaused") {
    const { requestId, request } = d.params;
    const headers = [{ name: "Content-Type", value: "application/json" }];
    if (request.url.endsWith("/api/ia/estado")) {
      void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: headers, body: json({ configured: true }) });
    } else if (request.url.endsWith("/api/ia/foto")) {
      photoRequests.push({ token: request.headers["x-app-token"], body: request.postData ?? "", hasPostData: request.hasPostData });
      void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: headers, body: json(ANALYSIS) });
    } else {
      void send("Fetch.continueRequest", { requestId });
    }
  }
};
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.result?.value;
const waitFor = async (re, ms) => { for (let t = 0; t < ms; t += 250) { if (re.test(await ev("document.body.innerText"))) return true; await sleep(250); } return false; };
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(s.result.data, "base64"));
};
await send("Runtime.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/ia/*" }] });

const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "OK  " : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`);
const bodyText = async () => (await ev("document.body.innerText")).replace(/\s+/g, " ");
try {
  // Without a token the screen explains what is missing.
  await send("Page.navigate", { url: `${BASE}/escanear/foto` });
  check("sin token pide activarlo", await waitFor(/Guarda tu token de acceso/, 10000));

  await ev(`localStorage.setItem('nutritrack.aiToken', '${TOKEN}')`);
  await send("Page.navigate", { url: `${BASE}/escanear/foto` });
  await sleep(2500);
  const enabled = await ev(`!document.querySelector('[aria-label="Tomar foto de la comida"]') ? false : ![...document.querySelectorAll('button')].find(b=>b.innerText.includes('Tomar foto')).disabled`);
  check("botón Tomar foto activo con token", enabled === true);

  const doc = await send("DOM.getDocument");
  const node = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[aria-label="Tomar foto de la comida"]' });
  await send("DOM.setFileInputFiles", { nodeId: node.result.nodeId, files: [pngPath] });
  check("muestra los alimentos detectados", await waitFor(/Arroz blanco cocido/, 15000));

  const req = photoRequests[0];
  check("envía el token de acceso", req?.token === TOKEN);
  const m = /"image":"([A-Za-z0-9+/=]+)"/.exec(req?.body ?? "");
  const kb = m ? Math.round((m[1].length * 3) / 4 / 1024) : 0;
  check("envía JPEG reducido", !!m && m[1].startsWith("/9j/") && kb < 600, `${kb} KB`);

  let text = await bodyText();
  check("arroz con valores USDA", /USDA · 205 kcal/.test(text));
  check("pastel marcado como estimación IA", /Pastel de choclo Estimación IA · 560 kcal/.test(text));
  check("total 765 kcal", /\b765 kcal \d+ Prot/.test(text));
  check("muestra la nota de precisión", text.includes("No se ve si tiene aceite."));
  check("aviso de privacidad", text.includes("se envía a Google Gemini"));
  await shot("photo-result");

  // Edit grams: rice 158 → 200 g = 260 kcal.
  await ev(`document.querySelector('[aria-label="Gramos de Arroz blanco cocido"]').focus()`);
  await ev(`document.querySelector('[aria-label="Gramos de Arroz blanco cocido"]').select()`);
  await send("Input.insertText", { text: "200" });
  await sleep(300);
  text = await bodyText();
  check("editar gramos recalcula", /USDA · 260 kcal/.test(text) && /\b820 kcal \d+ Prot/.test(text));

  // Choose "Cena" and log.
  await ev(`[...document.querySelectorAll('[role=radio]')].find(b=>b.innerText==='Cena').click()`);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Registrar 2 alimentos')).click()`);
  check("registra y vuelve al diario", await waitFor(/Pastel de choclo \(estimado\)/, 10000));
  const entries = await ev(`new Promise(r=>{const q=indexedDB.open('nutritrack');q.onsuccess=()=>{const t=q.result.transaction('foodEntries').objectStore('foodEntries').getAll();t.onsuccess=()=>r(t.result.map(e=>[e.meal,e.name,e.quantity,e.calories,e.source].join('|')))}})`);
  check("entradas guardadas en Cena con origen foto", JSON.stringify(entries) === JSON.stringify(["cena|Arroz blanco cocido|200 g|260|photo", "cena|Pastel de choclo (estimado)|350 g|560|photo"]), JSON.stringify(entries));
  check("diario muestra 820 kcal", /\b820 de [\d.]+ · kcal/.test(await bodyText()));
  await shot("photo-diary");

  // The USDA match is remembered in recents; the AI estimate is not.
  const foods = await ev(`new Promise(r=>{const q=indexedDB.open('nutritrack');q.onsuccess=()=>{const t=q.result.transaction('foods').objectStore('foods').getAll();t.onsuccess=()=>r(t.result.map(f=>f.name))}})`);
  check("solo el alimento USDA queda en recientes", JSON.stringify(foods) === JSON.stringify(["Arroz blanco cocido"]), JSON.stringify(foods));
} catch (e) {
  results.push("FAIL excepción: " + e.message);
} finally {
  console.log(results.join("\n"));
  if (errors.length) console.log("Errores de página:\n" + errors.join("\n"));
  ws.close();
  killEdge(proc, profile);
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
