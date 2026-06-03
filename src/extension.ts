import * as vscode from "vscode";
import { UsageClient } from "./api/client";
import { createSecretStorageWrapper, wrapVscodeSecretStorage } from "./secrets/secretStorage";
import { createStateStore } from "./state/store";
import { createSettingsReader } from "./settings/read";
import { createLogger, type Logger } from "./util/logger";
import { PollingController } from "./polling/controller";
import { StatusBarController } from "./ui/statusBar";
import { UsageModal } from "./ui/webview/usageModal";
import { postFirstRun } from "./ui/notification";
import { createCacheStore } from "./api/cache";

let extensionContext: vscode.ExtensionContext | undefined;

interface ExtensionRefs {
  controller: PollingController;
  statusBar: StatusBarController;
  modal: UsageModal;
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

  const modal = new UsageModal({
    context,
    store,
    controller: undefined as unknown as PollingController,
    logger,
    getApiKey: () => secretStorage.getApiKey()
  });

  const statusBar = new StatusBarController(statusBarItem, {
    store,
    controller: undefined as unknown as PollingController,
    logger,
    onClick: () => {
      void modal.openOrFocus();
    },
    openModal: () => {
      void modal.openOrFocus();
    }
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
      void modal.postSnapshot(snapshot);
    }
  });

  modal.attachController(controller);
  statusBar.attachController(controller);
  refs.controller = controller;
  refs.statusBar = statusBar;
  refs.modal = modal;
  refs.cache = cache;
  refs.logger = logger;

  refs.configListener = settings.onDidChangeSettings((change) => {
    if (change.region) {
      cache.invalidateAll();
      void controller.refreshNow("region-change", { forceRefresh: true });
    } else {
      void statusBar.render();
    }
  });
  context.subscriptions.push(refs.configListener);

  refs.secretListener = secretStorage.onDidChangeApiKey(() => {
    cache.invalidateAll();
    void controller.refreshNow("api-key-change", { forceRefresh: true });
    void statusBar.render();
    void modal.handleApiKeyChange();
  });
  context.subscriptions.push(refs.secretListener);

  const setApiKeyCmd = vscode.commands.registerCommand(
    "minimaxUsage.setApiKey",
    async () => {
      const current = await secretStorage.getApiKey();
      const value = await vscode.window.showInputBox({
        prompt: "Paste your Subscription Key",
        placeHolder: "sk-cp-…",
        password: true,
        value: current ?? "",
        ignoreFocusOut: true,
        validateInput: (v) => {
          if (!v || v.length === 0) {
            return undefined;
          }
          if (!v.startsWith("sk-cp-")) {
            return "Subscription Keys start with `sk-cp-`. Check that you copied the full key from Billing → Token Plan.";
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
      void vscode.window.showInformationMessage(
        "Subscription Key saved. MiniMax Usage will refresh."
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

  const showUsageCmd = vscode.commands.registerCommand(
    "minimaxUsage.showUsage",
    async () => {
      const apiKey = await secretStorage.getApiKey();
      if (!apiKey) {
        await vscode.commands.executeCommand("minimaxUsage.setApiKey");
        return;
      }
      await modal.openOrFocus();
    }
  );
  context.subscriptions.push(showUsageCmd);

  context.subscriptions.push({
    dispose: () => {
      controller.dispose();
      statusBar.dispose();
      modal.dispose();
    }
  });

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
