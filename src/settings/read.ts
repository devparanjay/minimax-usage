import * as vscode from "vscode";
import { REGION_KEY, DISPLAY_MODE_KEY, DEFAULT_REGION, DEFAULT_DISPLAY_MODE } from "./schema";
import { isRegion, isDisplayMode, type Region, type DisplayMode } from "../types/settings";

export interface SettingsReader {
  readRegion(): Region;
  readDisplayMode(): DisplayMode;
  onDidChangeSettings(handler: SettingsChangeHandler): vscode.Disposable;
}

export type SettingsChangeHandler = (
  change: { region: boolean; displayMode: boolean; regionFrom: Region | undefined; regionTo: Region }
) => void;

export function createSettingsReader(
  workspaceConfig: () => vscode.WorkspaceConfiguration
): SettingsReader {
  return {
    readRegion(): Region {
      const v = workspaceConfig().get<unknown>(REGION_KEY);
      if (isRegion(v)) {
        return v;
      }
      return DEFAULT_REGION;
    },
    readDisplayMode(): DisplayMode {
      const v = workspaceConfig().get<unknown>(DISPLAY_MODE_KEY);
      if (isDisplayMode(v)) {
        return v;
      }
      return DEFAULT_DISPLAY_MODE;
    },
    onDidChangeSettings(handler: SettingsChangeHandler): vscode.Disposable {
      const sub: vscode.Disposable = vscode.workspace.onDidChangeConfiguration((e) => {
        const regionChanged = e.affectsConfiguration(REGION_KEY);
        const displayModeChanged = e.affectsConfiguration(DISPLAY_MODE_KEY);
        if (!regionChanged && !displayModeChanged) {
          return;
        }
        const cfg = workspaceConfig();
        const regionFromRaw = cfg.get<unknown>(REGION_KEY);
        const regionFrom: Region | undefined = isRegion(regionFromRaw) ? regionFromRaw : undefined;
        const regionTo: Region = isRegion(cfg.inspect(REGION_KEY)?.defaultValue)
          ? (cfg.get<unknown>(REGION_KEY) as Region)
          : DEFAULT_REGION;
        handler({
          region: regionChanged,
          displayMode: displayModeChanged,
          regionFrom,
          regionTo
        });
      });
      return sub;
    }
  };
}
