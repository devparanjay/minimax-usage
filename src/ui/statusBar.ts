import * as vscode from "vscode";
import type { StateStore } from "../state/store";
import type { PollingController } from "../polling/controller";
import type { Logger } from "../util/logger";
import type { ModelRemain } from "../types/contract";
import type { ModalState } from "../types/messages";
import { formatResetIn, formatLastUpdatedAgo } from "../util/format";
import { STRINGS } from "../strings";

export interface StatusBarItemOptions {
  store: StateStore;
  controller: PollingController;
  logger: Logger;
  onClick: () => void;
  openModal: () => void;
}

type PresentationState = ModalState | "setup" | "credits-unavailable";

interface StatusBarPresentation {
  icon: string;
  text: string;
  tooltip: string;
  color?: vscode.ThemeColor;
  backgroundColor?: vscode.ThemeColor;
  command: string;
}

const DEFAULT_COMMAND = "minimaxUsage.showUsage";
const SETUP_COMMAND = "minimaxUsage.setApiKey";
const INVALID_KEY_COMMAND = "minimaxUsage.openSettings";

export class StatusBarController {
  private readonly item: vscode.StatusBarItem;
  private readonly opts: StatusBarItemOptions;
  private currentApiKey: string | undefined = undefined;

  constructor(item: vscode.StatusBarItem, options: StatusBarItemOptions) {
    this.item = item;
    this.opts = options;
    this.item.command = DEFAULT_COMMAND;
    this.item.show();
  }

  attachController(controller: PollingController): void {
    (this.opts as { controller: PollingController }).controller = controller;
  }

  async setApiKey(apiKey: string | undefined): Promise<void> {
    this.currentApiKey = apiKey;
    await this.render();
  }

  async render(): Promise<void> {
    const apiKey = this.currentApiKey;
    const state = this.computeState(apiKey);
    const presentation = this.buildPresentation(state);
    this.item.text = presentation.text;
    this.item.tooltip = presentation.tooltip;
    this.item.color = presentation.color;
    this.item.backgroundColor = presentation.backgroundColor;
    this.item.command = presentation.command;
  }

  dispose(): void {
    this.item.dispose();
  }

  private computeState(apiKey: string | undefined): PresentationState {
    if (!apiKey) {
      return "setup";
    }
    const snap = this.opts.store.read();
    if (snap.lastError) {
      switch (snap.lastError.kind) {
        case "invalid_key":
          return "error:invalid_key";
        case "rate_limited":
          return "error:rate_limited";
        case "transient":
          return snap.lastKnownGood ? "error:transient" : "loading";
        case "unknown":
          return snap.lastKnownGood ? "error:unavailable" : "loading";
        default:
          break;
      }
    }
    if (snap.creditsAvailable === false && snap.displayMode === "credits") {
      return "credits-unavailable";
    }
    if (!snap.lastKnownGood) {
      return "loading";
    }
    const first = snap.lastKnownGood.model_remains[0];
    if (!first) {
      return "empty";
    }
    if (first.current_interval_remaining_percent <= 0) {
      return "quota_exhausted";
    }
    return "success";
  }

