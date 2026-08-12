import { describe, expect, it } from "vitest";
import { createRunController } from "../../src/modules/runs/run.controller.js";

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
describe("run artifact controller", () => {
  it("returns an artifact only for a completed run", async () => {
    const controller = createRunController({
      store: { load: async () => ({ runId: "r1", status: "success", artifact: { executiveSummary: "done" } }) },
    });
    const res = response();
    await controller.artifact({ params: { id: "r1" } }, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.artifact.executiveSummary).toBe("done");
  });
  it("returns 409 while the artifact is still being produced", async () => {
    const controller = createRunController({ store: { load: async () => ({ runId: "r1", status: "running" }) } });
    const res = response();
    await controller.artifact({ params: { id: "r1" } }, res, () => {});
    expect(res.statusCode).toBe(409);
    expect(res.body.status).toBe("running");
  });
  it("returns aggregate and per-call model usage", async () => {
    const controller = createRunController({
      store: {
        load: async () => ({ runId: "r1", usage: { totalTokens: 42 } }),
        listModelCalls: async () => [{ callType: "phase_execution", totalTokens: 42 }],
      },
    });
    const res = response();
    await controller.usage({ params: { id: "r1" } }, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.usage.totalTokens).toBe(42);
    expect(res.body.calls).toHaveLength(1);
  });
});
