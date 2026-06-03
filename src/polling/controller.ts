import * as vscode from "vscode";
import type { UsageClient, UsageError } from "../api/client";
import type { StateStore } from "../state/store";
import type { SettingsReader } from "../settings/read";
import type { Logger } from "../util/logger";
import { createRateLimiter, RATE_LIMIT_WINDOW_MS } from "./rateLimit";
import { createAbortController, type AbortHandle } from "../util/abort";
import { coalesce } from "../util/debounce";
import { isUsageErrorKind } from "../api/client";

export type RefreshReason =
  | "timer"
  | "focus"
  | "modal-open"
  | "manual-click"
  | "region-change"
  | "display-mode-change"
  | "api-key-change"
  | "settings-open";

export interface PollingControllerOptions {
  client: UsageClient;
  store: StateStore;
  settings: SettingsReader;
  logger: Logger;
  getApiKey: () => Promise<string | undefined>;
  pollIntervalMs: number;
  debounceMs: number;
  fireAfterRefresh?: (snapshot: import("../state/types").PersistedSnapshot, reason: RefreshReason) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_DEBOUNCE_MS = 750;

export class PollingController {
  private readonly opts: Required<Omit<PollingControllerOptions, "fireAfterRefresh">> & {
    fireAfterRefresh?: PollingControllerOptions["fireAfterRefresh"];
  };
  private readonly rateLimiter = createRateLimiter();
  private readonly disposables: vscode.Disposable[] = [];
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private inFlight: AbortHandle | null = null;
  private readonly coalesceFn: (...args: Parameters<PollingController["refreshNow"]>) => { cancel(): void };
  private startStopper: { cancel(): void } | null = null;
  private stopped = false;

  constructor(options: PollingControllerOptions) {
    this.opts = {
      client: options.client,
      store: options.store,
      settings: options.settings,
      logger: options.logger,
      getApiKey: options.getApiKey,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
      fireAfterRefresh: options.fireAfterRefresh
    };
    this.coalesceFn = coalesce(this.runRefresh.bind(this), this.opts.debounceMs);
  }

  start(): void {
    this.stopped = false;
    this.startInterval();
    this.disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.refreshNow("focus");
        }
      })
    );
  }

  stop(): void {
    this.stopped = true;
    this.stopInterval();
    this.abortInFlight();
    if (this.startStopper) {
      this.startStopper.cancel();
      this.startStopper = null;
    }
    for (const d of this.disposables.splice(0, this.disposables.length)) {
      d.dispose();
    }
  }

  dispose(): void {
    this.stop();
  }

  refreshNow(reason: RefreshReason, opts?: { forceRefresh?: boolean }): void {
    if (this.stopped) {
      return;
    }
    if (this.rateLimiter.isSuppressed(Date.now())) {
      return;
    }
    if (this.startStopper) {
      this.startStopper.cancel();
    }
    this.startStopper = this.coalesceFn(reason, opts);
  }

  isRateLimited(): boolean {
    return this.rateLimiter.isSuppressed(Date.now());
  }

  private startInterval(): void {
    this.stopInterval();
    this.intervalHandle = setInterval(() => {
      this.refreshNow("timer");
    }, this.opts.pollIntervalMs);
  }

  private stopInterval(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private abortInFlight(): void {
    if (this.inFlight) {
      this.inFlight.abort();
      this.inFlight = null;
    }
  }

  private async runRefresh(reason: RefreshReason, opts?: { forceRefresh?: boolean }): Promise<void> {
    this.startStopper = null;
    if (this.stopped) {
      return;
    }
    this.abortInFlight();
    const abort = createAbortController();
    this.inFlight = abort;
    const signal = abort.signal;
    const forceRefresh = opts?.forceRefresh === true;

    const snapshot = this.opts.store.read();
    const region = snapshot.region;
    const displayMode = snapshot.displayMode;

    try {
      const apiKey = await this.opts.getApiKey();
      if (!apiKey) {
        return;
      }
      const result = await this.opts.client.getUsage({
        apiKey,
        region,
        signal,
        forceRefresh
      });
      if (signal.aborted) {
        return;
      }
      const at = Date.now();
      await this.opts.store.setLastKnownGood(result, at);
      await this.opts.store.clearError();
      this.opts.logger.info("usage.fetched", {
        reason,
        region,
        at,
        modelCount: result.model_remains.length
      });

      const wantsCredits = displayMode === "credits" || displayMode === "both";
      if (wantsCredits) {
        try {
          const creditResult = await this.opts.client.getCreditBalance({
            apiKey,
            region,
            signal,
            forceRefresh
          });
          if (!signal.aborted) {
            await this.opts.store.setCreditsAvailable(true);
            await this.opts.store.setCreditBalance(creditResult);
            this.opts.logger.info("credits.fetched", {
              reason,
              region,
              at: Date.now()
            });
          }
        } catch (creditsErr) {
          if (!signal.aborted) {
            await this.opts.store.setCreditsAvailable(false);
            this.opts.logger.warn("credits.unavailable", {
              reason,
              region,
              kind: isUsageErrorKind(creditsErr) ? creditsErr.kind : "unknown"
            });
          }
        }
      } else {
        await this.opts.store.setCreditsAvailable(false);
      }

      if (this.opts.fireAfterRefresh) {
        this.opts.fireAfterRefresh(this.opts.store.read(), reason);
      }
    } catch (err) {
      if (signal.aborted) {
        return;
      }
      if (isUsageErrorKind(err)) {
        const usageErr: UsageError = err;
        const kind = usageErr.kind;
        if (kind === "rate_limited") {
          this.rateLimiter.suppress(RATE_LIMIT_WINDOW_MS, Date.now());
        }
        await this.opts.store.setError(kind, usageErr.statusCode);
        this.opts.logger.warn("usage.error", {
          reason,
          kind,
          statusCode: usageErr.statusCode,
          httpStatus: usageErr.httpStatus
        });
      } else {
        await this.opts.store.setError("unknown");
        this.opts.logger.error("usage.error.unexpected", {
          reason,
          message: err instanceof Error ? err.message : String(err)
        });
      }
      if (this.opts.fireAfterRefresh) {
        this.opts.fireAfterRefresh(this.opts.store.read(), reason);
      }
    } finally {
      if (this.inFlight === abort) {
        this.inFlight = null;
      }
    }
  }
}
