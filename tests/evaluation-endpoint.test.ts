import { describe, it, expect } from "vitest";
import { POST as runPOST, GET as runGET } from "@/app/api/evaluation/run/route";
import { GET as latestGET } from "@/app/api/evaluation/latest/route";

describe("Evaluation API Endpoints", () => {
  it("POST /api/evaluation/run executes evaluation benchmark and returns structured result", async () => {
    const request = new Request("http://localhost:3000/api/evaluation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleSize: 50 }),
    });

    const response = await runPOST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.evaluation).toBeDefined();
    expect(json.evaluation.datasetSize).toBe(50);
    expect(json.evaluation.providerMode.label).toBe("Razorpay Test Mode simulation");
    expect(json.evaluation.revenueSummary.totalRevenueAtRiskINR).toBeGreaterThan(0);
  });

  it("POST /api/evaluation/run handles invalid JSON gracefully", async () => {
    const request = new Request("http://localhost:3000/api/evaluation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed json",
    });

    const response = await runPOST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe("INVALID_JSON");
  });

  it("POST /api/evaluation/run validates input parameters", async () => {
    const request = new Request("http://localhost:3000/api/evaluation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleSize: -5 }),
    });

    const response = await runPOST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/evaluation/run returns the latest evaluation result", async () => {
    const response = await runGET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.evaluation).toBeDefined();
    expect(json.evaluation.revenueSummary).toBeDefined();
  });

  it("GET /api/evaluation/latest returns cached latest benchmark result", async () => {
    const response = await latestGET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.evaluation).toBeDefined();
    expect(json.evaluation.baselineComparison).toBeDefined();
  });
});
