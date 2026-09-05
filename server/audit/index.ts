import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isDatabaseAvailable } from "@/server/risk-events/repository";
import type { PolicyDecision } from "@/server/policy/types";
import type { RecoveryExecutionResult } from "@/server/recovery/types";

export type AuditActorType =
  "AI_AGENT" | "POLICY_ENGINE" | "HUMAN_OPERATOR" | "RAZORPAY_WEBHOOK" | "RECOVERY_EXECUTOR";

export interface AuditLogEntry {
  id: string;
  merchantId: string;
  actor: AuditActorType;
  action: string;
  riskEventId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const AUDIT_LOGS_FALLBACK_PATH = path.join(process.cwd(), "data", "audit-logs.json");
let auditLogsMemoryStore: AuditLogEntry[] = [];

function ensureAuditStore(): AuditLogEntry[] {
  if (auditLogsMemoryStore.length > 0) {
    return auditLogsMemoryStore;
  }
  try {
    if (fs.existsSync(AUDIT_LOGS_FALLBACK_PATH)) {
      const content = fs.readFileSync(AUDIT_LOGS_FALLBACK_PATH, "utf-8");
      auditLogsMemoryStore = JSON.parse(content) as AuditLogEntry[];
      return auditLogsMemoryStore;
    }
  } catch (err) {
    console.warn("Could not read local audit logs JSON store:", err);
  }
  return auditLogsMemoryStore;
}

function persistAuditStore(logs: AuditLogEntry[]): void {
  auditLogsMemoryStore = logs;
  try {
    const dataDir = path.dirname(AUDIT_LOGS_FALLBACK_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(AUDIT_LOGS_FALLBACK_PATH, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist local audit logs JSON store:", err);
  }
}

/**
 * Persists an immutable audit log entry.
 */
export async function recordAuditLog(entry: {
  merchantId: string;
  actor: AuditActorType;
  action: string;
  riskEventId?: string;
  details: Record<string, unknown>;
}): Promise<AuditLogEntry> {
  const dbOnline = await isDatabaseAvailable();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  if (dbOnline) {
    try {
      const created = await prisma.auditLog.create({
        data: {
          id,
          merchantId: entry.merchantId,
          actor: entry.actor,
          action: entry.action,
          riskEventId: entry.riskEventId,
          details: entry.details as Prisma.InputJsonValue,
          createdAt: new Date(createdAt),
        },
      });

      return {
        id: created.id,
        merchantId: created.merchantId,
        actor: created.actor as AuditActorType,
        action: created.action,
        riskEventId: created.riskEventId ?? undefined,
        details: created.details as Record<string, unknown>,
        createdAt: created.createdAt.toISOString(),
      };
    } catch {
      // Fall through to fallback
    }
  }

  const logRecord: AuditLogEntry = {
    id,
    merchantId: entry.merchantId,
    actor: entry.actor,
    action: entry.action,
    riskEventId: entry.riskEventId,
    details: entry.details,
    createdAt,
  };

  const store = ensureAuditStore();
  store.push(logRecord);
  persistAuditStore(store);
  return logRecord;
}

/**
 * Records a policy evaluation decision in the audit trail.
 */
export async function recordPolicyDecisionAudit(
  decision: PolicyDecision,
  merchantId: string = "merchant_default_reclaimai"
): Promise<AuditLogEntry> {
  return recordAuditLog({
    merchantId,
    actor: "POLICY_ENGINE",
    action: "POLICY_EVALUATION",
    riskEventId: decision.eventId,
    details: {
      recommendationId: decision.recommendationId,
      decision: decision.decision,
      originalAction: decision.originalAction,
      approvedAction: decision.approvedAction,
      policyVersion: decision.policyVersion,
      reasons: decision.reasons,
      ruleOutcomes: decision.ruleResults.map(
        (r: { ruleId: string; ruleName: string; passed: boolean; reason?: string }) => ({
          ruleId: r.ruleId,
          ruleName: r.ruleName,
          passed: r.passed,
          reason: r.reason,
        })
      ),
      requiresHumanReview: decision.requiresHumanReview,
      requiresCustomerAction: decision.requiresCustomerAction,
      shouldStopAutomation: decision.shouldStopAutomation,
      evaluatedAt: decision.evaluatedAt,
    },
  });
}

/**
 * Retrieves audit logs for a given risk event.
 */
export async function getAuditLogsByEventId(riskEventId: string): Promise<AuditLogEntry[]> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { riskEventId },
        orderBy: { createdAt: "asc" },
      });
      return logs.map((l) => ({
        id: l.id,
        merchantId: l.merchantId,
        actor: l.actor as AuditActorType,
        action: l.action,
        riskEventId: l.riskEventId ?? undefined,
        details: l.details as Record<string, unknown>,
        createdAt: l.createdAt.toISOString(),
      }));
    } catch {
      // Fallback
    }
  }

  const store = ensureAuditStore();
  return store.filter((l) => l.riskEventId === riskEventId);
}

/**
 * Records a recovery execution in the immutable audit trail.
 * Mandated fields: event ID, policy decision ID, execution ID, approved action,
 * provider, provider reference, status, recovered amount, timestamp, idempotency key.
 */
export async function recordRecoveryExecutionAudit(
  result: RecoveryExecutionResult,
  merchantId: string = "merchant_default_reclaimai"
): Promise<AuditLogEntry> {
  const auditDetails: Record<string, unknown> = {
    executionId: result.executionId,
    policyDecisionId: result.policyDecisionId,
    approvedAction: result.action,
    provider: result.provider,
    providerReference: result.providerReference,
    status: result.status,
    recoveredAmount: result.recoveredAmount,
    currency: result.currency,
    executedAt: result.executedAt,
    failureReason: result.failureReason,
    // Note: Secrets are NEVER logged
  };

  if (result.metadata?.idempotencyKey) {
    auditDetails.idempotencyKey = result.metadata.idempotencyKey;
  }

  return recordAuditLog({
    merchantId,
    actor: "RECOVERY_EXECUTOR",
    action: "RECOVERY_EXECUTION",
    riskEventId: result.eventId,
    details: auditDetails,
  });
}

/**
 * Records a blocked or refused execution attempt in the audit trail.
 */
export async function recordRefusedExecutionAudit(params: {
  eventId: string;
  policyDecisionId?: string;
  attemptedAction: string;
  reason: string;
  merchantId?: string;
}): Promise<AuditLogEntry> {
  return recordAuditLog({
    merchantId: params.merchantId ?? "merchant_default_reclaimai",
    actor: "RECOVERY_EXECUTOR",
    action: "EXECUTION_BLOCKED",
    riskEventId: params.eventId,
    details: {
      policyDecisionId: params.policyDecisionId,
      attemptedAction: params.attemptedAction,
      reason: params.reason,
      timestamp: new Date().toISOString(),
    },
  });
}
