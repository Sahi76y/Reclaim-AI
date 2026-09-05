import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/recovery/policy-evaluate/route";
import { diagnoseAndRecommendEvent } from "@/server/ai";
import { getPolicyDecisionByEventId } from "@/server/risk-events/repository";
import { getAuditLogsByEventId } from "@/server/audit";

describe("HTTP POST /api/recovery/policy-evaluate Endpoint", () => {
  it("evaluates policy for an existing event with recommendation and persists decision", async () => {
    // 1. Ensure recommendation exists for evt_syn_000001
    await diagnoseAndRecommendEvent("evt_syn_000001", { provider: "mock" });

    // 2. Call policy evaluation endpoint
    const request = new Request("http://localhost:3000/api/recovery/policy-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "evt_syn_000001",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.eventId).toBe("evt_syn_000001");
    expect(json.data.decision).toBeDefined();
    expect(json.data.approvedAction).toBeDefined();
    expect(json.data.ruleResults.length).toBeGreaterThan(0);

    // 3. Verify decision persisted in repository
    const persisted = await getPolicyDecisionByEventId("evt_syn_000001");
    expect(persisted).not.toBeNull();
    expect(persisted?.riskEventId).toBe("evt_syn_000001");
    expect(persisted?.decision).toBe(json.data.decision);

    // 4. Verify audit trail was recorded
    const auditLogs = await getAuditLogsByEventId("evt_syn_000001");
    expect(auditLogs.length).toBeGreaterThan(0);
    const policyAudit = auditLogs.find((l) => l.action === "POLICY_EVALUATION");
    expect(policyAudit).toBeDefined();
    expect(policyAudit?.actor).toBe("POLICY_ENGINE");
  });

  it("returns 404 when risk event does not exist", async () => {
    const request = new Request("http://localhost:3000/api/recovery/policy-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "evt_missing_policy_test_99999",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.code).toBe("EVENT_NOT_FOUND");
  });

  it("returns 404 when recommendation does not exist for the event", async () => {
    // evt_syn_000042 exists in dataset but has no recommendation generated yet
    const request = new Request("http://localhost:3000/api/recovery/policy-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "evt_syn_000042",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.code).toBe("RECOMMENDATION_NOT_FOUND");
    expect(json.error).toContain("An AI diagnosis must be generated first");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/recovery/policy-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe("INVALID_JSON");
  });

  it("returns 400 when eventId is missing from payload", async () => {
    const request = new Request("http://localhost:3000/api/recovery/policy-evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("ensures idempotency / duplicate protection on repeated calls", async () => {
    await diagnoseAndRecommendEvent("evt_syn_000002", { provider: "mock" });

    const makeRequest = () =>
      new Request("http://localhost:3000/api/recovery/policy-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: "evt_syn_000002" }),
      });

    // First call
    const res1 = await POST(makeRequest());
    expect(res1.status).toBe(200);

    // Second call with identical payload
    const res2 = await POST(makeRequest());
    expect(res2.status).toBe(200);

    const json1 = await res1.json();
    const json2 = await res2.json();

    expect(json1.data.decision).toBe(json2.data.decision);
    expect(json1.data.approvedAction).toBe(json2.data.approvedAction);
  });
});
