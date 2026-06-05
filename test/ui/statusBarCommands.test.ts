import { describe, it, expect } from "vitest";

/**
 * D-11 / D-12 regression guard.
 *
 * In v0.1.0 D-10 the `minimaxUsage.showUsage` command was removed
 * from `package.json#contributes.commands`, but
 * `src/ui/statusBar.ts#DEFAULT_COMMAND` still referenced it. The
 * status bar's per-state `presentation.command` falls through to
 * `DEFAULT_COMMAND` for 7 of 9 states (loading, success, empty,
 * quota_exhausted, error:rate_limited, error:transient,
 * error:unavailable, credits-unavailable), so the bug broke almost
 * every status bar click. D-11 then changed `DEFAULT_COMMAND` to
 * the built-in `workbench.view.minimaxUsage` — but `minimaxUsage`
 * is the *container* id, not a *view* id, so the built-in
 * `workbench.view.<viewId>` command was not actually registered
 * and the click still threw "command not found". D-12 fixes the
 * chain end-to-end: the status bar fires
 * `minimaxUsage.openUsage`, a wrapper registered in
 * `src/extension.ts` that calls the built-in
 * `workbench.view.minimaxUsage.usage` (the view id).
 *
 * This test reads the status bar source file and asserts that:
 *
 *   1. `DEFAULT_COMMAND` is the registered `minimaxUsage.openUsage`
 *      wrapper (not the built-in directly — the orchestrator
 *      controls the click flow through this wrapper).
 *   2. The same wrapper id is also registered with
 *      `vscode.commands.registerCommand` in `src/extension.ts`
 *      and pushed to `context.subscriptions` — both halves of
 *      the wiring must be in place, otherwise the click still
 *      throws.
 *   3. The removed `minimaxUsage.showUsage` is not used as a
 *      command-id string literal anywhere in the file (the
 *      comment block may reference it in prose for history).
 *   4. The status bar does not declare a dead `onClick` or
 *      `openModal` option (the click is handled by VSCode via
 *      `item.command`, not a callback).
 *
 * The assertions use simple `RegExp` matches on the source text —
 * this is a structural test, not a behaviour test, and the cost of
 * running it is negligible. If a future change breaks either
 * half of the wiring, this test fails loudly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STATUS_BAR_PATH = resolve(
  __dirname,
  "../../src/ui/statusBar.ts"
);
const EXTENSION_PATH = resolve(
  __dirname,
  "../../src/extension.ts"
);

const statusBarSource = readFileSync(STATUS_BAR_PATH, "utf8");
const extensionSource = readFileSync(EXTENSION_PATH, "utf8");

describe("src/ui/statusBar.ts (D-11 / D-12 regression guard)", () => {
  it("DEFAULT_COMMAND is the registered minimaxUsage.openUsage wrapper", () => {
    const match = statusBarSource.match(
      /const\s+DEFAULT_COMMAND\s*=\s*["']([^"']+)["']/
    );
    expect(match, "DEFAULT_COMMAND declaration not found").toBeTruthy();
    expect(match?.[1]).toBe("minimaxUsage.openUsage");
  });

  it("registers the DEFAULT_COMMAND id via vscode.commands.registerCommand in src/extension.ts", () => {
    // Pull the id out of the status bar — both halves of the
    // wiring must use the same string, otherwise the click
    // still throws. (The D-11 fix broke this in a subtler way:
    // the status bar fired a built-in command that wasn't
    // registered as a built-in, so VSCode couldn't find it.)
    const statusBarMatch = statusBarSource.match(
      /const\s+DEFAULT_COMMAND\s*=\s*["']([^"']+)["']/
    );
    expect(
      statusBarMatch,
      "DEFAULT_COMMAND declaration not found in statusBar.ts"
    ).toBeTruthy();
    const commandId = statusBarMatch?.[1];
    expect(
      commandId,
      "DEFAULT_COMMAND must be a non-empty command id"
    ).toBeTruthy();

    // The wrapper must be registered with registerCommand in
    // extension.ts. Match the exact string passed to
    // registerCommand, not just a substring, so a future
    // `minimaxUsage.openUsageX` does not satisfy this check.
    // We look for `const <name> = ... registerCommand("id",`
    // — the `const` precedes the registerCommand call in the
    // current source layout. (The earlier regex tried to match
    // `const` after `registerCommand`, which is the wrong order.)
    const varNameMatch = extensionSource.match(
      new RegExp(
        `const\\s+(\\w+)\\s*=\\s*vscode\\.commands\\.registerCommand\\(\\s*["']${commandId}["']`
      )
    );
    expect(
      varNameMatch,
      `expected a ` +
        `const <name> = vscode.commands.registerCommand("${commandId}", ...)` +
        ` line in src/extension.ts`
    ).toBeTruthy();
    const varName = varNameMatch?.[1];

    // And the disposable must be pushed to context.subscriptions.
    // Both halves of the wiring have to be in place.
    const pushPattern = new RegExp(
      `context\\.subscriptions\\.push\\(${varName}\\)`
    );
    expect(
      extensionSource.match(pushPattern),
      `expected context.subscriptions.push(${varName}) in src/extension.ts for the "${commandId}" wrapper`
    ).toBeTruthy();
  });

  it("does not use the removed minimaxUsage.showUsage as a command-id string literal", () => {
    // Check for the string-literal form `"minimaxUsage.showUsage"`
    // (or single-quoted). A comment may reference the old
    // command name in prose (the D-12 history block does), but
    // the status bar must never treat it as an actual command
    // id — that's the regression.
    expect(statusBarSource).not.toMatch(/["']minimaxUsage\.showUsage["']/);
  });

  it("does not declare a dead onClick or openModal on StatusBarItemOptions", () => {
    // The StatusBarController does not use these — the click is
    // handled by VSCode via `item.command`. Their presence would
    // indicate dead wiring.
    expect(statusBarSource).not.toMatch(/onClick\s*:\s*\(\)\s*=>/);
    expect(statusBarSource).not.toMatch(/openModal\s*:\s*\(\)\s*=>/);
  });
});
