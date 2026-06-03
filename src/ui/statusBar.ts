import * as vscode from "vscode";
import type { StateStore } from "../state/store";
import type { PollingController } from "../polling/controller";
import type { Logger } from "../util/logger";
import type { ModelRemain } from "../types/contract";
import type { ModalState } from "../types/messages";
import { formatResetIn } from "../util/format";

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

const STRINGS = {
  SETUP: "Set up MiniMax Usage",
  SETUP_TOOLTIP: "Enter your MiniMax Subscription Key to start",
  LOADING: "Loading…",
  LOADING_TOOLTIP: "Fetching usage…",
  SUCCESS_PREFIX_5H: "5h: ",
  SUCCESS_PREFIX_7D: "7d: ",
  SUCCESS_SUFFIX: "%",
  SUCCESS_SEPARATOR: " · ",
  SUCCESS_TOOLTIP: "5h resets in {5hReset} · 7d resets in {7dReset}",
  EMPTY: "No plan",
  EMPTY_TOOLTIP: "No Token Plan data — see the MiniMax console",
  QUOTA_EXHAUSTED: "5h: 0%",
  INVALID_KEY: "Sign in",
  INVALID_KEY_TOOLTIP: "Subscription Key is invalid or missing — open settings",
  RATE_LIMITED: "Rate limited",
  RATE_LIMITED_TOOLTIP: "Too many requests — cooling down",
  TRANSIENT_TOOLTIP: "Last updated {N} {unit} ago — MiniMax API unavailable",
  UNAVAILABLE_TOOLTIP: "Last updated {N} {unit} ago — couldn't reach the MiniMax API",
  CREDITS_UNAVAILABLE: "Credits unavailable",
  CREDITS_UNAVAILABLE_TOOLTIP: "Credits Balance unavailable from the official API",
  STALE_SUFFIX: " (stale)"
} as const;

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
          text: STRINGS.SETUP,
          tooltip: STRINGS.SETUP_TOOLTIP,
          command: SETUP_COMMAND
        };
      case "loading":
        return {
          icon: "$(loading~spin)",
          text: STRINGS.LOADING,
          tooltip: STRINGS.LOADING_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      case "success": {
        const r = last?.model_remains[0];
        const text = r ? renderSuccessText(r) : "5h: 0% · 7d: 0%";
        const tooltip = r ? renderSuccessTooltip(r) : STRINGS.LOADING_TOOLTIP;
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
          text: STRINGS.EMPTY,
          tooltip: STRINGS.EMPTY_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      case "quota_exhausted": {
        const r = last?.model_remains[0];
        const tooltip = r ? renderSuccessTooltip(r) : STRINGS.LOADING_TOOLTIP;
        return {
          icon: "$(warning)",
          text: STRINGS.QUOTA_EXHAUSTED,
          tooltip,
          color: new vscode.ThemeColor("charts.yellow"),
          command: DEFAULT_COMMAND
        };
      }
      case "error:invalid_key":
        return {
          icon: "$(error)",
          text: STRINGS.INVALID_KEY,
          tooltip: STRINGS.INVALID_KEY_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.errorForeground"),
          command: INVALID_KEY_COMMAND
        };
      case "error:rate_limited":
        return {
          icon: "$(warning)",
          text: STRINGS.RATE_LIMITED,
          tooltip: STRINGS.RATE_LIMITED_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.warningForeground"),
          command: DEFAULT_COMMAND
        };
      case "error:transient":
      case "error:unavailable": {
        const r = last?.model_remains[0];
        const text = r
          ? renderSuccessText(r) + STRINGS.STALE_SUFFIX
          : STRINGS.LOADING;
        const n = lastSuccessN(snap.lastSuccessAt);
        const tooltip = renderStaleTooltip(state, n);
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
          text: STRINGS.CREDITS_UNAVAILABLE,
          tooltip: STRINGS.CREDITS_UNAVAILABLE_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
      default:
        return {
          icon: "$(loading~spin)",
          text: STRINGS.LOADING,
          tooltip: STRINGS.LOADING_TOOLTIP,
          color: new vscode.ThemeColor("statusBarItem.foreground"),
          command: DEFAULT_COMMAND
        };
    }
  }
}

function renderSuccessText(r: ModelRemain): string {
  const five = Math.max(0, Math.min(100, Math.round(r.current_interval_remaining_percent)));
  const seven = Math.max(0, Math.min(100, Math.round(r.current_weekly_remaining_percent)));
  return `${STRINGS.SUCCESS_PREFIX_5H}${five}${STRINGS.SUCCESS_SUFFIX}${STRINGS.SUCCESS_SEPARATOR}${STRINGS.SUCCESS_PREFIX_7D}${seven}${STRINGS.SUCCESS_SUFFIX}`;
}

function renderSuccessTooltip(r: ModelRemain): string {
  const fiveReset = formatResetIn(r.remains_time);
  const sevenReset = formatResetIn(r.weekly_remains_time);
  return STRINGS.SUCCESS_TOOLTIP.replace("{5hReset}", fiveReset).replace(
    "{7dReset}",
    sevenReset
  );
}

function lastSuccessN(lastSuccessAt: number | null): { N: number; unit: "s" | "m" | "h" } {
  if (!lastSuccessAt) {
    return { N: 0, unit: "s" };
  }
  const sec = Math.max(0, Math.floor((Date.now() - lastSuccessAt) / 1000));
  if (sec < 60) {
    return { N: sec, unit: "s" };
  }
  if (sec < 3600) {
    return { N: Math.floor(sec / 60), unit: "m" };
  }
  return { N: Math.floor(sec / 3600), unit: "h" };
}

function renderStaleTooltip(
  state: "error:transient" | "error:unavailable",
  n: { N: number; unit: "s" | "m" | "h" }
): string {
  const tmpl = state === "error:transient" ? STRINGS.TRANSIENT_TOOLTIP : STRINGS.UNAVAILABLE_TOOLTIP;
  return tmpl.replace("{N}", String(n.N)).replace("{unit}", n.unit);
}
