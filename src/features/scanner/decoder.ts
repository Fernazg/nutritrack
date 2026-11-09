import {
  prepareZXingModule,
  readBarcodes,
  ZXING_WASM_VERSION,
  type ReaderOptions,
} from "zxing-wasm/reader";

/**
 * Barcode decoding with zxing-cpp compiled to WebAssembly (zxing-wasm, MIT).
 * Much more reliable on iPhone than the pure-JS port. The .wasm file is
 * self-hosted in /public/zxing so no third-party CDN is contacted.
 */
export const WASM_PATH = `/zxing/zxing_reader-${ZXING_WASM_VERSION}.wasm`;

const OPTIONS: ReaderOptions = {
  formats: ["EAN13", "EAN8", "UPCA", "UPCE"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  maxNumberOfSymbols: 1,
};

type ModuleOverrides = NonNullable<Parameters<typeof prepareZXingModule>[0]>["overrides"];

const SELF_HOSTED: ModuleOverrides = {
  locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? WASM_PATH : prefix + path),
};

let overrides: ModuleOverrides | null = null;
/** Configures where the .wasm comes from (tests pass `wasmBinary` directly). */
export function initDecoder(custom?: ModuleOverrides) {
  overrides = custom ?? SELF_HOSTED;
  prepareZXingModule({ overrides });
}
function ensureModule() {
  if (!overrides) initDecoder();
}

/** Starts downloading the decoder early (e.g. when the camera opens). */
export function warmUpDecoder() {
  ensureModule();
  // Same overrides object, so the module is reused rather than re-created.
  void prepareZXingModule({ overrides: overrides!, fireImmediately: true }).catch(() => {});
}

/** GS1 check digit validation for EAN-8/EAN-13/UPC-A (8, 12 or 13 digits). */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Returns the first valid EAN/UPC code in the image, or null. */
export async function decodeImage(input: ImageData | Blob): Promise<string | null> {
  ensureModule();
  const results = await readBarcodes(input, OPTIONS);
  for (const r of results) {
    if (!r.isValid) continue;
    const text = r.text.trim();
    // UPC-E is expanded by zxing to its digits; accept it as-is.
    if (r.format === "UPCE" ? /^\d{6,8}$/.test(text) : isValidGtin(text)) return text;
  }
  return null;
}
