// End-to-end smoke test (Microsoft Edge headless via DevTools Protocol, iPhone 390 px).
// Usage: node scripts/e2e-edge.mjs [outDir=.e2e] [baseUrl=http://localhost:3123] [light|dark]
// Requires a running build (npm run build && npx next start -p 3123) and internet for Open Food Facts.
import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const outDir = process.argv[2] ?? ".e2e";
import { mkdirSync } from "node:fs";
mkdirSync(outDir, { recursive: true });
const BASE = process.argv[3] ?? "http://localhost:3123";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const port = 9400 + Math.floor(Math.random() * 500);
const profile = `${outDir}/e2e3-profile-${Date.now()}`;
try { rmSync(profile, { recursive: true, force: true }); } catch {}
const proc = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.result?.value;
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: process.argv[4] ?? "light" }] });

const nav = async (p) => { await send("Page.navigate", { url: BASE + p }); await sleep(2500); };
const text = () => ev("document.body.innerText");
const click = async (label) => {
  const ok = await ev(`(() => { const els=[...document.querySelectorAll('button,a,[role=radio],[role=tab]')]; const el=els.find(e=>e.innerText.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)}); if(!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error("No encontré: " + label);
  await sleep(500);
};
const clickContaining = async (selector, needle) => {
  const ok = await ev(`(() => { const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.innerText.includes(${JSON.stringify(needle)})); if(!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error("No encontré: " + needle);
  await sleep(700);
};
const fill = async (selector, value) => {
  const ok = await ev(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return false; el.focus(); el.select && el.select(); return true; })()`);
  if (!ok) throw new Error("No encontré input: " + selector);
  await send("Input.insertText", { text: value });
  await sleep(120);
};
const submitForm = async (selector) => { await ev(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`); await sleep(400); };
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${outDir}/v3-${name}.png`, Buffer.from(s.result.data, "base64")); };
const results = [];
const check = (name, cond) => results.push(`${cond ? "OK  " : "FAIL"} ${name}`);

try {
  // 1. Dashboard first run: profile CTA + water
  await nav("/");
  await sleep(1500);
  let t = await text();
  check("dashboard invita a personalizar metas", t.includes("Personaliza tus metas"));
  await click("Agregar 250 ml de agua");
  await click("Agregar 250 ml de agua");
  check("agua suma 0,5 L", (await text()).includes("0,5 L"));
  await click("Quitar último registro de agua");
  check("deshacer agua deja 0,25 L", (await text()).includes("0,25 L"));

  // 2. Profile calculator
  await nav("/ajustes");
  await click("Calcular mis metas");
  await fill("#f-ano-de-nacimiento", "1996");
  await fill("#f-altura", "175");
  await fill("#f-peso-actual", "80");
  await clickContaining('[role=radio]', 'Moderado');
  t = await text();
  const year = new Date().getFullYear();
  // Mifflin male 80kg 175cm age (year-1996): bmr = 800+1093.75-5*age+5
  const age = year - 1996;
  const bmr = Math.round(800 + 1093.75 - 5 * age + 5);
  check(`perfil muestra BMR ${bmr}`, t.includes(bmr.toLocaleString("es-CL")));
  await shot("profile");
  await click("Aplicar");
  t = await text();
  check("perfil guardado (Perder grasa · Moderado)", t.includes("Perder grasa · Moderado"));
  await nav("/");
  check("dashboard ya no muestra el aviso de perfil", !(await text()).includes("Personaliza tus metas"));
  check("peso inicial guardado desde el perfil", (await text()).includes("80,0 kg"));

  // 3. Manual food via search sheet, then re-log from recents with grams
  await nav("/diario/almuerzo");
  await click("Agregar alimento");
  await fill('input[aria-label="Buscar alimento"]', "Pollo asado");
  await click("Manual");
  await fill("#f-calorias", "330");
  await fill("#f-proteinas", "45");
  await submitForm("#food-entry-form");
  t = await text();
  check("alimento manual guardado con nombre de la búsqueda", t.includes("Pollo asado") && t.includes("330 kcal"));

  await nav("/diario/cena");
  await click("Agregar alimento");
  t = await text();
  check("recientes muestra el alimento guardado", t.includes("Pollo asado"));
  await clickContaining("[role=dialog] li button", "Pollo asado");
  await click("1,5×");
  await submitForm("#portion-form");
  t = await text();
  check("relog desde recientes escala la porción (495 kcal)", t.includes("495 kcal"));

  // 4. Repeat previous day prompt not shown when today has entries; copy works on empty meal tomorrow? (use diary yesterday)
  // 5. Barcode manual entry (needs internet + OFF)
  await nav("/escanear/codigo");
  await fill("#f-codigo", "7802920000084");
  await submitForm("form:not(#portion-form)");
  await sleep(4000);
  t = await text();
  const offOk = /leche descremada/i.test(t);
  check("código manual encuentra producto en Open Food Facts", offOk);
  if (offOk) {
    await shot("barcode-product");
    check("etiqueta muestra datos por 100 ml y referencia de sellos", /Etiqueta · por 100 ml/.test(await text()) && /Ley 20.606/.test(await text()));
    await submitForm("#barcode-portion");
    await sleep(600);
    await nav("/");
    check("producto escaneado suma al día", /leche descremada/i.test(await text()));
  }

  // 6. Online search
  await nav("/diario/once");
  await click("Agregar alimento");
  await fill('input[aria-label="Buscar alimento"]', "yoghurt colun");
  await clickContaining("button", "Buscar «yoghurt colun»");
  await sleep(4000);
  t = await text();
  check("búsqueda en línea devuelve resultados", /por 100 (g|ml)/.test(t) && /colun/i.test(t));
  await shot("search");

  // 7. Stats
  await nav("/progreso");
  t = await text();
  check("estadísticas semanales visibles", t.includes("Últimos 7 días") && t.includes("1/7"));
  await shot("progreso");

  // 8. Favorites
  await nav("/diario/desayuno");
  await click("Agregar alimento");
  await clickContaining("[role=dialog] li button", "Pollo asado");
  await click("Agregar a favoritos");
  await submitForm("#portion-form");
  await click("Agregar alimento");
  await click("Favoritos");
  check("favoritos lista el alimento marcado", (await text()).includes("Pollo asado"));
  await click("Cancelar");

  // 8b. Custom meal (comida personalizada)
  await nav("/diario/almuerzo");
  await click("Agregar alimento");
  await clickContaining("[role=dialog] li button", "Pollo asado");
  await submitForm("#portion-form");
  await click("Guardar comida");
  await fill('input[aria-label="Nombre de la comida"]', "Almuerzo de prueba");
  await submitForm("#save-meal-form");
  await nav("/diario/once");
  await click("Agregar alimento");
  await click("Favoritos");
  t = await text();
  check("comida personalizada guardada en favoritos (660 kcal)", t.includes("Almuerzo de prueba") && t.includes("660"));
  await clickContaining("[role=dialog] li button", "Almuerzo de prueba");
  await submitForm("#portion-form");
  check("comida personalizada se registra en un toque", (await text()).includes("Almuerzo de prueba"));

  // 9. Export payload counts
  const counts = await ev(`(async()=>{ const db = await new Promise(res=>{const q=indexedDB.open('nutritrack'); q.onsuccess=()=>res(q.result)}); const c=(s)=>new Promise(res=>{const r=db.transaction(s).objectStore(s).count(); r.onsuccess=()=>res(r.result)}); const out={food:await c('foodEntries'), foods:await c('foods'), water:await c('waterEntries'), weight:await c('weightEntries'), settings:await c('settings')}; db.close(); return JSON.stringify(out); })()`);
  check(`IndexedDB v2 consistente ${counts}`, JSON.parse(counts).water === 1 && JSON.parse(counts).settings === 2);

  // 10. Activity
  await nav("/diario");
  await clickContaining("button", "Agregar");
  await clickContaining("[role=radio]", "Caminar rápido");
  await fill("#f-duracion", "60");
  await submitForm("#exercise-form");
  t = await text();
  check("actividad registrada (5 MET × 80 kg × 1 h = 400 kcal)", t.includes("Caminar rápido") && t.includes("400 kcal"));
  await shot("diario");

  // 11. Suggestions from saved foods on dashboard
  await nav("/");
  t = await text();
  if (t.includes("kcal excedidas")) check("sugerencias ocultas al superar la meta", !t.includes("Para completar tu día"));
  else check("sugerencias con alimentos propios visibles", t.includes("Para completar tu día"));
  check("tarjeta IA oculta sin configuración", !t.includes("Ideas con IA"));
  await nav("/");
  await shot("dashboard");
} catch (e) {
  results.push("ERROR " + e.message);
  await shot("error");
}

check("sin errores en consola " + JSON.stringify(errors.slice(0, 2)).slice(0, 400), errors.length === 0);
console.log(results.join("\n"));
ws.close();
proc.kill();
