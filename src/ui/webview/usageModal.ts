import * as vscode from "vscode";
import type { Logger } from "../../util/logger";
import type { StateStore } from "../../state/store";
import type { ModalSnapshot, HostMessage, WebviewMessage } from "../../types/messages";
import type { Region, DisplayMode } from "../../types/settings";
import { onModalOpen, onApiKeyChange } from "../../polling/triggers";
import type { PollingController } from "../../polling/controller";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readBundledHtml(): string {
  const candidates = [
    join("dist", "webview", "modal.html"),
    join("src", "ui", "webview", "template", "modal.html")
  ];
  for (const c of candidates) {
    try {
      return readFileSync(c, "utf8");
    } catch {
      continue;
    }
  }
  return "<!doctype html><html><body>MiniMax Usage modal template not found.</body></html>";
}

export interface UsageModalOptions {
  context: vscode.ExtensionContext;
  store: StateStore;
  controller: PollingController;
  logger: Logger;
  getApiKey: () => Promise<string | undefined>;
}

export class UsageModal {
  private readonly opts: UsageModalOptions;
  private panel: vscode.WebviewPanel | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(options: UsageModalOptions) {
    this.opts = options;
  }

  attachController(controller: PollingController): void {
    (this.opts as { controller: PollingController }).controller = controller;
  }

  async openOrFocus(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    const distDir = this.distDir();
    const panel = vscode.window.createWebviewPanel(
      "minimaxUsage.modal",
      "MiniMax Usage",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(distDir)],
        retainContextWhenHidden: true
      }
    );
    panel.webview.html = this.buildHtml(panel.webview);
    panel.webview.onDidReceiveMessage(
      (msg: WebviewMessage) => this.handleWebviewMessage(msg),
      undefined,
      this.disposables
    );
    panel.onDidDispose(
      () => {
        this.panel = null;
        for (const d of this.disposables.splice(0, this.disposables.length)) {
          d.dispose();
        }
      },
      undefined,
      this.disposables
    );
    this.panel = panel;
    onModalOpen(this.opts.controller);
  }

  async postSnapshot(snapshot: import("../../state/types").PersistedSnapshot): Promise<void> {
    if (!this.panel) {
      return;
    }
    const apiKey = await this.opts.getApiKey();
    if (!apiKey) {
      return;
    }
    const modalSnapshot: ModalSnapshot = {
      state: this.toModalState(snapshot),
      region: snapshot.region as Region,
      displayMode: snapshot.displayMode as DisplayMode,
      creditsAvailable: snapshot.creditsAvailable,
      lastSuccessAt: snapshot.lastSuccessAt ?? undefined,
      usage: snapshot.lastKnownGood ?? undefined,
      creditBalance: undefined
    };
    if (snapshot.lastError) {
      modalSnapshot.lastError = {
        kind: snapshot.lastError.kind,
        at: snapshot.lastError.at,
        statusCode: snapshot.lastError.statusCode
      };
    }
    const msg: HostMessage = { kind: "snapshot", payload: modalSnapshot };
    this.panel.webview.postMessage(msg);
  }

  postLoading(): void {
    if (!this.panel) {
      return;
    }
    const msg: HostMessage = { kind: "loading" };
    this.panel.webview.postMessage(msg);
  }

  async handleApiKeyChange(): Promise<void> {
    onApiKeyChange(this.opts.controller);
  }

  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
    for (const d of this.disposables.splice(0, this.disposables.length)) {
      d.dispose();
    }
  }

  private toModalState(snapshot: import("../../state/types").PersistedSnapshot): ModalSnapshot["state"] {
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

  private distDir(): string {
    return join(this.opts.context.extensionPath, "dist", "webview");
  }

  private buildHtml(webview: vscode.Webview): string {
    const html = readBundledHtml();
    const cssUri = webview.asWebviewUri(vscode.Uri.file(join(this.distDir(), "modal.css")));
    const jsUri = webview.asWebviewUri(vscode.Uri.file(join(this.distDir(), "modal.js")));
    return html
      .replace(
        'href="modal.css"',
        `href="${cssUri.toString()}"`
      )
      .replace(
        'src="modal.js"',
        `src="${jsUri.toString()}"`
      );
  }

  private async handleWebviewMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.kind) {
      case "ready":
        onModalOpen(this.opts.controller);
        await this.postSnapshot(this.opts.store.read());
        break;
      case "openSettings":
        await vscode.commands.executeCommand("workbench.action.openSettings", "minimaxUsage");
        break;
      case "dismiss":
        if (this.panel) {
          this.panel.dispose();
        }
        break;
    }
  }
}
