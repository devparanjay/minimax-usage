import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("vscode", () => {
  const ViewColumn = { Active: 1, Beside: 2, One: 3, Two: 4, Three: 5 } as const;
  class Uri {
    static file(path: string): { fsPath: string; path: string; toString(): string } {
      return {
        fsPath: path,
        path,
        toString() {
          return path;
        }
      };
    }
  }
  return {
    Uri,
    ViewColumn,
    window: {
      createWebviewPanel: () => {
        throw new Error("createWebviewPanel should not be called in this test");
      }
    },
    commands: {
      executeCommand: () => Promise.resolve()
    }
  };
});

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UsageModal } from "../../src/ui/webview/usageModal";
import type { StateStore } from "../../src/state/store";
import type { PollingController } from "../../src/polling/controller";
import type { Logger, LogContext } from "../../src/util/logger";
import { noopLogger } from "../../src/util/logger";
import { createStateStore } from "../../src/state/store";
import type * as vscodeTypes from "vscode";

interface FakeMemento {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Promise<void>;
}

function createFakeMemento(): FakeMemento {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    async update(key: string, value: unknown): Promise<void> {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.set(key, value);
      }
    }
  };
}

interface LogLine {
  level: "info" | "warn" | "error";
  message: string;
  context?: LogContext;
}

interface FixtureContext {
  dir: string;
  htmlPath: string;
  modal: UsageModal;
  logs: LogLine[];
}

const PLACEHOLDER_HTML = "<!doctype html><html><body>placeholder</body></html>";
const FALLBACK_HTML =
  "<!doctype html><html><body>MiniMax Usage modal template not found.</body></html>";

function makeStubContext(extensionPath: string): vscodeTypes.ExtensionContext {
  return { extensionPath } as unknown as vscodeTypes.ExtensionContext;
}

function makeStore(): StateStore {
  return createStateStore(createFakeMemento() as unknown as vscodeTypes.Memento);
}

function makeStubController(): PollingController {
  return {} as unknown as PollingController;
}

function makeCapturingLogger(): { logger: Logger; logs: LogLine[] } {
  const logs: LogLine[] = [];
  const logger: Logger = {
    info(message, context) {
      logs.push({ level: "info", message, context });
    },
    warn(message, context) {
      logs.push({ level: "warn", message, context });
    },
    error(message, context) {
      logs.push({ level: "error", message, context });
    },
    setChannel() {
      return undefined;
    },
    dispose() {
      return undefined;
    }
  };
  return { logger, logs };
}

function setupFixture(opts: { withHtml: boolean }): FixtureContext {
  const dir = mkdtempSync(join(tmpdir(), "minimax-usage-modal-"));
  const distDir = join(dir, "dist", "webview");
  mkdirSync(distDir, { recursive: true });
  const htmlPath = join(distDir, "modal.html");
  if (opts.withHtml) {
    writeFileSync(htmlPath, PLACEHOLDER_HTML, "utf8");
  }

  const { logger, logs } = makeCapturingLogger();
  const context = makeStubContext(dir);
  const modal = new UsageModal({
    context,
    store: makeStore(),
    controller: makeStubController(),
    logger,
    getApiKey: async () => undefined
  });

  return { dir, htmlPath, modal, logs };
}

function callReadBundledHtml(modal: UsageModal): string {
  return (modal as unknown as { readBundledHtml: () => string }).readBundledHtml();
}

describe("UsageModal.readBundledHtml", () => {
  let fx: FixtureContext | undefined;

  beforeEach(() => {
    fx = undefined;
  });

  afterEach(() => {
    if (fx) {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("returns the bundled HTML when dist/webview/modal.html exists", () => {
    const f = setupFixture({ withHtml: true });
    fx = f;
    const html = callReadBundledHtml(f.modal);
    expect(html).toBe(PLACEHOLDER_HTML);
    const errorLogs = f.logs.filter((l) => l.level === "error");
    expect(errorLogs).toHaveLength(0);
  });

  it("returns the fallback HTML and logs error when the bundle is missing", () => {
    const f = setupFixture({ withHtml: false });
    fx = f;
    const html = callReadBundledHtml(f.modal);
    expect(html).toBe(FALLBACK_HTML);
    const errorLogs = f.logs.filter(
      (l) => l.level === "error" && l.message === "usage.modal.template.missing"
    );
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]?.context).toEqual(
      expect.objectContaining({ htmlPath: f.htmlPath })
    );
    const serialized = JSON.stringify(errorLogs[0]?.context ?? {});
    expect(serialized).not.toMatch(/sk-cp-/);
  });

  it("does not consult the source-tree template path (only the bundle path)", () => {
    const f = setupFixture({ withHtml: false });
    fx = f;
    const altPath = join(f.dir, "src", "ui", "webview", "template", "modal.html");
    mkdirSync(join(f.dir, "src", "ui", "webview", "template"), { recursive: true });
    writeFileSync(
      altPath,
      "<!doctype html><html><body>source-tree-html</body></html>",
      "utf8"
    );
    const html = callReadBundledHtml(f.modal);
    expect(html).toBe(FALLBACK_HTML);
  });

  it("re-reads the bundle on each call (no internal caching)", () => {
    const f = setupFixture({ withHtml: true });
    fx = f;
    const first = callReadBundledHtml(f.modal);
    writeFileSync(f.htmlPath, "<!doctype html><html><body>updated</body></html>", "utf8");
    const second = callReadBundledHtml(f.modal);
    expect(first).toBe(PLACEHOLDER_HTML);
    expect(second).toBe("<!doctype html><html><body>updated</body></html>");
  });
});

describe("UsageModal.readBundledHtml with noopLogger", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("does not throw when the bundle is missing and a noopLogger is wired", () => {
    dir = mkdtempSync(join(tmpdir(), "minimax-usage-modal-noop-"));
    const context = makeStubContext(dir);
    const modal = new UsageModal({
      context,
      store: makeStore(),
      controller: makeStubController(),
      logger: noopLogger(),
      getApiKey: async () => undefined
    });
    const html = callReadBundledHtml(modal);
    expect(html).toBe(FALLBACK_HTML);
  });
});

describe("UsageModal ctor shape", () => {
  it("stores the context so distDir() resolves under extensionPath", () => {
    const f = setupFixture({ withHtml: true });
    const stored = (
      f.modal as unknown as { opts: { context: vscodeTypes.ExtensionContext } }
    ).opts.context.extensionPath;
    expect(stored).toBe(f.dir);
    rmSync(f.dir, { recursive: true, force: true });
  });
});
