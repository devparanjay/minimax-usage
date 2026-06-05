import * as vscode from "vscode";
import { UsageClient } from "./api/client";
import { createSecretStorageWrapper, wrapVscodeSecretStorage } from "./secrets/secretStorage";
import { createStateStore } from "./state/store";
import { createSettingsReader } from "./settings/read";
import { createLogger, type Logger } from "./util/logger";
import { PollingController } from "./polling/controller";
import { StatusBarController } from "./ui/statusBar";
import {
  SidebarUsageViewProvider,
  SIDEBAR_VIEW_ID
} from "./ui/webview/sidebarUsageView";
import { postFirstRun } from "./ui/notification";
import { createCacheStore } from "./api/cache";
import { STRINGS } from "./strings";

let extensionContext: vscode.ExtensionContext | undefined;

interface ExtensionRefs {
  controller: PollingController;
  statusBar: StatusBarController;
  sidebar: SidebarUsageViewProvider;
  cache: ReturnType<typeof createCacheStore>;
  configListener: vscode.Disposable;
  secretListener: vscode.Disposable;
  logger: Logger;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extensionContext = context;
  const outputChannel = vscode.window.createOutputChannel("MiniMax Usage");
  const logger: Logger = createLogger(outputChannel);
  context.subscriptions.push(outputChannel);

  const secretStorage = createSecretStorageWrapper(
    wrapVscodeSecretStorage(context.secrets)
  );
  const store = createStateStore(context.globalState);
  const cache = createCacheStore();
  const settings = createSettingsReader(() =>
    vscode.workspace.getConfiguration()
  );
  const client = new UsageClient({ cache });

  const refs: Partial<ExtensionRefs> = {};
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  const sidebar = new SidebarUsageViewProvider({
    context,
    store,
    controller: undefined as unknown as PollingController,
    logger,
    getApiKey: () => secretStorage.getApiKey()
  });

  // The status bar's click fires the built-in `workbench.view.minimaxUsage`
  // command (set as `DEFAULT_COMMAND` in `src/ui/statusBar.ts`). The
  // command activates the activity bar icon for the `minimaxUsage`
  // container and reveals the usage view. This is the popup UX for
  // v0.1.0 — a real view in the primary (left) sidebar, not an editor
  // tab and not a secondary-side-bar tab.

  const statusBar = new StatusBarController(statusBarItem, {
    store,
    controller: undefined as unknown as PollingController,
    logger
  });

  const controller = new PollingController({
    client,
    store,
    settings,
    logger,
    getApiKey: () => secretStorage.getApiKey(),
    pollIntervalMs: 60_000,
    debounceMs: 750,
    fireAfterRefresh: (snapshot) => {
      void statusBar.render();
      sidebar.postSnapshot(snapshot);
    }
  });

  statusBar.attachController(controller);
  sidebar.attachController(controller);
  refs.controller = controller;
  refs.statusBar = statusBar;
  refs.sidebar = sidebar;
  refs.cache = cache;
  refs.logger = logger;

  const sidebarProviderReg = vscode.window.registerWebviewViewProvider(
    SIDEBAR_VIEW_ID,
    sidebar,
    { webviewOptions: { retainContextWhenHidden: true } }
  );
  context.subscriptions.push(sidebarProviderReg);
  context.subscriptions.push(sidebar);

  refs.configListener = settings.onDidChangeSettings(async (change) => {
    const region = settings.readRegion();
    const displayMode = settings.readDisplayMode();
    await store.setRegion(region);
    await store.setDisplayMode(displayMode);
    if (change.region) {
      cache.invalidateAll();
      void controller.refreshNow("region-change", { forceRefresh: true });
    } else if (change.displayMode) {
      void statusBar.render();
      sidebar.postSnapshot(store.read());
    }
  });
  context.subscriptions.push(refs.configListener);

  refs.secretListener = secretStorage.onDidChangeApiKey(() => {
    cache.invalidateAll();
    void controller.refreshNow("api-key-change", { forceRefresh: true });
    void statusBar.render();
  });
  context.subscriptions.push(refs.secretListener);

  const setApiKeyCmd = vscode.commands.registerCommand(
    "minimaxUsage.setApiKey",
    async () => {
      const current = await secretStorage.getApiKey();
      const value = await vscode.window.showInputBox({
        prompt: STRINGS.STR_APIKEY_INPUTBOX_PROMPT,
        placeHolder: STRINGS.STR_APIKEY_INPUTBOX_PLACEHOLDER,
        password: true,
        value: current ?? "",
        ignoreFocusOut: true,
        validateInput: (v) => {
          if (!v || v.length === 0) {
            return undefined;
          }
          if (!v.startsWith("sk-cp-")) {
            return STRINGS.STR_APIKEY_INPUTBOX_VALIDATION_ERROR;
          }
          return undefined;
        }
      });
      if (!value) {
        return;
      }
      if (!value.startsWith("sk-cp-")) {
        return;
      }
      await secretStorage.setApiKey(value);
      await cache.invalidateAll();
      void controller.refreshNow("api-key-change", { forceRefresh: true });
      void statusBar.render();
      void vscode.window.showInformationMessage(
        STRINGS.STR_APIKEY_INPUTBOX_SUCCESS
      );
    }
  );
  context.subscriptions.push(setApiKeyCmd);

  const openSettingsCmd = vscode.commands.registerCommand(
    "minimaxUsage.openSettings",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "minimaxUsage"
      );
    }
  );
  context.subscriptions.push(openSettingsCmd);

  // D-12 wrapper for the status bar's default click. The status bar's
  // `DEFAULT_COMMAND` (see `src/ui/statusBar.ts`) points at
  // `minimaxUsage.openUsage` rather than the built-in
  // `workbench.view.<viewId>` directly. The view id is
  // `minimaxUsage.usage` (the `SIDEBAR_VIEW_ID` exported from
  // `src/ui/webview/sidebarUsageView.ts`); the container id is
  // `minimaxUsage`. Going through a custom command keeps the
  // orchestrator in control of the click flow — the status bar
  // depends on a string we register here, not on a VSCode built-in
  // that could be renamed in a future release.
  const openUsageCmd = vscode.commands.registerCommand(
    "minimaxUsage.openUsage",
    async () => {
      await vscode.commands.executeCommand("workbench.view.minimaxUsage.usage");
    }
  );
  context.subscriptions.push(openUsageCmd);

  context.subscriptions.push({
    dispose: () => {
      controller.dispose();
      statusBar.dispose();
      sidebar.dispose();
    }
  });

  await store.setRegion(settings.readRegion());
  await store.setDisplayMode(settings.readDisplayMode());
  await statusBar.setApiKey(await secretStorage.getApiKey());
  await statusBar.render();

  const apiKey = await secretStorage.getApiKey();
  if (!apiKey) {
    void postFirstRun({
      secrets: secretStorage,
      commands: vscode.commands
    });
  } else {
    controller.refreshNow("timer");
  }
  controller.start();
}

export function deactivate(): void {
  if (extensionContext) {
    for (const sub of extensionContext.subscriptions) {
      try {
        sub.dispose();
      } catch {
        // ignore
      }
    }
  }
}
