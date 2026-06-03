import * as vscode from "vscode";

export type LogLevel = "info" | "warn" | "error";

const REDACTED = "[redacted]";

const SUBSCRIPTION_KEY_REGEX = /sk-cp-[A-Za-z0-9+/=_-]+/g;

const SENSITIVE_QUERY_NAMES = new Set(["api_key", "apikey", "key", "token"]);

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  setChannel(channel: vscode.OutputChannel): void;
  dispose(): void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redactUrl(value: string): string {
  try {
    const u = new URL(value);
    let mutated = false;
    for (const name of SENSITIVE_QUERY_NAMES) {
      if (u.searchParams.has(name)) {
        u.searchParams.delete(name);
        mutated = true;
      }
    }
    if (mutated) {
      return u.toString();
    }
    return value;
  } catch {
    return value;
  }
}

function redactAuthorizationHeader(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === "authorization") {
      out[k] = REDACTED;
    } else {
      out[k] = headers[k];
    }
  }
  return out;
}

function redactSecretStorageValue(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (k === "minimaxUsage.apiKey") {
      out[k] = REDACTED;
    } else {
      out[k] = obj[k];
    }
  }
  return out;
}

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(SUBSCRIPTION_KEY_REGEX, REDACTED);
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (isPlainObject(value)) {
    const headers = value["headers"];
    let next: Record<string, unknown> = { ...value };
    if (isPlainObject(headers)) {
      next["headers"] = redactAuthorizationHeader(headers);
    }
    next = redactSecretStorageValue(next);
    const url = next["url"];
    if (typeof url === "string") {
      next["url"] = redactUrl(url);
    }
    const result: Record<string, unknown> = {};
    for (const k of Object.keys(next)) {
      result[k] = redact(next[k]);
    }
    return result;
  }
  return value;
}

export function formatError(event: unknown, level: LogLevel, context?: LogContext): string {
  const baseContext: LogContext = context ? { ...redact(context) as LogContext } : {};
  if (level === "error" && isUsageError(event)) {
    baseContext["kind"] = event.kind;
    if (event.statusCode !== undefined) {
      baseContext["status_code"] = event.statusCode;
    }
    return JSON.stringify(baseContext);
  }
  if (event && typeof event === "object") {
    Object.assign(baseContext, redact(event));
  } else if (typeof event === "string") {
    baseContext["message"] = redact(event);
  } else if (event !== undefined) {
    baseContext["value"] = redact(event);
  }
  return JSON.stringify(baseContext);
}

export interface UsageErrorLike {
  name?: string;
  kind?: string;
  statusCode?: number;
}

export function isUsageError(value: unknown): value is UsageErrorLike & { kind: string; statusCode?: number } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as UsageErrorLike;
  return v.name === "UsageError" || typeof v.kind === "string";
}

export function createLogger(initialChannel: vscode.OutputChannel): Logger {
  let channel: vscode.OutputChannel = initialChannel;
  return {
    info(message: string, context?: LogContext): void {
      channel.appendLine(`[info] ${message} ${formatContext(context)}`);
    },
    warn(message: string, context?: LogContext): void {
      channel.appendLine(`[warn] ${message} ${formatContext(context)}`);
    },
    error(message: string, context?: LogContext): void {
      channel.appendLine(`[error] ${message} ${formatContext(context)}`);
    },
    setChannel(c: vscode.OutputChannel): void {
      channel = c;
    },
    dispose(): void {
      channel.dispose();
    }
  };
}

function formatContext(context?: LogContext): string {
  if (!context) {
    return "";
  }
  return formatError(context, "info", context);
}

export function noopLogger(): Logger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    setChannel: () => undefined,
    dispose: () => undefined
  };
}
