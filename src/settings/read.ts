import * as vscode from "vscode";
import {
  REGION_KEY,
  DISPLAY_MODE_KEY,
  MODAL_LOCATION_KEY,
  DEFAULT_REGION,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_MODAL_LOCATION
} from "./schema";
import {
  isRegion,
  isDisplayMode,
  isModalLocation,
  type Region,
  type DisplayMode,
  type ModalLocation
} from "../types/settings";

export interface SettingsReader {
  readRegion(): Region;
  readDisplayMode(): DisplayMode;
  readModalLocation(): ModalLocation;
  onDidChangeSettings(handler: SettingsChangeHandler): vscode.Disposable;
}

export type SettingsChangeHandler = (
  change: {
    region: boolean;
    displayMode: boolean;
    modalLocation: boolean;
    regionFrom: Region | undefined;
    regionTo: Region;
  }
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
    readModalLocation(): ModalLocation {
      const v = workspaceConfig().get<unknown>(MODAL_LOCATION_KEY);
      if (isModalLocation(v)) {
        return v;
      }
      return DEFAULT_MODAL_LOCATION;
    },
    onDidChangeSettings(handler: SettingsChangeHandler): vscode.Disposable {
      const sub: vscode.Disposable = vscode.workspace.onDidChangeConfiguration((e) => {
        const regionChanged = e.affectsConfiguration(REGION_KEY);
        const displayModeChanged = e.affectsConfiguration(DISPLAY_MODE_KEY);
        const modalLocationChanged = e.affectsConfiguration(MODAL_LOCATION_KEY);
        if (!regionChanged && !displayModeChanged && !modalLocationChanged) {
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
          modalLocation: modalLocationChanged,
          regionFrom,
          regionTo
        });
      });
      return sub;
    }
  };
}
