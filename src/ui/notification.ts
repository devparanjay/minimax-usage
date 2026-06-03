import * as vscode from "vscode";

const STRINGS = {
  TITLE: "Set your MiniMax API key",
  BODY: "Get your Subscription Key from the MiniMax platform. You can find it under Billing → Token Plan.",
  OPEN_SETTINGS: "Open Settings",
  LATER: "Later"
} as const;

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

  const openSettings = STRINGS.OPEN_SETTINGS;
  const later = STRINGS.LATER;
  const choice = await vscode.window.showInformationMessage(
    STRINGS.TITLE,
    { detail: STRINGS.BODY, modal: false },
    openSettings,
    later
  );
  if (choice === openSettings) {
    await options.commands.executeCommand("workbench.action.openSettings", "minimaxUsage");
  }
  return null;
}
