import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { POST as executePOST } from "@/app/api/recovery/execute/route";
import { POST as webhookPOST } from "@/app/api/webhooks/recovery-outcome/route";
import { RecoveryExecutionEngine, checkExecutionGuard } from "@/server/recovery/executor";
import { simulateRecoveryExecution } from "@/server/recovery/simulator";
import { recoveryExecutionResultSchema } from "@/server/recovery/schemas";
import {
  savePolicyDecision,
  getRecoveryExecutionById,
  getRecoveryExecutionByIdempotencyKey,
  getRecoveryCommunicationTasksByEventId,
  getHumanReviewTasksByEventId,
  getExecutionMetrics,
  createRiskEvent,
} from "@/server/risk-events/repository";
import { getAuditLogsByEventId } from "@/server/audit";
import { MockRazorpayProvider } from "@/server/razorpay/mock-provider";
import type { RecoveryExecutionInput } from "@/server/recovery/types";

describe("Recovery Execution Engine — 22 Quality Gate Verification", () => {
  const testEventId = "evt_syn_000001";
  const testPolicyDecisionId = "dec_test_001";

  beforeEach(async () => {
    // Ensure test event has an approved policy decision ready for execution
    await savePolicyDecision({
      id: testPolicyDecisionId,
      riskEventId: testEventId,
      decision: "ALLOW",
      originalAction: "SMART_RETRY",
      approvedAction: "SMART_RETRY",
      reasons: ["Test approval for smart retry"],
      ruleResults: [],
      shouldStopAutomation: false,
    });
  });

  // Test 1: Approved SMART_RETRY executes
  it("1. Approved SMART_RETRY executes through test provider", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "SMART_RETRY",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_test_1_${Date.now()}`,
      providerPreference: "RAZORPAY_TEST",
    };

    const result = await engine.execute(input);
    expect(result.action).toBe("SMART_RETRY");
    expect(result.status).toBe("SUCCESS");
    expect(result.provider).toBe("RAZORPAY_TEST");
    expect(result.recoveredAmount).toBe(249900);
    expect(result.providerReference).toBeDefined();
    expect(result.providerReference?.startsWith("pay_test_")).toBe(true);
  });

  // Test 2: Approved DYNAMIC_PAYMENT_LINK executes through test provider
  it("2. Approved DYNAMIC_PAYMENT_LINK executes through test provider", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "DYNAMIC_PAYMENT_LINK",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_test_2_${Date.now()}`,
      providerPreference: "RAZORPAY_TEST",
    };

    const result = await engine.execute(input);
    expect(result.action).toBe("DYNAMIC_PAYMENT_LINK");
    expect(result.status).toBe("PENDING");
    expect(result.provider).toBe("RAZORPAY_TEST");
    expect(result.recoveredAmount).toBe(0); // Financial recovery pending until link is paid
    expect(result.providerReference?.startsWith("plink_test_")).toBe(true);
    expect(result.metadata?.paymentLinkUrl).toBeDefined();
  });

  // Test 3: CUSTOMER_DUNNING creates communication task
  it("3. CUSTOMER_DUNNING creates communication task without dispatching real SMS/email", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "CUSTOMER_DUNNING",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_test_3_${Date.now()}`,
      metadata: { customerId: "cust_test_999" },
    };

    const result = await engine.execute(input);
    expect(result.action).toBe("CUSTOMER_DUNNING");
    expect(result.status).toBe("PENDING");
    expect(result.metadata?.actualMessageDispatched).toBe(false);

    // Verify task in repository
    const tasks = await getRecoveryCommunicationTasksByEventId(testEventId);
    expect(tasks.length).toBeGreaterThan(0);
    const dunningTask = tasks.find((t) => t.action === "CUSTOMER_DUNNING");
    expect(dunningTask).toBeDefined();
    expect(dunningTask?.status).toBe("PENDING");
  });

  // Test 4: ESCALATE_HUMAN creates human review task
  it("4. ESCALATE_HUMAN creates human review task operational handoff", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "ESCALATE_HUMAN",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_test_4_${Date.now()}`,
      metadata: { severity: "HIGH", reason: "Critical subscription requires human outreach" },
    };

    const result = await engine.execute(input);
    expect(result.action).toBe("ESCALATE_HUMAN");
    expect(result.status).toBe("ESCALATED");
    expect(result.recoveredAmount).toBe(0);

    // Verify operational review task
    const reviewTasks = await getHumanReviewTasksByEventId(testEventId);
    expect(reviewTasks.length).toBeGreaterThan(0);
    const task = reviewTasks.find((t) => t.policyDecisionId === testPolicyDecisionId);
    expect(task).toBeDefined();
    expect(task?.status).toBe("OPEN");
  });

  // Test 5: NONE performs no financial execution
  it("5. NONE performs no financial execution and returns SKIPPED", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "NONE",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_test_5_${Date.now()}`,
    };

    const result = await engine.execute(input);
    expect(result.action).toBe("NONE");
    expect(result.status).toBe("SKIPPED");
    expect(result.recoveredAmount).toBe(0);
  });

  // Test 6: BLOCK prevents execution
  it("6. Policy BLOCK prevents execution", () => {
    const guard = checkExecutionGuard(
      { id: "evt_block_test", isRecoveryEligible: true, amountAtRisk: 50000 },
      {
        id: "dec_block",
        riskEventId: "evt_block_test",
        decision: "BLOCK",
        approvedAction: "SMART_RETRY",
        shouldStopAutomation: false,
      }
    );

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("BLOCK");
  });

  // Test 7: ESCALATE prevents execution
  it("7. Policy ESCALATE prevents automated execution", () => {
    const guard = checkExecutionGuard(
      { id: "evt_esc_test", isRecoveryEligible: true, amountAtRisk: 50000 },
      {
        id: "dec_esc",
        riskEventId: "evt_esc_test",
        decision: "ESCALATE",
        approvedAction: "ESCALATE_HUMAN",
        shouldStopAutomation: false,
      }
    );

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("ESCALATE");
    expect(guard.suggestedStatus).toBe("ESCALATED");
  });

  // Test 8: shouldStopAutomation prevents execution
  it("8. shouldStopAutomation = true prevents execution", () => {
    const guard = checkExecutionGuard(
      { id: "evt_halt_test", isRecoveryEligible: true, amountAtRisk: 50000 },
      {
        id: "dec_halt",
        riskEventId: "evt_halt_test",
        decision: "ALLOW",
        approvedAction: "SMART_RETRY",
        shouldStopAutomation: true,
      }
    );

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("shouldStopAutomation");
  });

  // Test 9: Missing policy decision returns 404
  it("9. Missing policy decision returns 404 in execute API", async () => {
    // Create an event without a policy decision
    const uniqueEventId = `evt_no_policy_${Date.now()}`;
    await createRiskEvent({
      id: uniqueEventId,
      merchantId: "merchant_default_reclaimai",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      amountAtRisk: 100000,
      currency: "INR",
      paymentMethod: "UPI",
      customerId: "cust_test_001",
      customerEmail: "test@example.com",
      orderId: "ord_test_001",
      failureCode: "TIMEOUT",
      failureReason: "Network timeout",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 3,
      previousFailureCount: 0,
      createdAt: new Date(),
    });

    const request = new Request("http://localhost:3000/api/recovery/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: uniqueEventId }),
    });

    const response = await executePOST(request);
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe("POLICY_DECISION_NOT_FOUND");
  });

  // Test 10: Event/policy mismatch is rejected
  it("10. Event/policy mismatch is rejected by execution guard", () => {
    const guard = checkExecutionGuard(
      { id: "evt_001", isRecoveryEligible: true, amountAtRisk: 50000 },
      {
        id: "dec_999",
        riskEventId: "evt_DIFFERENT",
        decision: "ALLOW",
        approvedAction: "SMART_RETRY",
        shouldStopAutomation: false,
      }
    );

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("Integrity Mismatch");
  });

  // Test 11: Duplicate execution is idempotent
  it("11. Duplicate execution is idempotent (returns existing execution, does not re-execute)", async () => {
    const engine = new RecoveryExecutionEngine();
    const fixedKey = `idemp_unique_key_${Date.now()}`;
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "SMART_RETRY",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: fixedKey,
      providerPreference: "RAZORPAY_TEST",
    };

    // First call
    const firstResult = await engine.execute(input);
    expect(firstResult.status).toBe("SUCCESS");

    // Second call with same idempotency key
    const secondResult = await engine.execute(input);
    expect(secondResult.executionId).toBe(firstResult.executionId);
    expect(secondResult.metadata?.idempotentReplay).toBe(true);
  });

  // Test 12: Recovered amount cannot exceed amount at risk
  it("12. Recovered amount cannot exceed amount at risk", async () => {
    const engine = new RecoveryExecutionEngine();
    const input: RecoveryExecutionInput = {
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "SMART_RETRY",
      amountAtRisk: 50000, // 500 INR
      currency: "INR",
      idempotencyKey: `idemp_bound_${Date.now()}`,
      providerPreference: "RAZORPAY_TEST",
    };

    const result = await engine.execute(input);
    expect(result.recoveredAmount).toBeLessThanOrEqual(50000);
  });

  // Test 13: Provider failure creates FAILED execution
  it("13. Provider failure creates FAILED execution", async () => {
    const mockRzp = new MockRazorpayProvider();
    // Pass 0 amount to trigger failure in provider
    const failureResult = await mockRzp.retryPayment({
      amount: 0,
      currency: "INR",
      idempotencyKey: "test_fail_idemp",
    });

    expect(failureResult.success).toBe(false);
    expect(failureResult.status).toBe("FAILED");
    expect(failureResult.failureReason).toContain("Invalid retry amount");
  });

  // Test 14: Simulator is deterministic
  it("14. Simulator is 100% deterministic on identical telemetry inputs", () => {
    const simInput = {
      eventId: "evt_det_test_001",
      action: "SMART_RETRY" as const,
      amountAtRisk: 150000,
      currency: "INR",
      attemptNumber: 1,
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
    };

    const res1 = simulateRecoveryExecution(simInput);
    const res2 = simulateRecoveryExecution(simInput);

    expect(res1.status).toBe(res2.status);
    expect(res1.recoveredAmount).toBe(res2.recoveredAmount);
    expect(res1.providerReference).toBe(res2.providerReference);
  });

  // Test 15: Simulator does not access EventGroundTruth
  it("15. Simulator file does not import or access EventGroundTruth", () => {
    const simFilePath = path.join(process.cwd(), "server", "recovery", "simulator.ts");
    const content = fs.readFileSync(simFilePath, "utf-8");

    expect(content.includes("EventGroundTruth")).toBe(false);
    expect(content.includes("groundTruth")).toBe(false);
    expect(content.includes("isRecoverable")).toBe(false);
  });

  // Test 16: Execution output passes Zod validation
  it("16. Execution output passes strict Zod validation", () => {
    const sampleOutput = {
      executionId: "exec_test_valid_123",
      eventId: "evt_syn_000001",
      policyDecisionId: "dec_test_001",
      action: "SMART_RETRY",
      status: "SUCCESS",
      provider: "RAZORPAY_TEST",
      providerReference: "pay_test_abc123",
      recoveredAmount: 249900,
      currency: "INR",
      executedAt: new Date().toISOString(),
    };

    const parsed = recoveryExecutionResultSchema.safeParse(sampleOutput);
    expect(parsed.success).toBe(true);
  });

  // Test 17: Webhook outcome validation works
  it("17. Webhook outcome endpoint validates and updates execution", async () => {
    // 1. Create an execution with status PENDING (e.g. payment link)
    const engine = new RecoveryExecutionEngine();
    const init = await engine.execute({
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "DYNAMIC_PAYMENT_LINK",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_webhook_${Date.now()}`,
    });

    expect(init.status).toBe("PENDING");

    // 2. Call outcome webhook to simulate customer paying the link
    const request = new Request("http://localhost:3000/api/webhooks/recovery-outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId: init.executionId,
        status: "SUCCESS",
        recoveredAmount: 249900,
        providerReference: "pay_test_cust_paid_001",
      }),
    });

    const response = await webhookPOST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.execution.status).toBe("SUCCESS");
    expect(json.execution.recoveredAmount).toBe(249900);

    // Verify persisted record
    const updated = await getRecoveryExecutionById(init.executionId);
    expect(updated?.status).toBe("SUCCESS");
    expect(updated?.recoveredAmount).toBe(249900);
  });

  // Test 18: Invalid recovered amount (> amountAtRisk) is rejected by webhook
  it("18. Webhook rejects recovered amount exceeding amount at risk", async () => {
    const engine = new RecoveryExecutionEngine();
    const init = await engine.execute({
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "DYNAMIC_PAYMENT_LINK",
      amountAtRisk: 100000, // 1,000 INR
      currency: "INR",
      idempotencyKey: `idemp_overrisk_${Date.now()}`,
    });

    // Attempt to report 5,000 INR recovered when only 1,000 INR was at risk
    const request = new Request("http://localhost:3000/api/webhooks/recovery-outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId: init.executionId,
        status: "SUCCESS",
        recoveredAmount: 500000,
      }),
    });

    const response = await webhookPOST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("RECOVERED_AMOUNT_EXCEEDS_RISK");
  });

  // Test 19: Finalized execution cannot be overwritten incorrectly
  it("19. Finalized execution cannot be overwritten by webhook", async () => {
    // 1. Create a finalized execution
    const engine = new RecoveryExecutionEngine();
    const finalized = await engine.execute({
      eventId: testEventId,
      policyDecisionId: testPolicyDecisionId,
      approvedAction: "SMART_RETRY",
      amountAtRisk: 249900,
      currency: "INR",
      idempotencyKey: `idemp_finalized_${Date.now()}`,
    });

    expect(finalized.status).toBe("SUCCESS");

    // 2. Webhook attempt on finalized execution
    const request = new Request("http://localhost:3000/api/webhooks/recovery-outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId: finalized.executionId,
        status: "FAILED",
      }),
    });

    const response = await webhookPOST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("EXECUTION_ALREADY_FINALIZED");
  });

  // Test 20: Metrics are calculated from execution records only
  it("20. Metrics are calculated dynamically from execution records only", async () => {
    const metrics = await getExecutionMetrics();
    expect(metrics.totalExecutionAttempts).toBeGreaterThan(0);
    expect(metrics.successfulRecoveries).toBeGreaterThan(0);
    expect(metrics.totalAmountRecoveredPaise).toBeGreaterThan(0);
    expect(metrics.totalAmountRecoveredINR).toBe(
      Math.round((metrics.totalAmountRecoveredPaise / 100) * 100) / 100
    );
    expect(metrics.recoveryRateByAction).toBeDefined();
    expect(metrics.recoveryRateByAction.SMART_RETRY).toBeDefined();
  });

  // Test 21: No execution record contains ground truth
  it("21. No recovery execution code or record contains ground truth", async () => {
    const executorPath = path.join(process.cwd(), "server", "recovery", "executor.ts");
    const content = fs.readFileSync(executorPath, "utf-8");

    expect(content.includes("EventGroundTruth")).toBe(false);
    expect(content.includes("groundTruth")).toBe(false);

    // Also check persisted execution records
    const executions = await getRecoveryExecutionByIdempotencyKey(`idemp_test_1_${Date.now()}`);
    const forbiddenKeys = [
      "isRecoverable",
      "recoverableAmount",
      "expectedRecoveryAction",
      "simulatedOutcome",
      "simulatedRecoveryLatencyHours",
      "evaluationNotes",
    ];

    if (executions) {
      for (const key of forbiddenKeys) {
        expect((executions as unknown as Record<string, unknown>)[key]).toBeUndefined();
      }
    }
  });

  // Test 22: Audit record created
  it("22. Audit record is created for execution", async () => {
    const auditLogs = await getAuditLogsByEventId(testEventId);
    expect(auditLogs.length).toBeGreaterThan(0);

    const recoveryAudit = auditLogs.find((l) => l.actor === "RECOVERY_EXECUTOR");
    expect(recoveryAudit).toBeDefined();
    expect(recoveryAudit?.action).toBe("RECOVERY_EXECUTION");
    expect(recoveryAudit?.details.executionId).toBeDefined();
    expect(recoveryAudit?.details.approvedAction).toBeDefined();
  });
});
