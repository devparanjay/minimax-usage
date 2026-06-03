export function formatResetIn(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return "12s";
  }
  const sec = Math.floor(valueMs / 1000);
  if (sec < 60) {
    return `${sec}s`;
  }
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  if (sec < 86_400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (sec < 7 * 86_400) {
    const d = Math.floor(sec / 86_400);
    const h = Math.floor((sec % 86_400) / 3600);
    return `${d}d ${h}h`;
  }
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  return `${d}d ${h}h`;
}

export function formatTimestampUnit(seconds: number): { N: number; unit: "s" | "min" | "h" } {
  if (seconds < 60) {
    return { N: Math.max(0, Math.floor(seconds)), unit: "s" };
  }
  if (seconds < 3600) {
    return { N: Math.floor(seconds / 60), unit: "min" };
  }
  return { N: Math.floor(seconds / 3600), unit: "h" };
}
