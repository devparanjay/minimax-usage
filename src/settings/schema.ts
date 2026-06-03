// The `markdownDescription` and `enumDescriptions` strings in
// `package.json#contributes.configuration` MUST mirror the values
// returned by the functions in this file. The canonical source of
// truth is `src/strings.ts`, which mirrors
// `.kitchen/design/strings-v0.1.0.md`. The build phase does not
// generate `package.json`; any drift between the schema output and
// the manifest is a bug.

import type { Region, DisplayMode } from "../types/settings";
import { STRINGS } from "../strings";

export interface ConfigurationSchema {
  [key: string]: unknown;
  "minimaxUsage.region": Region;
  "minimaxUsage.displayMode": DisplayMode;
}

export const REGION_KEY = "minimaxUsage.region" as const;
export const DISPLAY_MODE_KEY = "minimaxUsage.displayMode" as const;

export const DEFAULT_REGION: Region = "overseas";
export const DEFAULT_DISPLAY_MODE: DisplayMode = "tokenPlan";

export function regionMarkdownDescription(): string {
  return STRINGS.STR_SETTINGS_REGION_MD_DESC;
}

export function regionEnumDescriptions(): [string, string] {
  return [
    STRINGS.STR_SETTINGS_REGION_ENUM_0,
    STRINGS.STR_SETTINGS_REGION_ENUM_1
  ];
}

export function displayModeMarkdownDescription(): string {
  return STRINGS.STR_SETTINGS_DISPLAYMODE_MD_DESC;
}

export function displayModeEnumDescriptions(): [string, string, string] {
  return [
    STRINGS.STR_SETTINGS_DISPLAYMODE_ENUM_0,
    STRINGS.STR_SETTINGS_DISPLAYMODE_ENUM_1,
    STRINGS.STR_SETTINGS_DISPLAYMODE_ENUM_2
  ];
}
