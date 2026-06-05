/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ModalSnapshot,
  HostMessage,
  WebviewMessage
} from "../../../types/messages";
import type { UsageResponse, ModelRemain, Region } from "../../../types/contract";
import type { DisplayMode } from "../../../types/settings";
import { STRINGS } from "../../../strings";
import { formatResetIn, formatLastUpdatedAgo } from "../../../util/format";

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

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
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
    return "block__bar-fill";
  }
  if (remaining > 20) {
    return "block__bar-fill block__bar-fill--warning";
  }
  return "block__bar-fill block__bar-fill--danger";
}

function computeFillPercent(remaining: number): number {
  return clamp(100 - remaining, 0, 100);
}

function formatQuotaUsed(remaining: number): string {
  return STRINGS.STR_BAR_QUOTA_USED.replace(
    "{N}",
    String(clamp(Math.round(100 - remaining), 0, 100))
  );
}

function formatResetsIn(valueMs: number): string {
  return STRINGS.STR_BAR_RESETS_IN.replace("{reset}", formatResetIn(valueMs));
}

function regionLabel(region: Region): string {
  return region === "cn"
    ? STRINGS.STR_SIDEBAR_REGION_CN
    : STRINGS.STR_SIDEBAR_REGION_OVESEAS;
}

function applyStaticStrings(): void {
  const nodes = document.querySelectorAll<HTMLElement>("[data-str]");
  nodes.forEach((node) => {
    const id = node.dataset["str"];
    if (!id) {
      return;
    }
    const value = (STRINGS as unknown as Record<string, string>)[id];
    if (typeof value === "string") {
      node.textContent = value;
    }
  });
}

function renderBar(
  container: HTMLElement,
  opts: {
    title: string;
    remainingPercent: number;
    resetsInMs: number;
  }
): void {
  clearChildren(container);
  const block = el("div", "block");
  const head = el("div", "block__head");
  head.appendChild(el("div", "block__title", opts.title));
  head.appendChild(
    el("div", "block__value", `${Math.round(opts.remainingPercent)}%`)
  );
  block.appendChild(head);

  const bar = el("div", "block__bar");
  const fill = el("div", progressClassFor(opts.remainingPercent));
  fill.style.width = `${computeFillPercent(opts.remainingPercent)}%`;
  bar.appendChild(fill);
  block.appendChild(bar);

  const sub = el("div", "block__sub");
  sub.appendChild(
    el("div", "block__sub-left", formatQuotaUsed(opts.remainingPercent))
  );
  sub.appendChild(
    el("div", "block__sub-right", formatResetsIn(opts.resetsInMs))
  );
  block.appendChild(sub);
  container.appendChild(block);
}

function renderEmpty(container: HTMLElement): void {
  clearChildren(container);
  const block = el("div", "block block--empty");
  block.appendChild(el("div", "block--empty__icon", "$(info)"));
  block.appendChild(el("div", "block--empty__title", STRINGS.STR_EMPTY_TITLE));
  block.appendChild(el("div", "block--empty__body", STRINGS.STR_EMPTY_BODY));
  container.appendChild(block);
}

function renderCreditsUnavailable(container: HTMLElement): void {
  clearChildren(container);
  const block = el("div", "block block--credits-unavailable");
  block.appendChild(
    el("div", "block--credits-unavailable__icon", "$(info)")
  );
  block.appendChild(
    el("div", "block--credits-unavailable__title", STRINGS.STR_CREDITS_UNAVAILABLE_TITLE)
  );
  block.appendChild(
    el("div", "block--credits-unavailable__body", STRINGS.STR_CREDITS_UNAVAILABLE_BODY)
  );
  container.appendChild(block);
}

function renderCreditsAvailable(container: HTMLElement, balance: unknown): void {
  clearChildren(container);
  const block = el("div", "block");
  const head = el("div", "block__head");
  head.appendChild(
    el("div", "block__title", STRINGS.STR_BLOCK_CREDITS_TITLE)
  );
  head.appendChild(el("div", "block__value", describeBalance(balance)));
  block.appendChild(head);
  container.appendChild(block);
}

function describeBalance(balance: unknown): string {
  if (!balance || typeof balance !== "object") {
    return "—";
  }
  const o = balance as Record<string, unknown>;
  if (typeof o["amount"] === "string") {
    return STRINGS.STR_CREDITS_BALANCE.replace("{amount}", o["amount"]);
  }
  if (typeof o["amount"] === "number") {
    return STRINGS.STR_CREDITS_BALANCE.replace("{amount}", String(o["amount"]));
  }
  if (typeof o["balance"] === "string") {
    return STRINGS.STR_CREDITS_BALANCE.replace("{amount}", o["balance"]);
  }
  if (typeof o["balance"] === "number") {
    return STRINGS.STR_CREDITS_BALANCE.replace("{amount}", String(o["balance"]));
  }
  if (typeof o["credits"] === "number") {
    return `${o["credits"]} credits remaining`;
  }
  return "—";
}

