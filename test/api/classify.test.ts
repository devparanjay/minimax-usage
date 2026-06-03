import { describe, it, expect } from "vitest";
import { classifyHttpError, isRetryable, isFatal } from "../../src/api/classify";

describe("classifyHttpError", () => {
  it("classifies network errors as transient", () => {
    expect(classifyHttpError({ httpStatus: 0, source: "network" })).toBe("transient");
    expect(classifyHttpError({ httpStatus: 0, networkError: true })).toBe("transient");
  });

  it("classifies HTTP 401 as invalid_key when no base_resp", () => {
    expect(classifyHttpError({ httpStatus: 401 })).toBe("invalid_key");
  });

  it("classifies HTTP 403 as invalid_key when no base_resp", () => {
    expect(classifyHttpError({ httpStatus: 403 })).toBe("invalid_key");
  });

  it("classifies HTTP 429 as rate_limited when no base_resp", () => {
    expect(classifyHttpError({ httpStatus: 429 })).toBe("rate_limited");
  });

  it("classifies HTTP 5xx as transient", () => {
    expect(classifyHttpError({ httpStatus: 500 })).toBe("transient");
    expect(classifyHttpError({ httpStatus: 502 })).toBe("transient");
    expect(classifyHttpError({ httpStatus: 503 })).toBe("transient");
    expect(classifyHttpError({ httpStatus: 599 })).toBe("transient");
  });

  it("classifies unknown HTTP status as unknown", () => {
    expect(classifyHttpError({ httpStatus: 404 })).toBe("unknown");
    expect(classifyHttpError({ httpStatus: 418 })).toBe("unknown");
  });

  it("prefers base_resp status_code when present", () => {
    expect(
      classifyHttpError({
        httpStatus: 401,
        baseResp: { status_code: 1002, status_msg: "rate limit" }
      })
    ).toBe("rate_limited");
  });

  it("classifies base_resp 1004 as invalid_key", () => {
    expect(
      classifyHttpError({
        httpStatus: 401,
        baseResp: { status_code: 1004, status_msg: "not authorized" }
      })
    ).toBe("invalid_key");
  });

  it("classifies base_resp 2049 as invalid_key", () => {
    expect(
      classifyHttpError({
        httpStatus: 401,
        baseResp: { status_code: 2049, status_msg: "invalid API Key" }
      })
    ).toBe("invalid_key");
  });

  it("classifies base_resp 2056 as quota_exhausted", () => {
    expect(
      classifyHttpError({
        httpStatus: 200,
        baseResp: { status_code: 2056, status_msg: "usage limit exceeded" }
      })
    ).toBe("quota_exhausted");
  });

  it("classifies base_resp 1002 as rate_limited", () => {
    expect(
      classifyHttpError({
        httpStatus: 401,
        baseResp: { status_code: 1002, status_msg: "rate limit" }
      })
    ).toBe("rate_limited");
  });

  it("classifies base_resp 2045 as rate_limited", () => {
    expect(
      classifyHttpError({
        httpStatus: 429,
        baseResp: { status_code: 2045, status_msg: "rate growth" }
      })
    ).toBe("rate_limited");
  });

  it("classifies transient base_resp codes as transient", () => {
    for (const code of [1000, 1001, 1024, 1033, 1039]) {
      expect(
        classifyHttpError({
          httpStatus: 500,
          baseResp: { status_code: code, status_msg: "transient" }
        })
      ).toBe("transient");
    }
  });

  it("classifies base_resp 2013 as invalid_params", () => {
    expect(
      classifyHttpError({
        httpStatus: 400,
        baseResp: { status_code: 2013, status_msg: "invalid params" }
      })
    ).toBe("invalid_params");
  });

  it("classifies unrecognised base_resp status_code as unknown", () => {
    expect(
      classifyHttpError({
        httpStatus: 200,
        baseResp: { status_code: 99999, status_msg: "?" }
      })
    ).toBe("unknown");
  });
});

describe("isRetryable", () => {
  it("returns true for transient", () => {
    expect(isRetryable("transient")).toBe(true);
  });

  it("returns true for unknown", () => {
    expect(isRetryable("unknown")).toBe(true);
  });

  it("returns false for invalid_key", () => {
    expect(isRetryable("invalid_key")).toBe(false);
  });

  it("returns false for rate_limited", () => {
    expect(isRetryable("rate_limited")).toBe(false);
  });

  it("returns false for quota_exhausted", () => {
    expect(isRetryable("quota_exhausted")).toBe(false);
  });

  it("returns false for invalid_params", () => {
    expect(isRetryable("invalid_params")).toBe(false);
  });
});

describe("isFatal", () => {
  it("returns true for invalid_key", () => {
    expect(isFatal("invalid_key")).toBe(true);
  });

  it("returns true for rate_limited", () => {
    expect(isFatal("rate_limited")).toBe(true);
  });

  it("returns true for invalid_params", () => {
    expect(isFatal("invalid_params")).toBe(true);
  });

  it("returns false for transient", () => {
    expect(isFatal("transient")).toBe(false);
  });

  it("returns false for quota_exhausted", () => {
    expect(isFatal("quota_exhausted")).toBe(false);
  });

  it("returns false for unknown", () => {
    expect(isFatal("unknown")).toBe(false);
  });
});
