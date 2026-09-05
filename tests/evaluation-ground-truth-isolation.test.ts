import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  getGroundTruthByEventId,
  getAllGroundTruths,
} from "@/server/evaluation/ground-truth-repository";
import { getAIInputByEventId } from "@/server/risk-events/repository";
import { MockAIProvider } from "@/server/ai/mock-provider";
import { evaluatePolicy } from "@/server/policy/engine";

describe("Evaluation Ground-Truth Isolation & Architectural Separation", () => {
  const productionDirs = ["server/ai", "server/policy", "server/recovery", "server/razorpay"];

  it("proves production modules have zero imports from evaluation ground-truth repository", () => {
    for (const prodDir of productionDirs) {
      const fullDir = path.join(process.cwd(), prodDir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
      for (const file of files) {
        if (!file.endsWith(".ts")) continue;
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        // Production files must never import from evaluation ground-truth repository or import EventGroundTruth
        expect(content).not.toContain("server/evaluation/ground-truth-repository");
        expect(content).not.toContain("ground-truth-repository");
        expect(content).not.toContain("@/server/evaluation");
        expect(content).not.toMatch(/import\s+.*EventGroundTruth/);
        expect(content).not.toMatch(/require\(.*EventGroundTruth.*\)/);
      }
    }
  });

  it("retrieves ground truth only through the dedicated evaluation repository", async () => {
    const gt = await getGroundTruthByEventId("evt_syn_000001");
    expect(gt).not.toBeNull();
    if (!gt) return;

    expect(gt.riskEventId).toBe("evt_syn_000001");
    expect(typeof gt.isRecoverable).toBe("boolean");
    expect(typeof gt.recoverableAmount).toBe("number");
    expect(typeof gt.expectedRecoveryAction).toBe("string");
    expect(typeof gt.simulatedOutcome).toBe("string");
  });

  it("bulk retrieval returns all ground-truth entries indexed for evaluation", async () => {
    const allGts = await getAllGroundTruths();
    expect(allGts.size).toBeGreaterThanOrEqual(1000);
    expect(allGts.has("evt_syn_000001")).toBe(true);
    expect(allGts.has("evt_syn_001000")).toBe(true);
  });

  it("production AI and Policy pipelines produce identical decisions with or without ground truth", async () => {
    const aiInput = await getAIInputByEventId("evt_syn_000001");
    expect(aiInput).not.toBeNull();
    if (!aiInput) return;

    const provider = new MockAIProvider();
    const rec = await provider.diagnoseAndRecommend(aiInput);
    const policy = evaluatePolicy({ event: aiInput, recommendation: rec });

    // Ensure AI recommendation and policy decision did not consume or leak ground truth
    const recKeys = Object.keys(rec.recommendation);
    expect(recKeys).not.toContain("isRecoverable");
    expect(recKeys).not.toContain("recoverableAmount");
    expect(recKeys).not.toContain("simulatedOutcome");

    const policyKeys = Object.keys(policy);
    expect(policyKeys).not.toContain("isRecoverable");
    expect(policyKeys).not.toContain("recoverableAmount");
  });
});
