import * as vscode from "vscode";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StateStore } from "../../state/store";
import type { PollingController } from "../../polling/controller";
import type { Logger } from "../../util/logger";
import type { ModalSnapshot, HostMessage, WebviewMessage } from "../../types/messages";
import type { Region, DisplayMode } from "../../types/settings";
import { onModalOpen } from "../../polling/triggers";

export interface AuxiliaryUsageViewOptions {
  context: vscode.ExtensionContext;
  store: StateStore;
  controller: PollingController;
  logger: Logger;
  getApiKey: () => Promise<string | undefined>;
}

export const AUXILIARY_VIEW_ID = "minimaxUsage.usage" as const;

export class AuxiliaryUsageViewProvider implements vscode.WebviewViewProvider {
  private opts: AuxiliaryUsageViewOptions;
  private view: vscode.WebviewView | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(options: AuxiliaryUsageViewOptions) {
    this.opts = options;
  }

  attachController(controller: PollingController): void {
    (this.opts as { controller: PollingController }).controller = controller;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(this.distDir())]
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(
      (msg: WebviewMessage) => this.handleWebviewMessage(msg),
      undefined,
      this.disposables
    );
    webviewView.onDidDispose(
      () => {
        this.view = null;
      },
      undefined,
      this.disposables
    );
  }

  postSnapshot(snapshot: import("../../state/types").PersistedSnapshot): void {
    if (!this.view) {
      return;
    }
    const modalSnapshot: ModalSnapshot = this.toModalSnapshot(snapshot);
    const hostMsg: HostMessage = { kind: "snapshot", payload: modalSnapshot };
    void this.view.webview.postMessage(hostMsg);
  }

  postLoading(): void {
    if (!this.view) {
      return;
    }
    const hostMsg: HostMessage = { kind: "loading" };
    void this.view.webview.postMessage(hostMsg);
  }

  private distDir(): string {
    return join(this.opts.context.extensionPath, "dist", "webview");
  }

  private readBundledHtml(): string {
    const htmlPath = join(
      this.opts.context.extensionPath,
      "dist",
      "webview",
      "modal.html"
    );
    try {
      return readFileSync(htmlPath, "utf8");
    } catch {
      this.opts.logger.error("auxiliary.modal.template.missing", { htmlPath });
      return "<!doctype html><html><body>MiniMax Usage modal template not found.</body></html>";
    }
  }

  private buildHtml(webview: vscode.Webview): string {
    const html = this.readBundledHtml();
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(join(this.distDir(), "modal.css"))
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.file(join(this.distDir(), "modal.js"))
    );
    return html
      .replace('href="modal.css"', `href="${cssUri.toString()}"`)
      .replace('src="modal.js"', `src="${jsUri.toString()}"`);
  }

  private async handleWebviewMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.kind) {
      case "ready": {
        onModalOpen(this.opts.controller);
        const snapshot = this.opts.store.read();
        const modalSnapshot: ModalSnapshot = this.toModalSnapshot(snapshot);
        if (this.view) {
          const hostMsg: HostMessage = {
            kind: "snapshot",
            payload: modalSnapshot
          };
          await this.view.webview.postMessage(hostMsg);
        }
        break;
      }
      case "openSettings": {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "minimaxUsage"
        );
        break;
      }
      case "dismiss": {
        break;
      }
    }
  }

  private toModalState(
    snapshot: import("../../state/types").PersistedSnapshot
  ): ModalSnapshot["state"] {
    if (snapshot.lastError) {
      switch (snapshot.lastError.kind) {
        case "invalid_key":
          return "error:invalid_key";
        case "rate_limited":
          return "error:rate_limited";
        case "transient":
          return snapshot.lastKnownGood ? "error:transient" : "loading";
        case "unknown":
          return snapshot.lastKnownGood ? "error:unavailable" : "loading";
        default:
          break;
      }
    }
    if (!snapshot.lastKnownGood) {
      return "loading";
    }
    const first = snapshot.lastKnownGood.model_remains[0];
    if (!first) {
      return "empty";
    }
    if (first.current_interval_remaining_percent <= 0) {
      return "quota_exhausted";
    }
    return "success";
  }

  private toModalSnapshot(
    snapshot: import("../../state/types").PersistedSnapshot
  ): ModalSnapshot {
    const modalSnapshot: ModalSnapshot = {
      state: this.toModalState(snapshot),
      region: snapshot.region as Region,
      displayMode: snapshot.displayMode as DisplayMode,
      creditsAvailable: snapshot.creditsAvailable,
      lastSuccessAt: snapshot.lastSuccessAt ?? undefined,
      usage: snapshot.lastKnownGood ?? undefined,
      creditBalance: snapshot.creditBalance ?? undefined
    };
    if (snapshot.lastError) {
      modalSnapshot.lastError = {
        kind: snapshot.lastError.kind,
        at: snapshot.lastError.at,
        statusCode: snapshot.lastError.statusCode
      };
    }
    return modalSnapshot;
  }

  dispose(): void {
    for (const d of this.disposables.splice(0, this.disposables.length)) {
      d.dispose();
    }
    this.view = null;
  }
}
