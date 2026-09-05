import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/recovery/recommend/route";
import {
  diagnoseAndRecommendEvent,
  RiskEventNotFoundError,
  getRecoveryRecommendationByEventId,
} from "@/server/ai";

describe("Recovery Recommendation API & Orchestrator", () => {
  it("diagnoseAndRecommendEvent succeeds for valid event and persists recommendation", async () => {
    // evt_syn_000001 exists in synthetic generator
    const recommendation = await diagnoseAndRecommendEvent("evt_syn_000001", {
      provider: "mock",
    });

    expect(recommendation).toBeDefined();
    expect(recommendation.eventId).toBe("evt_syn_000001");
    expect(recommendation.diagnosis.summary).toBeTruthy();
    expect(recommendation.recommendation.action).toBeTruthy();
    expect(recommendation.recommendation.confidence).toBeGreaterThanOrEqual(0);
    expect(recommendation.recommendation.confidence).toBeLessThanOrEqual(1);

    // Verify persisted record in repository
    const persisted = await getRecoveryRecommendationByEventId("evt_syn_000001");
    expect(persisted).not.toBeNull();
    expect(persisted?.riskEventId).toBe("evt_syn_000001");
    expect(persisted?.action).toBe(recommendation.recommendation.action);
  });

  it("diagnoseAndRecommendEvent throws RiskEventNotFoundError when event is missing", async () => {
    await expect(
      diagnoseAndRecommendEvent("evt_non_existent_999999", { provider: "mock" })
    ).rejects.toThrow(RiskEventNotFoundError);
  });

  describe("HTTP POST /api/recovery/recommend Handler", () => {
    it("returns 200 OK with recommendation for existing event", async () => {
      const request = new Request("http://localhost:3000/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "evt_syn_000001",
          provider: "mock",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.eventId).toBe("evt_syn_000001");
      expect(json.data.recommendation.action).toBeDefined();
    });

    it("returns 404 NOT FOUND for missing event ID", async () => {
      const request = new Request("http://localhost:3000/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "evt_missing_random_12345",
          provider: "mock",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.code).toBe("EVENT_NOT_FOUND");
      expect(json.error).toContain("evt_missing_random_12345");
    });

    it("returns 400 BAD REQUEST when eventId is omitted", async () => {
      const request = new Request("http://localhost:3000/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "mock",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 BAD REQUEST for invalid JSON body", async () => {
      const request = new Request("http://localhost:3000/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-raw-text",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.code).toBe("INVALID_JSON");
    });

    it("returns 500 when OpenAI provider is selected without API key", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const request = new Request("http://localhost:3000/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "evt_syn_000001",
          provider: "openai",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.code).toBe("OPENAI_KEY_MISSING");

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });
  });
});
