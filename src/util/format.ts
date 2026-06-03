// Canonical "Resets in" and "Last updated" formatters.
// The host-side status bar and the webview-side modal both
// import from this file. The webview bundle includes this
// module via esbuild's host + webview entry tree-shaking.

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

export function formatResetIn(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return "12s";
  }
  const sec = Math.floor(valueMs / 1_000);
  if (sec < SECONDS_PER_MINUTE) {
    return `${sec}s`;
  }
  if (sec < SECONDS_PER_HOUR) {
    const m = Math.floor(sec / SECONDS_PER_MINUTE);
    const s = sec % SECONDS_PER_MINUTE;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  if (sec < SECONDS_PER_DAY) {
    const h = Math.floor(sec / SECONDS_PER_HOUR);
    const m = Math.floor((sec % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(sec / SECONDS_PER_DAY);
  const h = Math.floor((sec % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  return `${d}d ${h}h`;
}

export type LastUpdatedSurface = "modal" | "statusbar";

export interface LastUpdatedValue {
  N: number;
  unit: "s" | "m" | "min" | "h";
}

export function formatLastUpdatedAgo(seconds: number, surface: LastUpdatedSurface): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }
  const sec = Math.max(0, Math.floor(seconds));
  if (sec < SECONDS_PER_MINUTE) {
    return unitResult("s", sec, surface);
  }
  if (sec < SECONDS_PER_HOUR) {
    return unitResult(surface === "modal" ? "min" : "m", Math.floor(sec / SECONDS_PER_MINUTE), surface);
  }
  return unitResult("h", Math.floor(sec / SECONDS_PER_HOUR), surface);
}

function unitResult(unit: LastUpdatedValue["unit"], N: number, surface: LastUpdatedSurface): string {
  if (surface === "modal") {
    return `Last updated ${N} ${unit} ago`;
  }
  return `Last updated ${N} ${unit} ago`;
}
