import type { PollingController, RefreshReason } from "./controller";

export function onTimerTick(controller: PollingController): void {
  controller.refreshNow("timer");
}

export function onFocus(controller: PollingController): void {
  controller.refreshNow("focus");
}

export function onModalOpen(controller: PollingController): void {
  controller.refreshNow("modal-open");
}

export function onStatusBarClick(controller: PollingController): void {
  controller.refreshNow("manual-click", { forceRefresh: true });
}

export function onRegionChange(controller: PollingController): void {
  controller.refreshNow("region-change", { forceRefresh: true });
}

export function onDisplayModeChange(controller: PollingController): void {
  controller.refreshNow("display-mode-change");
}

export function onApiKeyChange(controller: PollingController): void {
  controller.refreshNow("api-key-change", { forceRefresh: true });
}

export function onSettingsOpen(controller: PollingController): void {
  controller.refreshNow("settings-open");
}

export type { RefreshReason };
