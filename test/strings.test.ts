import { describe, it, expect } from "vitest";
import { STRINGS } from "../src/strings";

describe("src/strings.ts sanity (canonical source is strings-v0.1.0.md)", () => {
  it("exports a STR_FIRST_RUN_NOTIFICATION_TITLE constant matching the doc", () => {
    expect(STRINGS.STR_FIRST_RUN_NOTIFICATION_TITLE).toBe("Set your MiniMax API key");
  });

  it("exports a STR_STATUSBAR_SUCCESS template with placeholders", () => {
    expect(STRINGS.STR_STATUSBAR_SUCCESS).toBe("5h: {5hPercent}% · 7d: {7dPercent}%");
  });

  it("exports a STR_MODAL_TITLE_CREDITS constant for the credits title", () => {
    expect(STRINGS.STR_MODAL_TITLE_CREDITS).toBe("Credits");
  });

  it("exports a STR_ERROR_INVALIDKEY_BODY with two paragraphs separated by \\n\\n", () => {
    expect(STRINGS.STR_ERROR_INVALIDKEY_BODY).toContain("Subscription Key");
    expect(STRINGS.STR_ERROR_INVALIDKEY_BODY).toContain("\n\n");
  });

  it("exports a STR_FOOTER_LAST_UPDATED_NEVER string", () => {
    expect(STRINGS.STR_FOOTER_LAST_UPDATED_NEVER).toBe("Last updated never");
  });

  it("does not contain banned words", () => {
    const all = Object.values(STRINGS).join(" ");
    const banned = [
      "amazing",
      "incredible",
      "fantastic",
      "awesome",
      "click here",
      "learn more",
      "just",
      "simply",
      "easy",
      "easily",
      "oops",
      "uh-oh",
      "heads up",
      "sorry"
    ];
    for (const word of banned) {
      const re = new RegExp(`\\b${word}\\b`, "i");
      expect(re.test(all), `banned word "${word}" found in strings`).toBe(false);
    }
  });
});
