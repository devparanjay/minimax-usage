/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ModalSnapshot, HostMessage, WebviewMessage } from "../../../types/messages";
import type { UsageResponse, ModelRemain } from "../../../types/contract";

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscodeApi: ReturnType<typeof acquireVsCodeApi> = acquireVsCodeApi();

let currentSnapshot: ModalSnapshot | null = null;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function setVisible(id: string, visible: boolean): void {
  const node = $(id);
  if (!node) {
    return;
  }
  if (visible) {
    node.removeAttribute("hidden");
  } else {
    node.setAttribute("hidden", "");
  }
}

function setText(id: string, text: string): void {
  const node = $(id);
  if (node) {
    node.textContent = text;
  }
}

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function progressClassFor(remaining: number): string {
  if (remaining > 50) {
    return "bar__fill";
  }
  if (remaining > 20) {
    return "bar__fill bar__fill--warning";
  }
  return "bar__fill bar__fill--danger";
}

function computeFillPercent(remaining: number): number {
  return clamp(100 - remaining, 0, 100);
}

function formatPercent(remaining: number): string {
  return `${clamp(Math.round(remaining), 0, 100)}%`;
}

function formatQuotaUsed(remaining: number): string {
  return `Quota used ${clamp(Math.round(100 - remaining), 0, 100)}%`;
}

function formatResetsIn(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return "Resets in 0s";
  }
  const total = Math.floor(valueMs / 1000);
  if (total < 60) {
    return `Resets in ${total}s`;
  }
  if (total < 3600) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `Resets in ${m}m ${String(s).padStart(2, "0")}s`;
  }
  if (total < 86_400) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `Resets in ${h}h ${m}m`;
  }
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  return `Resets in ${d}d ${h}h`;
}

function formatLastUpdated(seconds: number): string {
  if (seconds < 60) {
    return `Last updated ${Math.max(0, Math.floor(seconds))}s ago`;
  }
  if (seconds < 3600) {
    return `Last updated ${Math.floor(seconds / 60)} min ago`;
  }
  return `Last updated ${Math.floor(seconds / 3600)}h ago`;
}

function renderBar(container: HTMLElement, opts: {
  title: string;
  remainingPercent: number;
  resetsInMs: number;
}): void {
  clearChildren(container);
  const block = el("div", "block");
  block.appendChild(el("div", "block__title", opts.title));

  const bar = el("div", "bar");
  const fill = el("div", progressClassFor(opts.remainingPercent));
  fill.style.width = `${computeFillPercent(opts.remainingPercent)}%`;
  bar.appendChild(fill);
  block.appendChild(bar);

  const value = el("div", "block__value", formatPercent(opts.remainingPercent));
  block.appendChild(value);

  block.appendChild(el("div", "block__sub", formatQuotaUsed(opts.remainingPercent)));
  block.appendChild(el("div", "block__sub", formatResetsIn(opts.resetsInMs)));
  container.appendChild(block);
}

function renderEmpty(container: HTMLElement): void {
  clearChildren(container);
  const block = el("div", "block block--empty");
  block.appendChild(el("div", "block__icon", "$(info)"));
  block.appendChild(el("div", "block__title", "Token Plan data unavailable."));
  block.appendChild(el("div", "block__body", "Check the MiniMax console."));
  container.appendChild(block);
}

function renderCreditsUnavailable(container: HTMLElement): void {
  clearChildren(container);
  const block = el("div", "block");
  block.appendChild(el("div", "block__title", "Credits Balance"));
  const placeholder = el("div", "placeholder");
  placeholder.appendChild(el("div", "placeholder__icon", "$(info)"));
  placeholder.appendChild(el("div", "placeholder__title", "Credits Balance unavailable from the official API."));
  placeholder.appendChild(el("div", "placeholder__body", "Coming in a future version."));
  block.appendChild(placeholder);
  container.appendChild(block);
}

function renderCreditsAvailable(container: HTMLElement, balance: unknown): void {
  clearChildren(container);
  const block = el("div", "block");
  block.appendChild(el("div", "block__title", "Credits Balance"));
  block.appendChild(el("div", "block__value", describeBalance(balance)));
  container.appendChild(block);
}

function describeBalance(balance: unknown): string {
  if (!balance || typeof balance !== "object") {
    return "—";
  }
  const o = balance as Record<string, unknown>;
  if (typeof o["amount"] === "string") {
    return `${o["amount"]} remaining`;
  }
  if (typeof o["amount"] === "number") {
    return `${o["amount"]} remaining`;
  }
  if (typeof o["credits"] === "number") {
    return `${o["credits"]} credits remaining`;
  }
  if (typeof o["balance"] === "number") {
    return `${o["balance"]} credits remaining`;
  }
  if (typeof o["balance"] === "string") {
    return `${o["balance"]} remaining`;
  }
  return "—";
}

