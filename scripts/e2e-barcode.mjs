// End-to-end test of the barcode reader with a real (synthetic) EAN-13 image:
//  1) live camera: Edge's fake camera streams a video of the barcode;
//  2) photo: the same barcode as a PNG through "Tomar foto del código".
// Usage: node scripts/e2e-barcode.mjs [outDir=.e2e] [baseUrl=http://localhost:3123]
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = resolve(process.argv[2] ?? ".e2e");
const BASE = process.argv[3] ?? "http://localhost:3123";
const CODE = "7802920000084"; // Leche descremada Colun (exists in Open Food Facts)
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
mkdirSync(outDir, { recursive: true });

// --- EAN-13 rendering -------------------------------------------------------
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((p) => [...p].map((b) => (b === "0" ? "1" : "0")).join(""));
const G = R.map((p) => [...p].reverse().join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLG", "LGLGLG", "LGLGGL", "LGGLGL"];
function eanBits(code) {
  const d = [...code].map(Number);
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (PARITY[d[0]][i] === "L" ? L : G)[d[i + 1]];
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += R[d[i]];
  return bits + "101";
}
/** Grayscale W×H canvas with the barcode centred (module px wide, bars barH tall). */
function render(W, H, module, barH) {
  const bits = eanBits(CODE);
  const px = new Uint8Array(W * H).fill(235);
  const x0 = Math.round((W - bits.length * module) / 2);
  const y0 = Math.round((H - barH) / 2);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    for (let y = y0; y < y0 + barH; y++) px.fill(25, y * W + x0 + i * module, y * W + x0 + (i + 1) * module);
  }
  return px;
}

// Y4M video (4:2:0, neutral chroma) for Edge's fake camera.
const VW = 1280, VH = 720;
const luma = render(VW, VH, 4, 220);
const chroma = Buffer.alloc((VW / 2) * (VH / 2), 128);
const frames = [Buffer.from(`YUV4MPEG2 W${VW} H${VH} F30:1 Ip A1:1 C420jpeg\n`)];
for (let f = 0; f < 10; f++) frames.push(Buffer.from("FRAME\n"), Buffer.from(luma), chroma, chroma);
const videoPath = `${outDir}/barcode.y4m`;
writeFileSync(videoPath, Buffer.concat(frames));

// PNG photo (grayscale, 8-bit).
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
const PW = 1600, PH = 1200;
const photo = render(PW, PH, 6, 400);
const raw = Buffer.alloc((PW + 1) * PH);
for (let y = 0; y < PH; y++) photo.subarray(y * PW, (y + 1) * PW).forEach((v, x) => (raw[y * (PW + 1) + 1 + x] = v));
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 0;
const pngPath = `${outDir}/barcode.png`;
writeFileSync(pngPath, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));

// --- Browser ----------------------------------------------------------------
const port = 9400 + Math.floor(Math.random() * 500);
const profile = `${outDir}/bc-profile-${Date.now()}`;
const proc = spawn(EDGE, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${videoPath}`,
  "about:blank",
]);
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
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.result?.value;
const waitFor = async (re, ms) => { for (let t = 0; t < ms; t += 250) { if (re.test(await ev("document.body.innerText"))) return true; await sleep(250); } return false; };
await send("Runtime.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (name, ok) => results.push(`${ok ? "OK  " : "FAIL"} ${name}`);
try {
  // 1. Live camera
  await send("Page.navigate", { url: `${BASE}/escanear/codigo` });
  await sleep(2500);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Activar cámara')).click()`);
  const t0 = Date.now();
  const live = await waitFor(/Buscando 7802920000084|Leche descremada/i, 15000);
  check(`cámara en vivo lee el código (${Date.now() - t0} ms)`, live);
  check("cámara en vivo abre el producto", await waitFor(/Leche descremada/i, 10000));
  const res = await ev("JSON.stringify(performance.getEntriesByType('resource').map(e=>e.name))");
  check("wasm propio, sin CDN externo", /\/zxing\/zxing_reader-/.test(res) && !/jsdelivr|unpkg/.test(res));
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/barcode-live.png`, Buffer.from(s.result.data, "base64"));

  // 2. Photo
  await send("Page.navigate", { url: `${BASE}/escanear/codigo` });
  await sleep(2500);
  const doc = await send("DOM.getDocument");
  const node = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
  await send("DOM.setFileInputFiles", { nodeId: node.result.nodeId, files: [pngPath] });
  check("foto del código abre el producto", await waitFor(/Leche descremada/i, 15000));
} catch (e) {
  results.push("FAIL excepción: " + e.message);
} finally {
  console.log(results.join("\n"));
  if (errors.length) console.log("Errores de página:\n" + errors.join("\n"));
  ws.close();
  // Edge spawns child processes that survive proc.kill(): end the whole tree.
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  else proc.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
