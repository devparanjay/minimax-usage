import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("vscode", () => {
  const Uri = {
    file: (path: string) => ({
      fsPath: path,
      path,
      toString() {
        return path;
      }
    })
  };
  return {
    Uri,
    window: {
      registerWebviewViewProvider: () => ({ dispose: () => undefined })
    },
    commands: {
      executeCommand: vi.fn(() => Promise.resolve())
    }
  };
});

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SidebarUsageViewProvider,
  SIDEBAR_VIEW_ID,
  SIDEBAR_CONTAINER_ID
} from "../../src/ui/webview/sidebarUsageView";
import type { StateStore } from "../../src/state/store";
import type { PollingController } from "../../src/polling/controller";
import type { Logger, LogContext } from "../../src/util/logger";
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
  sidebar: SidebarUsageViewProvider;
  logs: LogLine[];
}

const PLACEHOLDER_HTML = "<!doctype html><html><body>placeholder</body></html>";
const FALLBACK_HTML =
  "<!doctype html><html><body>MiniMax Usage sidebar template not found.</body></html>";

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
  const dir = mkdtempSync(join(tmpdir(), "minimax-usage-sidebar-"));
  const distDir = join(dir, "dist", "webview");
  mkdirSync(distDir, { recursive: true });
  const htmlPath = join(distDir, "sidebar.html");
  if (opts.withHtml) {
    writeFileSync(htmlPath, PLACEHOLDER_HTML, "utf8");
  }

  const { logger, logs } = makeCapturingLogger();
  const context = makeStubContext(dir);
  const sidebar = new SidebarUsageViewProvider({
    context,
    store: makeStore(),
    controller: makeStubController(),
    logger,
    getApiKey: async () => undefined
  });

  return { dir, htmlPath, sidebar, logs };
}

function callReadBundledHtml(sidebar: SidebarUsageViewProvider): string {
  return (sidebar as unknown as { readBundledHtml: () => string }).readBundledHtml();
}

describe("SidebarUsageViewProvider.readBundledHtml", () => {
  let fx: FixtureContext | undefined;

  beforeEach(() => {
    fx = undefined;
  });

  afterEach(() => {
    if (fx) {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("returns the bundled HTML when dist/webview/sidebar.html exists", () => {
    const f = setupFixture({ withHtml: true });
    fx = f;
    const html = callReadBundledHtml(f.sidebar);
    expect(html).toBe(PLACEHOLDER_HTML);
    const errorLogs = f.logs.filter((l) => l.level === "error");
    expect(errorLogs).toHaveLength(0);
  });

  it("returns the fallback HTML and logs error when the bundle is missing", () => {
    const f = setupFixture({ withHtml: false });
    fx = f;
    const html = callReadBundledHtml(f.sidebar);
    expect(html).toBe(FALLBACK_HTML);
    const errorLogs = f.logs.filter(
      (l) => l.level === "error" && l.message === "sidebar.view.template.missing"
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
    const altPath = join(f.dir, "src", "ui", "webview", "template", "sidebar.html");
    mkdirSync(join(f.dir, "src", "ui", "webview", "template"), { recursive: true });
    writeFileSync(
      altPath,
      "<!doctype html><html><body>source-tree-html</body></html>",
      "utf8"
    );
    const html = callReadBundledHtml(f.sidebar);
    expect(html).toBe(FALLBACK_HTML);
  });

  it("re-reads the bundle on each call (no internal caching)", () => {
    const f = setupFixture({ withHtml: true });
    fx = f;
    const first = callReadBundledHtml(f.sidebar);
    writeFileSync(f.htmlPath, "<!doctype html><html><body>updated</body></html>", "utf8");
    const second = callReadBundledHtml(f.sidebar);
    expect(first).toBe(PLACEHOLDER_HTML);
    expect(second).toBe("<!doctype html><html><body>updated</body></html>");
  });
});

describe("SidebarUsageViewProvider identifiers", () => {
  it("uses the activity-bar view container id and the usage view id", () => {
    expect(SIDEBAR_CONTAINER_ID).toBe("minimaxUsage");
    expect(SIDEBAR_VIEW_ID).toBe("minimaxUsage.usage");
  });
});
