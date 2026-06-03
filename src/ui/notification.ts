import * as vscode from "vscode";
import { STRINGS } from "../strings";

export interface PostFirstRunOptions {
  secrets: { getApiKey(): Promise<string | undefined> };
  commands: {
    executeCommand<T = unknown>(command: string, ...rest: unknown[]): Thenable<T>;
  };
}

export async function postFirstRun(options: PostFirstRunOptions): Promise<vscode.Disposable | null> {
  const existing = await options.secrets.getApiKey();
  if (existing) {
    return null;
  }

  const openSettings = STRINGS.STR_FIRST_RUN_NOTIFICATION_OPEN_SETTINGS;
  const later = STRINGS.STR_FIRST_RUN_NOTIFICATION_LATER;
  const choice = await vscode.window.showInformationMessage(
    STRINGS.STR_FIRST_RUN_NOTIFICATION_TITLE,
    { detail: STRINGS.STR_FIRST_RUN_NOTIFICATION_BODY, modal: false },
    openSettings,
    later
  );
  if (choice === openSettings) {
    await options.commands.executeCommand("workbench.action.openSettings", "minimaxUsage");
  }
  return null;
}
