import type { Region } from "../types/contract";

export function resolveHost(region: Region): string {
  if (region === "cn") {
    return "https://www.minimaxi.com";
  }
  return "https://www.minimax.io";
}
