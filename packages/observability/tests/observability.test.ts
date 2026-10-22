import { describe, it, expect } from "vitest";
import { generateCorrelationId, serializeError } from "../src/index.js";

describe("Observability - Correlation IDs", () => {
  it("generates unique correlation IDs with expected prefix", () => {
    const id1 = generateCorrelationId("req");
    const id2 = generateCorrelationId("req");
    expect(id1).toMatch(/^req_\d+_[a-f0-9]{16}$/);
    expect(id2).toMatch(/^req_\d+_[a-f0-9]{16}$/);
    expect(id1).not.toBe(id2);
  });
});

describe("Observability - Error Serialization", () => {
  it("serializes standard Error cleanly without leaking internal stack unless specified", () => {
    const error = new Error("Test failure");
    const serialized = serializeError(error, false);
    expect(serialized.name).toBe("Error");
    expect(serialized.message).toBe("Test failure");
    expect(serialized.stack).toBeUndefined();
  });

  it("captures custom code and details properties", () => {
    class CustomError extends Error {
      code = "RESOURCE_LOCKED";
      details = { resourceId: "res_123" };
    }
    const err = new CustomError("Locked");
    const serialized = serializeError(err);
    expect(serialized.code).toBe("RESOURCE_LOCKED");
    expect(serialized.details).toEqual({ resourceId: "res_123" });
  });
});