  private buildPresentation(state: PresentationState): StatusBarPresentation {
    const snap = this.opts.store.read();
    const last = snap.lastKnownGood;

    switch (state) {
      case "setup":
        return {
          icon: "$(gear)",
          text: STRINGS.STR_STATUSBAR_SETUP,
          tooltip: STRINGS.STR_STATUSBAR_SETUP_TOOLTIP,
          command: SETUP_COMMAND
        };
      case "loading":
        return {
          icon: "$(loading~spin)",
          text: STRINGS.STR_STATUSBAR_LOADING,
          tooltip: STRINGS.STR_STATUSBAR_LOADING_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      case "success": {
        const r = last?.model_remains[0];
        const text = r ? renderSuccessText(r) : "5h: 0% · 7d: 0%";
        const tooltip = r ? renderSuccessTooltip(r) : STRINGS.STR_STATUSBAR_LOADING_TOOLTIP;
        return {
          icon: "$(check)",
          text,
          tooltip,
          color: new vscode.ThemeColor("charts.green"),
          command: DEFAULT_COMMAND
        };
      }
      case "empty":
        return {
          icon: "$(dash)",
          text: STRINGS.STR_STATUSBAR_EMPTY,
          tooltip: STRINGS.STR_STATUSBAR_EMPTY_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      case "quota_exhausted": {
        const r = last?.model_remains[0];
        const tooltip = r ? renderSuccessTooltip(r) : STRINGS.STR_STATUSBAR_LOADING_TOOLTIP;
        return {
          icon: "$(warning)",
          text: STRINGS.STR_STATUSBAR_QUOTA_EXHAUSTED,
          tooltip,
          color: new vscode.ThemeColor("charts.yellow"),
          command: DEFAULT_COMMAND
        };
      }
      case "error:invalid_key":
        return {
          icon: "$(error)",
          text: STRINGS.STR_STATUSBAR_INVALIDKEY,
          tooltip: STRINGS.STR_STATUSBAR_INVALIDKEY_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.errorForeground"),
          command: INVALID_KEY_COMMAND
        };
      case "error:rate_limited":
        return {
          icon: "$(warning)",
          text: STRINGS.STR_STATUSBAR_RATELIMITED,
          tooltip: STRINGS.STR_STATUSBAR_RATELIMITED_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.warningForeground"),
          command: DEFAULT_COMMAND
        };
      case "error:transient":
      case "error:unavailable": {
        const r = last?.model_remains[0];
        const text = r
          ? renderStaleText(r)
          : STRINGS.STR_STATUSBAR_LOADING;
        const seconds = snap.lastSuccessAt
          ? Math.max(0, Math.floor((Date.now() - snap.lastSuccessAt) / 1000))
          : 0;
        const tooltip = renderStaleTooltip(state, seconds);
        return {
          icon: "$(sync)",
          text,
          tooltip,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      }
      case "credits-unavailable":
        return {
          icon: "$(dash)",
          text: STRINGS.STR_STATUSBAR_CREDITS_UNAVAILABLE,
          tooltip: STRINGS.STR_STATUSBAR_CREDITS_UNAVAILABLE_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      default:
        return {
          icon: "$(loading~spin)",
          text: STRINGS.STR_STATUSBAR_LOADING,
          tooltip: STRINGS.STR_STATUSBAR_LOADING_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
    }
  }
}

function renderSuccessText(r: ModelRemain): string {
  const five = Math.max(0, Math.min(100, Math.round(r.current_interval_remaining_percent)));
  const seven = Math.max(0, Math.min(100, Math.round(r.current_weekly_remaining_percent)));
  return STRINGS.STR_STATUSBAR_SUCCESS.replace("{5hPercent}", String(five)).replace(
    "{7dPercent}",
    String(seven)
  );
}

function renderStaleText(r: ModelRemain): string {
  const five = Math.max(0, Math.min(100, Math.round(r.current_interval_remaining_percent)));
  const seven = Math.max(0, Math.min(100, Math.round(r.current_weekly_remaining_percent)));
  const tmpl = STRINGS.STR_STATUSBAR_TRANSIENT;
  return tmpl.replace("{5hPercent}", String(five)).replace("{7dPercent}", String(seven));
}

function renderSuccessTooltip(r: ModelRemain): string {
  const fiveReset = formatResetIn(r.remains_time);
  const sevenReset = formatResetIn(r.weekly_remains_time);
  return STRINGS.STR_STATUSBAR_SUCCESS_TOOLTIP.replace("{5hReset}", fiveReset).replace(
    "{7dReset}",
    sevenReset
  );
}

function renderStaleTooltip(
  state: "error:transient" | "error:unavailable",
  seconds: number
): string {
  const formatted = formatLastUpdatedAgo(seconds, "statusbar");
  if (state === "error:transient") {
    return STRINGS.STR_STATUSBAR_TRANSIENT_TOOLTIP.replace("Last updated {N} {unit} ago", formatted);
  }
  return STRINGS.STR_STATUSBAR_UNAVAILABLE_TOOLTIP.replace("Last updated {N} {unit} ago", formatted);
}
