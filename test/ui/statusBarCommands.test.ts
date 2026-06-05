import { describe, it, expect } from "vitest";

/**
 * D-11 regression guard.
 *
 * In v0.1.0 D-10 the `minimaxUsage.showUsage` command was removed
 * from `package.json#contributes.commands`, but
 * `src/ui/statusBar.ts#DEFAULT_COMMAND` still referenced it. The
 * status bar's per-state `presentation.command` falls through to
 * `DEFAULT_COMMAND` for 7 of 9 states (loading, success, empty,
 * quota_exhausted, error:rate_limited, error:transient,
 * error:unavailable, credits-unavailable), so the bug broke almost
 * every status bar click. This test reads the status bar source
 * file and asserts that:
 *
 *   1. `DEFAULT_COMMAND` is the built-in `workbench.view.minimaxUsage`
 *      command (so it doesn't need a registered wrapper).
 *   2. The removed `minimaxUsage.showUsage` is not referenced
 *      anywhere in the file.
 *
 * The assertions use simple `RegExp` matches on the source text —
 * this is a structural test, not a behaviour test, and the cost of
 * running it is negligible. If a future change reintroduces the
 * dead command, this test fails loudly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STATUS_BAR_PATH = resolve(
  __dirname,
  "../../src/ui/statusBar.ts"
);

const source = readFileSync(STATUS_BAR_PATH, "utf8");

describe("src/ui/statusBar.ts (D-11 regression guard)", () => {
  it("DEFAULT_COMMAND is the built-in workbench.view.minimaxUsage command", () => {
    const match = source.match(
      /const\s+DEFAULT_COMMAND\s*=\s*["']([^"']+)["']/
    );
    expect(match, "DEFAULT_COMMAND declaration not found").toBeTruthy();
    expect(match?.[1]).toBe("workbench.view.minimaxUsage");
  });

  it("does not reference the removed minimaxUsage.showUsage command", () => {
    expect(source).not.toMatch(/minimaxUsage\.showUsage/);
  });

  it("does not declare a dead onClick or openModal on StatusBarItemOptions", () => {
    // The StatusBarController does not use these — the click is
    // handled by VSCode via `item.command`. Their presence would
    // indicate dead wiring.
    expect(source).not.toMatch(/onClick\s*:\s*\(\)\s*=>/);
    expect(source).not.toMatch(/openModal\s*:\s*\(\)\s*=>/);
  });
});
