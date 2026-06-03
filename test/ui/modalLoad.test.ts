import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { Window } from "happy-dom";
import { STRINGS } from "../../src/strings";

const BUNDLE_PATH = resolve(__dirname, "../../dist/webview/modal.js");

const PLACEHOLDER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MiniMax Usage</title>
  </head>
  <body>
    <header class="header">
      <h1 class="header__title" id="title" data-str="STR_MODAL_TITLE_TOKENPLAN"></h1>
    </header>
    <main class="content">
      <section id="loading-state" class="state state--loading" hidden>
        <div class="state__body" data-str="STR_MODAL_LOADING_BODY"></div>
      </section>
      <section id="data" class="blocks"></section>
      <section id="credits-block" class="blocks" hidden></section>
      <section id="error" class="error-container" hidden></section>
    </main>
    <footer class="footer">
      <span class="footer__timestamp" id="last-updated" data-str="STR_FOOTER_LAST_UPDATED_NEVER"></span>
      <button class="footer__link" id="open-settings-link" data-str="STR_FOOTER_OPEN_SETTINGS"></button>
    </footer>
    <script src="modal.js"></script>
  </body>
</html>`;

interface Capture {
  messages: Array<Record<string, unknown>>;
  postMessage: (msg: Record<string, unknown>) => void;
}

function makeCapture(): Capture {
  const messages: Array<Record<string, unknown>> = [];
  return {
    messages,
    postMessage: (msg) => {
      messages.push(msg);
    }
  };
}

interface BundleRunOpts {
  html: string;
  throwOnQuerySelectorAll?: boolean;
  throwOnPostMessage?: boolean;
}

interface BundleRunResult {
  h1Text: string;
  messages: Array<Record<string, unknown>>;
  error: Error | undefined;
}

function runBundleInDom(opts: BundleRunOpts): BundleRunResult {
  const capture = makeCapture();
  const window = new Window({ url: "https://example.invalid/" });
  const document = window.document;
  document.write(opts.html);
  document.close();

  if (opts.throwOnQuerySelectorAll) {
    const original = document.querySelectorAll.bind(document);
    document.querySelectorAll = (() => {
      throw new Error("simulated DOM failure");
    }) as typeof document.querySelectorAll;
    void original;
  }

  const postMessage = opts.throwOnPostMessage
    ? () => {
        throw new Error("simulated postMessage failure");
      }
    : capture.postMessage;

  const ctxObj: Record<string, unknown> = {
    document,
    window,
    acquireVsCodeApi: () => ({
      postMessage,
      getState: () => null,
      setState: () => undefined
    }),
    console
  };
  vm.createContext(ctxObj);
  const js = readFileSync(BUNDLE_PATH, "utf8");
  let err: Error | undefined;
  try {
    vm.runInContext(js, ctxObj);
  } catch (e) {
    err = e instanceof Error ? e : new Error(String(e));
  }
  const h1 = document.getElementById("title");
  return {
    h1Text: h1 ? h1.textContent : "",
    messages: capture.messages,
    error: err
  };
}

function captureDomAfterBundle(): {
  document: Document;
  window: unknown;
  capture: Capture;
} {
  const happyWindow = new Window({ url: "https://example.invalid/" });
  const document = happyWindow.document as unknown as Document;
  const window = happyWindow;
  document.write(PLACEHOLDER_HTML);
  document.close();
  const capture = makeCapture();
  const ctxObj: Record<string, unknown> = {
    document,
    window,
    acquireVsCodeApi: () => ({
      postMessage: capture.postMessage,
      getState: () => null,
      setState: () => undefined
    }),
    console
  };
  vm.createContext(ctxObj);
  vm.runInContext(readFileSync(BUNDLE_PATH, "utf8"), ctxObj);
  return { document, window, capture };
}

describe("webview bundle (modal-load data path, D-6 regression)", () => {
  beforeAll(() => {
    if (!existsSync(BUNDLE_PATH)) {
      throw new Error(
        `expected bundle at ${BUNDLE_PATH}; run \`npm run build\` first`
      );
    }
  });

  it("contains STR_MODAL_TITLE_TOKENPLAN in the bundle (proves STRINGS is not tree-shaken)", () => {
    const js = readFileSync(BUNDLE_PATH, "utf8");
    expect(js).toContain("STR_MODAL_TITLE_TOKENPLAN");
    expect(js).toContain(`"${STRINGS.STR_MODAL_TITLE_TOKENPLAN}"`);
  });

  it("calls applyStaticStrings before the ready postMessage (function order)", () => {
    const js = readFileSync(BUNDLE_PATH, "utf8");
    const applyIdx = js.indexOf("applyStaticStrings()");
    const readyIdx = js.indexOf('postMessage({ kind: "ready" })');
    expect(applyIdx).toBeGreaterThan(-1);
    expect(readyIdx).toBeGreaterThan(-1);
    expect(applyIdx).toBeLessThan(readyIdx);
  });

  it("renders the modal title into the h1 and posts a ready message on first load", () => {
    const result = runBundleInDom({ html: PLACEHOLDER_HTML });
    expect(result.error).toBeUndefined();
    expect(result.h1Text).toBe(STRINGS.STR_MODAL_TITLE_TOKENPLAN);
    expect(result.messages).toEqual([{ kind: "ready" }]);
  });

  it("populates the static footer strings from STRINGS (last-updated, open-settings-link)", () => {
    const { document, capture } = captureDomAfterBundle();
    expect(
      document.getElementById("last-updated")?.textContent
    ).toBe(STRINGS.STR_FOOTER_LAST_UPDATED_NEVER);
    expect(
      document.getElementById("open-settings-link")?.textContent
    ).toBe(STRINGS.STR_FOOTER_OPEN_SETTINGS);
    expect(capture.messages).toEqual([{ kind: "ready" }]);
  });

  it("falls back to a hardcoded title when the data-str lookup throws (D-6 defensive fix)", () => {
    const result = runBundleInDom({
      html: PLACEHOLDER_HTML,
      throwOnQuerySelectorAll: true
    });
    expect(result.error).toBeUndefined();
    expect(result.h1Text).toBe("MiniMax Usage");
    expect(result.messages).toEqual([]);
  });

  it("falls back to a hardcoded title when the ready postMessage throws (D-6 defensive fix)", () => {
    const result = runBundleInDom({
      html: PLACEHOLDER_HTML,
      throwOnPostMessage: true
    });
    expect(result.error).toBeUndefined();
    expect(result.h1Text).toBe(STRINGS.STR_MODAL_TITLE_TOKENPLAN);
    expect(result.messages).toEqual([]);
  });
});
