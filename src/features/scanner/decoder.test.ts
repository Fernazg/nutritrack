import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ZXING_WASM_VERSION } from "zxing-wasm/reader";
import { decodeImage, initDecoder, isValidGtin, WASM_PATH } from "./decoder";

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((p) => [...p].map((b) => (b === "0" ? "1" : "0")).join(""));
const G = R.map((p) => [...p].reverse().join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLG", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Renders an EAN-13 as a grayscale-in-RGBA image, like a camera frame. */
function ean13Image(code: string, { module = 3, height = 80, quiet = 12, noise = 0 } = {}) {
  const d = [...code].map(Number);
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (PARITY[d[0]][i] === "L" ? L : G)[d[i + 1]];
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += R[d[i]];
  bits += "101";
  const width = (bits.length + quiet * 2) * module;
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * noise;
  for (let x = 0; x < width; x++) {
    const m = Math.floor(x / module) - quiet;
    const dark = m >= 0 && m < bits.length && bits[m] === "1";
    for (let y = 0; y < height; y++) {
      const v = (dark ? 30 : 230) + rand();
      const o = (y * width + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = v;
      data[o + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("isValidGtin", () => {
  it("accepts real codes", () => {
    expect(isValidGtin("7802920000084")).toBe(true);
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("96385074")).toBe(true);
  });
  it("rejects bad check digits and lengths", () => {
    expect(isValidGtin("7802920000085")).toBe(false);
    expect(isValidGtin("12345")).toBe(false);
    expect(isValidGtin("abc")).toBe(false);
  });
});

describe("decodeImage (zxing-wasm)", () => {
  beforeAll(() => {
    const wasm = readFileSync(join(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"));
    initDecoder({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) });
  });

  it("reads a clean EAN-13", async () => {
    expect(await decodeImage(ean13Image("7802920000084"))).toBe("7802920000084");
  });

  it("reads a noisy, thin EAN-13", async () => {
    expect(await decodeImage(ean13Image("4006381333931", { module: 2, noise: 40 }))).toBe("4006381333931");
  });

  it("returns null when there is no barcode", async () => {
    const blank = ean13Image("7802920000084");
    blank.data.fill(200);
    expect(await decodeImage(blank)).toBeNull();
  });

  it("self-hosted wasm matches the installed version", () => {
    expect(WASM_PATH).toBe(`/zxing/zxing_reader-${ZXING_WASM_VERSION}.wasm`);
    expect(existsSync(join(process.cwd(), "public", WASM_PATH))).toBe(true);
  });
});
