import { decodeImage } from "./decoder";

const MAX_FRAME_WIDTH = 1280;
const PAUSE_MS = 60;

type TrackCaps = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min: number; max: number };
};

/** Best-effort: continuous autofocus and a little zoom so the phone can stay
 * at a distance where the lens is able to focus. Ignored where unsupported. */
async function tuneTrack(track: MediaStreamTrack) {
  const caps = (track.getCapabilities?.() ?? {}) as TrackCaps;
  const advanced: Record<string, unknown>[] = [];
  if (caps.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
  if (caps.zoom && caps.zoom.max >= 1.5) {
    advanced.push({ zoom: Math.min(Math.max(2, caps.zoom.min), caps.zoom.max) });
  }
  for (const c of advanced) {
    try {
      await track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] });
    } catch {
      /* unsupported on this device */
    }
  }
}

function drawRegion(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number,
): ImageData {
  const scale = Math.min(1, MAX_FRAME_WIDTH / sw);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Decodes frames from the video until a code is found. Alternates between the
 * centre band (where the guide box is) and the whole frame. Returns `stop`.
 */
export function startScanLoop(
  video: HTMLVideoElement,
  stream: MediaStream,
  onCode: (code: string) => void,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const [track] = stream.getVideoTracks();
  if (track) void tuneTrack(track);

  let tick = 0;
  async function step() {
    if (stopped || !ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw && vh && video.readyState >= 2) {
      tick++;
      const frame =
        tick % 3 === 0
          ? drawRegion(ctx, video, 0, 0, vw, vh)
          : drawRegion(ctx, video, vw * 0.08, vh * 0.25, vw * 0.84, vh * 0.5);
      try {
        const code = await decodeImage(frame);
        if (code && !stopped) {
          onCode(code);
          return;
        }
      } catch {
        /* decoder still loading or a bad frame: keep trying */
      }
    }
    if (!stopped) timer = setTimeout(step, PAUSE_MS);
  }
  timer = setTimeout(step, PAUSE_MS);

  return () => {
    stopped = true;
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
}

/** Loads a photo (respecting EXIF orientation) at a size the decoder handles well. */
export async function imageDataFromFile(file: Blob, maxSide = 2400): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
