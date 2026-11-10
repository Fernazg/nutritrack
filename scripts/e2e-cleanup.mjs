// Shared cleanup for the Edge-based e2e scripts.
import { spawnSync } from "node:child_process";
import { basename } from "node:path";

/**
 * Ends the headless Edge started by a test. On Windows the launched process
 * hands off to a browser process outside its tree, so kill(), and even
 * `taskkill /T`, leave hundreds of processes behind across runs. Every one of
 * them carries the run's unique profile folder on its command line, so match
 * on that (and only that: the user's own Edge is never touched).
 */
export function killEdge(proc, profileDir) {
  try {
    proc.kill();
  } catch {
    /* already gone */
  }
  if (process.platform !== "win32") return;
  const tag = basename(profileDir).replace(/'/g, "");
  if (!/profile-\d+$/.test(tag)) return; // safety: only our own run folders
  const ps = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${tag}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
}