function renderErrorBlock(container: HTMLElement, state: ModalSnapshot["state"]): void {
  clearChildren(container);
  const block = el("div", `error error--${state.replace(":", "-")}`);
  const titleEl = el("div", "error__title");
  const bodyEl = el("div", "error__body");
  const cta = el("button", "error__cta");

  if (state === "error:invalid_key") {
    titleEl.textContent = "Couldn't verify your Token Plan key";
    const p1 = el("p");
    p1.innerHTML =
      "Make sure you're using your Subscription Key from Billing &rarr; Token Plan, not your Open Platform API Key from Account &rarr; Basic Information.";
    const p2 = el("p");
    p2.innerHTML =
      "If you subscribed on a different platform (overseas vs Mainland China), switch the region in settings.";
    bodyEl.appendChild(p1);
    bodyEl.appendChild(p2);
    cta.textContent = "Open Settings";
    cta.dataset["action"] = "openSettings";
  } else if (state === "error:rate_limited") {
    titleEl.textContent = "Too many requests";
    bodyEl.textContent = "Cooling down. The next refresh will happen automatically within a minute.";
    cta.textContent = "Dismiss";
    cta.dataset["action"] = "dismiss";
  } else if (state === "error:transient") {
    titleEl.textContent = "Couldn't reach the MiniMax API";
    bodyEl.textContent = "Will retry automatically.";
    cta.textContent = "Dismiss";
    cta.dataset["action"] = "dismiss";
  } else if (state === "error:unavailable") {
    titleEl.textContent = "MiniMax API temporarily unavailable";
    bodyEl.textContent = "Will retry.";
    cta.textContent = "Dismiss";
    cta.dataset["action"] = "dismiss";
  } else {
    return;
  }
  block.appendChild(titleEl);
  block.appendChild(bodyEl);
  block.appendChild(cta);
  container.appendChild(block);
}

function pickModel(usage: UsageResponse | undefined): ModelRemain | null {
  if (!usage) {
    return null;
  }
  if (!Array.isArray(usage.model_remains)) {
    return null;
  }
  return usage.model_remains[0] ?? null;
}

function renderSnapshot(snapshot: ModalSnapshot): void {
  currentSnapshot = snapshot;
  const state = snapshot.state;
  setText("title", titleFor(snapshot));
  setVisible("loading-state", state === "loading" || state === "idle");

  const showData =
    state === "success" ||
    state === "empty" ||
    state === "quota_exhausted";
  setVisible("data", showData);
  setVisible("error", state.startsWith("error:"));

  const data = $("data");
  if (data) {
    if (!showData) {
      clearChildren(data);
    } else if (state === "empty") {
      renderEmpty(data);
    } else {
      const model = pickModel(snapshot.usage);
      if (!model) {
        renderEmpty(data);
      } else {
        clearChildren(data);
        renderBar(data, {
          title: "5-Hour Limit",
          remainingPercent: model.current_interval_remaining_percent,
          resetsInMs: model.remains_time
        });
        data.appendChild(el("hr", "divider"));
        renderBar(data, {
          title: "Weekly Limit",
          remainingPercent: model.current_weekly_remaining_percent,
          resetsInMs: model.weekly_remains_time
        });
      }
    }
  }

  const error = $("error");
  if (error) {
    if (state.startsWith("error:")) {
      renderErrorBlock(error, state);
    } else {
      clearChildren(error);
    }
  }

  const showCredits =
    showData && (snapshot.displayMode === "credits" || snapshot.displayMode === "both");
  setVisible("credits-block", showCredits);
  const credits = $("credits-block");
  if (credits) {
    if (!showCredits) {
      clearChildren(credits);
    } else if (!snapshot.creditsAvailable || !snapshot.creditBalance) {
      renderCreditsUnavailable(credits);
    } else {
      renderCreditsAvailable(credits, snapshot.creditBalance);
    }
  }

  setText(
    "last-updated",
    snapshot.lastSuccessAt
      ? formatLastUpdated(Math.max(0, Math.floor((Date.now() - snapshot.lastSuccessAt) / 1000)))
      : "Last updated never"
  );
}

function titleFor(snapshot: ModalSnapshot): string {
  if (snapshot.displayMode === "credits") {
    return "Credits";
  }
  return "MiniMax Usage";
}

function applyHostMessage(msg: HostMessage): void {
  if (msg.kind === "snapshot") {
    renderSnapshot(msg.payload);
  } else if (msg.kind === "loading" && currentSnapshot) {
    renderSnapshot({ ...currentSnapshot, state: "loading" });
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as HostMessage | undefined;
  if (data && typeof data === "object" && "kind" in data) {
    applyHostMessage(data as HostMessage);
  }
});

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }
  if (target.id === "open-settings-link") {
    vscodeApi.postMessage({ kind: "openSettings" });
    return;
  }
  if (target.id === "dismiss-button") {
    vscodeApi.postMessage({ kind: "dismiss" });
    return;
  }
  if (target.classList.contains("error__cta")) {
    const action = target.dataset["action"];
    if (action === "openSettings") {
      vscodeApi.postMessage({ kind: "openSettings" });
    } else if (action === "dismiss") {
      vscodeApi.postMessage({ kind: "dismiss" });
    }
  }
});

vscodeApi.postMessage({ kind: "ready" });