function renderErrorBlock(
  container: HTMLElement,
  state: ModalSnapshot["state"]
): void {
  clearChildren(container);
  const variant = state.startsWith("error:")
    ? state.replace("error:", "error-")
    : state;
  const block = el("div", `error error--${variant}`);
  const titleEl = el("div", "error__title");
  const bodyEl = el("div", "error__body");
  const cta = el("button", "error__cta");

  if (state === "error:invalid_key") {
    titleEl.textContent = STRINGS.STR_ERROR_INVALIDKEY_TITLE;
    const paragraphs = STRINGS.STR_ERROR_INVALIDKEY_BODY.split("\n\n");
    for (const para of paragraphs) {
      const p = el("p");
      p.innerHTML = para
        .replace(/→/g, "&rarr;")
        .replace(/Subscription Key/g, "<strong>Subscription Key</strong>")
        .replace(/Open Platform API Key/g, "<strong>Open Platform API Key</strong>");
      bodyEl.appendChild(p);
    }
    cta.textContent = STRINGS.STR_ERROR_INVALIDKEY_CTA_PRIMARY;
    cta.dataset["action"] = "openSettings";
  } else if (state === "error:rate_limited") {
    titleEl.textContent = STRINGS.STR_ERROR_RATELIMITED_TITLE;
    bodyEl.textContent = STRINGS.STR_ERROR_RATELIMITED_BODY;
    cta.textContent = STRINGS.STR_ERROR_RATELIMITED_CTA_PRIMARY;
    cta.dataset["action"] = "dismiss";
    block.classList.remove("error--error-rate_limited");
    block.classList.add("error--warning");
  } else if (state === "error:transient") {
    titleEl.textContent = STRINGS.STR_ERROR_TRANSIENT_TITLE;
    bodyEl.textContent = STRINGS.STR_ERROR_TRANSIENT_BODY;
    cta.textContent = STRINGS.STR_ERROR_TRANSIENT_CTA_PRIMARY;
    cta.dataset["action"] = "dismiss";
    block.classList.remove("error--error-transient");
    block.classList.add("error--info");
  } else if (state === "error:unavailable") {
    titleEl.textContent = STRINGS.STR_ERROR_UNAVAILABLE_TITLE;
    bodyEl.textContent = STRINGS.STR_ERROR_UNAVAILABLE_BODY;
    cta.textContent = STRINGS.STR_ERROR_UNAVAILABLE_CTA_PRIMARY;
    cta.dataset["action"] = "dismiss";
    block.classList.remove("error--error-unavailable");
    block.classList.add("error--info");
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
  setText("region-indicator", regionLabel(snapshot.region));

  setVisible("loading-state", state === "loading" || state === "idle");

  const displayMode: DisplayMode = snapshot.displayMode;
  const isCreditsOnly = displayMode === "credits";
  const showTokenPlanData =
    state === "success" || state === "empty" || state === "quota_exhausted";
  const showBlocks = showTokenPlanData && !isCreditsOnly;

  setVisible("data-blocks", showBlocks);
  setVisible("error-block", state.startsWith("error:"));

  const data = $("data-blocks");
  if (data) {
    if (!showBlocks) {
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
          title: STRINGS.STR_BLOCK_5H_TITLE,
          remainingPercent: model.current_interval_remaining_percent,
          resetsInMs: model.remains_time
        });
        renderBar(data, {
          title: STRINGS.STR_BLOCK_WEEKLY_TITLE,
          remainingPercent: model.current_weekly_remaining_percent,
          resetsInMs: model.weekly_remains_time
        });
      }
    }
  }

  const error = $("error-block");
  if (error) {
    if (state.startsWith("error:")) {
      renderErrorBlock(error, state);
    } else {
      clearChildren(error);
    }
  }

  const showCredits =
    showTokenPlanData && (displayMode === "credits" || displayMode === "both");
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
      ? formatLastUpdatedAgo(
          Math.max(0, Math.floor((Date.now() - snapshot.lastSuccessAt) / 1000)),
          "modal"
        )
      : STRINGS.STR_FOOTER_LAST_UPDATED_NEVER
  );
}

function titleFor(snapshot: ModalSnapshot): string {
  // The sidebar view always shows the same title regardless of
  // displayMode. The displayMode affects the data blocks rendered
  // below the header, not the header itself.
  void snapshot;
  return STRINGS.STR_SIDEBAR_TITLE;
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
  if (target.classList.contains("error__cta")) {
    const action = target.dataset["action"];
    if (action === "openSettings") {
      vscodeApi.postMessage({ kind: "openSettings" });
    } else if (action === "dismiss") {
      vscodeApi.postMessage({ kind: "dismiss" });
    }
  }
});

function applyFallbackTitle(): void {
  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.textContent = "MiniMax Usage";
  }
}

try {
  applyStaticStrings();
  vscodeApi.postMessage({ kind: "ready" });
} catch {
  applyFallbackTitle();
}
