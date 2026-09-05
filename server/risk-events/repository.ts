import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  RiskCategoryType,
  SyntheticRiskEventInput,
  SyntheticGroundTruth,
  PairedSyntheticRecord,
} from "@/server/data/synthetic-generator";
import type { AIInputDTO, DiagnosisSeverity } from "@/server/ai/types";
import type {
  RecoveryAction,
  RecoveryExecutionStatus,
  RecoveryExecutionProvider,
  ExecutionMetricsDTO,
} from "@/server/recovery/types";

const FALLBACK_DATA_PATH = path.join(process.cwd(), "data", "synthetic-risk-events.json");

// In-memory runtime cache for local dev fallback
let memoryStore: PairedSyntheticRecord[] = [];

/**
 * Ensures the data/ directory exists and loads cached records if available.
 */
function ensureLocalStore(): PairedSyntheticRecord[] {
  if (memoryStore.length > 0) {
    return memoryStore;
  }

  try {
    if (fs.existsSync(FALLBACK_DATA_PATH)) {
      const content = fs.readFileSync(FALLBACK_DATA_PATH, "utf-8");
      const parsed = JSON.parse(content) as PairedSyntheticRecord[];
      // Convert date strings back to Date objects
      memoryStore = parsed.map((item) => ({
        ...item,
        event: {
          ...item.event,
          createdAt: new Date(item.event.createdAt),
        },
      }));
      return memoryStore;
    }
  } catch (err) {
    console.warn("Could not read local JSON fallback dataset:", err);
  }

  return memoryStore;
}

/**
 * Persists records to the JSON fallback file.
 */
export function persistLocalStore(records: PairedSyntheticRecord[]): void {
  memoryStore = records;
  try {
    const dataDir = path.dirname(FALLBACK_DATA_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_DATA_PATH, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist local JSON dataset fallback:", err);
  }
}

let dbConnectivityStatus: "UNKNOWN" | "ONLINE" | "OFFLINE" = "UNKNOWN";

export async function isDatabaseAvailable(): Promise<boolean> {
  if (dbConnectivityStatus === "OFFLINE") {
    return false;
  }
  if (dbConnectivityStatus === "ONLINE") {
    return true;
  }

  try {
    const connectPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection probe timeout")), 800)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    dbConnectivityStatus = "ONLINE";
    return true;
  } catch {
    dbConnectivityStatus = "OFFLINE";
    return false;
  }
}

export function resetDbConnectivityStatus(): void {
  dbConnectivityStatus = "UNKNOWN";
}

/**
 * Creates or inserts a new risk event into PostgreSQL, falling back to local store if DB is offline.
 */
export async function createRiskEvent(
  eventInput: SyntheticRiskEventInput,
  groundTruthInput?: SyntheticGroundTruth
): Promise<{ event: SyntheticRiskEventInput; persistedVia: "database" | "local_store" }> {
  const dbOnline = await isDatabaseAvailable();

  if (dbOnline) {
    try {
      // Attempt Prisma insertion
      const createdEvent = await prisma.riskEvent.create({
        data: {
          id: eventInput.id,
          merchantId: eventInput.merchantId,
          category: eventInput.category,
          severity: eventInput.severity,
          amountAtRisk: eventInput.amountAtRisk,
          currency: eventInput.currency,
          customerId: eventInput.customerId,
          customerEmail: eventInput.customerEmail,
          orderId: eventInput.orderId,
          paymentMethod: eventInput.paymentMethod,
          failureCode: eventInput.failureCode,
          failureReason: eventInput.failureReason,
          attemptNumber: eventInput.attemptNumber,
          recoveryAttemptsCount: eventInput.recoveryAttemptsCount,
          customerTier: eventInput.customerTier,
          isSubscription: eventInput.isSubscription,
          subscriptionPlanId: eventInput.subscriptionPlanId,
          isRecoveryEligible: eventInput.isRecoveryEligible,
          previousSuccessCount: eventInput.previousSuccessCount,
          previousFailureCount: eventInput.previousFailureCount,
          metadata: (eventInput.metadata ?? {}) as object,
          createdAt: eventInput.createdAt,
        },
      });

      if (groundTruthInput) {
        await prisma.eventGroundTruth.create({
          data: {
            riskEventId: createdEvent.id,
            isRecoverable: groundTruthInput.isRecoverable,
            recoverableAmount: groundTruthInput.recoverableAmount,
            expectedRecoveryAction: groundTruthInput.expectedRecoveryAction,
            simulatedOutcome: groundTruthInput.simulatedOutcome,
            simulatedRecoveryLatencyHours: groundTruthInput.simulatedRecoveryLatencyHours,
            evaluationNotes: groundTruthInput.evaluationNotes,
          },
        });
      }

      return { event: eventInput, persistedVia: "database" };
    } catch {
      // Fall through to local store
    }
  }

  // Graceful fallback to in-memory / JSON store
  const store = ensureLocalStore();
  const paired: PairedSyntheticRecord = {
    event: eventInput,
    groundTruth: groundTruthInput ?? {
      riskEventId: eventInput.id,
      isRecoverable: eventInput.isRecoveryEligible,
      recoverableAmount: eventInput.isRecoveryEligible ? eventInput.amountAtRisk : 0,
      expectedRecoveryAction: "SMART_RETRY",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 2,
      evaluationNotes: "Generated via local ingestion fallback",
    },
  };
  store.push(paired);
  persistLocalStore(store);
  return { event: eventInput, persistedVia: "local_store" };
}

/**
 * Retrieves risk events returning INPUT FEATURES ONLY.
 * Architectural Guardrail: Does NOT include groundTruth.
 */
export async function getRiskEvents(options?: {
  merchantId?: string;
  category?: RiskCategoryType;
  limit?: number;
  offset?: number;
}): Promise<SyntheticRiskEventInput[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const events = await prisma.riskEvent.findMany({
        where: {
          ...(options?.merchantId ? { merchantId: options.merchantId } : {}),
          ...(options?.category ? { category: options.category } : {}),
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      });

      if (events.length > 0) {
        return events.map((e) => ({
          id: e.id,
          merchantId: e.merchantId,
          category: e.category as RiskCategoryType,
          severity: e.severity,
          amountAtRisk: e.amountAtRisk,
          currency: e.currency,
          customerId: e.customerId ?? "",
          customerEmail: e.customerEmail ?? "",
          orderId: e.orderId ?? "",
          paymentMethod: e.paymentMethod as SyntheticRiskEventInput["paymentMethod"],
          failureCode: e.failureCode ?? "",
          failureReason: e.failureReason ?? "",
          attemptNumber: e.attemptNumber,
          recoveryAttemptsCount: e.recoveryAttemptsCount,
          customerTier: e.customerTier as SyntheticRiskEventInput["customerTier"],
          isSubscription: e.isSubscription,
          subscriptionPlanId: e.subscriptionPlanId ?? undefined,
          isRecoveryEligible: e.isRecoveryEligible,
          previousSuccessCount: e.previousSuccessCount,
          previousFailureCount: e.previousFailureCount,
          metadata: (e.metadata ?? {}) as Record<string, unknown>,
          createdAt: e.createdAt,
        }));
      }
    } catch {
      // Fall back to local store
    }
  }

  // Local fallback
  const store = ensureLocalStore();
  let filtered = store.map((s) => s.event);
  if (options?.merchantId) {
    filtered = filtered.filter((e) => e.merchantId === options.merchantId);
  }
  if (options?.category) {
    filtered = filtered.filter((e) => e.category === options.category);
  }
  return filtered.slice(offset, offset + limit);
}

/**
 * Retrieves a single risk event alongside its ground-truth label.
 * STRICTLY FOR THE EVALUATION HARNESS ONLY.
 */
export async function getRiskEventWithGroundTruth(
  eventId: string
): Promise<PairedSyntheticRecord | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const event = await prisma.riskEvent.findUnique({
        where: { id: eventId },
        include: { groundTruth: true },
      });

      if (event && event.groundTruth) {
        return {
          event: {
            id: event.id,
            merchantId: event.merchantId,
            category: event.category as RiskCategoryType,
            severity: event.severity,
            amountAtRisk: event.amountAtRisk,
            currency: event.currency,
            customerId: event.customerId ?? "",
            customerEmail: event.customerEmail ?? "",
            orderId: event.orderId ?? "",
            paymentMethod: event.paymentMethod as SyntheticRiskEventInput["paymentMethod"],
            failureCode: event.failureCode ?? "",
            failureReason: event.failureReason ?? "",
            attemptNumber: event.attemptNumber,
            recoveryAttemptsCount: event.recoveryAttemptsCount,
            customerTier: event.customerTier as SyntheticRiskEventInput["customerTier"],
            isSubscription: event.isSubscription,
            subscriptionPlanId: event.subscriptionPlanId ?? undefined,
            isRecoveryEligible: event.isRecoveryEligible,
            previousSuccessCount: event.previousSuccessCount,
            previousFailureCount: event.previousFailureCount,
            metadata: (event.metadata ?? {}) as Record<string, unknown>,
            createdAt: event.createdAt,
          },
          groundTruth: {
            riskEventId: event.groundTruth.riskEventId,
            isRecoverable: event.groundTruth.isRecoverable,
            recoverableAmount: event.groundTruth.recoverableAmount,
            expectedRecoveryAction: event.groundTruth.expectedRecoveryAction,
            simulatedOutcome: event.groundTruth.simulatedOutcome,
            simulatedRecoveryLatencyHours: event.groundTruth.simulatedRecoveryLatencyHours ?? 0,
            evaluationNotes: event.groundTruth.evaluationNotes ?? "",
          },
        };
      }
    } catch {
      // Fall back to local store
    }
  }

  const store = ensureLocalStore();
  const match = store.find((s) => s.event.id === eventId);
  return match ?? null;
}

export interface RiskEventSummaryDTO {
  totalEvents: number;
  totalAmountAtRiskPaise: number;
  totalAmountAtRiskINR: number;
  totalRecoverableAmountPaise: number;
  totalRecoverableAmountINR: number;
  totalNonRecoverableAmountPaise: number;
  totalNonRecoverableAmountINR: number;
  recoverablePercentage: number;
  categoryBreakdown: Record<
    RiskCategoryType,
    {
      count: number;
      amountAtRiskINR: number;
      recoverableAmountINR: number;
      recoverableCount: number;
    }
  >;
  paymentMethodBreakdown: Record<string, number>;
  source: "database" | "local_store" | "empty";
}

/**
 * Computes live aggregate metrics for revenue recovery evaluation.
 */
export async function getRiskEventSummary(merchantId?: string): Promise<RiskEventSummaryDTO> {
  let records: PairedSyntheticRecord[] = [];
  let source: RiskEventSummaryDTO["source"] = "local_store";

  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const dbEvents = await prisma.riskEvent.findMany({
        where: merchantId ? { merchantId } : undefined,
        include: { groundTruth: true },
      });

      if (dbEvents.length > 0) {
        source = "database";
        records = dbEvents.map((e) => ({
          event: {
            id: e.id,
            merchantId: e.merchantId,
            category: e.category as RiskCategoryType,
            severity: e.severity,
            amountAtRisk: e.amountAtRisk,
            currency: e.currency,
            customerId: e.customerId ?? "",
            customerEmail: e.customerEmail ?? "",
            orderId: e.orderId ?? "",
            paymentMethod: e.paymentMethod as SyntheticRiskEventInput["paymentMethod"],
            failureCode: e.failureCode ?? "",
            failureReason: e.failureReason ?? "",
            attemptNumber: e.attemptNumber,
            recoveryAttemptsCount: e.recoveryAttemptsCount,
            customerTier: e.customerTier as SyntheticRiskEventInput["customerTier"],
            isSubscription: e.isSubscription,
            subscriptionPlanId: e.subscriptionPlanId ?? undefined,
            isRecoveryEligible: e.isRecoveryEligible,
            previousSuccessCount: e.previousSuccessCount,
            previousFailureCount: e.previousFailureCount,
            metadata: (e.metadata ?? {}) as Record<string, unknown>,
            createdAt: e.createdAt,
          },
          groundTruth: e.groundTruth
            ? {
                riskEventId: e.groundTruth.riskEventId,
                isRecoverable: e.groundTruth.isRecoverable,
                recoverableAmount: e.groundTruth.recoverableAmount,
                expectedRecoveryAction: e.groundTruth.expectedRecoveryAction,
                simulatedOutcome: e.groundTruth.simulatedOutcome,
                simulatedRecoveryLatencyHours: e.groundTruth.simulatedRecoveryLatencyHours ?? 0,
                evaluationNotes: e.groundTruth.evaluationNotes ?? "",
              }
            : {
                riskEventId: e.id,
                isRecoverable: false,
                recoverableAmount: 0,
                expectedRecoveryAction: "NONE",
                simulatedOutcome: "PERMANENT_FAILURE",
                simulatedRecoveryLatencyHours: 0,
                evaluationNotes: "No ground truth available",
              },
        }));
      }
    } catch {
      // Database offline, use local store
    }
  }

  if (records.length === 0) {
    const localStore = ensureLocalStore();
    records = merchantId ? localStore.filter((s) => s.event.merchantId === merchantId) : localStore;
    source = records.length > 0 ? "local_store" : "empty";
  }

  return calculateMetricsFromRecords(records, source);
}

/**
 * Pure aggregation function for paired records (used by repository and test suites).
 */
export function calculateMetricsFromRecords(
  records: PairedSyntheticRecord[],
  source: RiskEventSummaryDTO["source"] = "local_store"
): RiskEventSummaryDTO {
  const categories: RiskCategoryType[] = [
    "TEMPORARY_PAYMENT_FAILURE",
    "INSUFFICIENT_FUNDS",
    "CUSTOMER_ACTION_REQUIRED",
    "REPEATED_PAYMENT_FAILURE",
    "ABANDONED_CHECKOUT",
    "NON_RECOVERABLE",
  ];

  const categoryBreakdown = categories.reduce(
    (acc, cat) => {
      acc[cat] = { count: 0, amountAtRiskINR: 0, recoverableAmountINR: 0, recoverableCount: 0 };
      return acc;
    },
    {} as RiskEventSummaryDTO["categoryBreakdown"]
  );

  const paymentMethodBreakdown: Record<string, number> = {};

  let totalAmountAtRiskPaise = 0;
  let totalRecoverableAmountPaise = 0;

  for (const { event, groundTruth } of records) {
    totalAmountAtRiskPaise += event.amountAtRisk;
    totalRecoverableAmountPaise += groundTruth.recoverableAmount;

    // Category stats
    if (categoryBreakdown[event.category]) {
      categoryBreakdown[event.category].count += 1;
      categoryBreakdown[event.category].amountAtRiskINR += event.amountAtRisk / 100;
      categoryBreakdown[event.category].recoverableAmountINR += groundTruth.recoverableAmount / 100;
      if (groundTruth.isRecoverable) {
        categoryBreakdown[event.category].recoverableCount += 1;
      }
    }

    // Payment method stats
    paymentMethodBreakdown[event.paymentMethod] =
      (paymentMethodBreakdown[event.paymentMethod] || 0) + 1;
  }

  const totalNonRecoverableAmountPaise = Math.max(
    0,
    totalAmountAtRiskPaise - totalRecoverableAmountPaise
  );

  const recoverablePercentage =
    totalAmountAtRiskPaise > 0
      ? Math.round((totalRecoverableAmountPaise / totalAmountAtRiskPaise) * 1000) / 10
      : 0;

  return {
    totalEvents: records.length,
    totalAmountAtRiskPaise,
    totalAmountAtRiskINR: Math.round((totalAmountAtRiskPaise / 100) * 100) / 100,
    totalRecoverableAmountPaise,
    totalRecoverableAmountINR: Math.round((totalRecoverableAmountPaise / 100) * 100) / 100,
    totalNonRecoverableAmountPaise,
    totalNonRecoverableAmountINR: Math.round((totalNonRecoverableAmountPaise / 100) * 100) / 100,
    recoverablePercentage,
    categoryBreakdown,
    paymentMethodBreakdown,
    source,
  };
}

export interface PersistRecommendationInput {
  riskEventId: string;
  action: string;
  confidenceScore: number;
  reasoning: string;
  diagnosisSummary: string;
  likelyCause: string;
  severity: string;
  expectedBenefit: string;
  safetyFlags: {
    requiresCustomerAction: boolean;
    requiresHumanReview: boolean;
    shouldStopAutomation: boolean;
  };
  provider?: string;
  model?: string;
  createdAt?: Date;
}

const RECOMMENDATIONS_FALLBACK_PATH = path.join(process.cwd(), "data", "recommendations.json");
let recommendationsMemoryStore: PersistRecommendationInput[] = [];

function ensureRecommendationsStore(): PersistRecommendationInput[] {
  if (recommendationsMemoryStore.length > 0) {
    return recommendationsMemoryStore;
  }
  try {
    if (fs.existsSync(RECOMMENDATIONS_FALLBACK_PATH)) {
      const content = fs.readFileSync(RECOMMENDATIONS_FALLBACK_PATH, "utf-8");
      if (content.trim()) {
        recommendationsMemoryStore = JSON.parse(content) as PersistRecommendationInput[];
      }
      return recommendationsMemoryStore;
    }
  } catch (err) {
    console.warn("Could not read local recommendations JSON store:", err);
  }
  return recommendationsMemoryStore;
}

function persistRecommendationsStore(recs: PersistRecommendationInput[]): void {
  recommendationsMemoryStore = recs;
  try {
    const dataDir = path.dirname(RECOMMENDATIONS_FALLBACK_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(RECOMMENDATIONS_FALLBACK_PATH, JSON.stringify(recs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist local recommendations JSON store:", err);
  }
}

/**
 * AI-SAFE REPOSITORY METHOD
 *
 * Retrieves ONLY the operational features necessary for AI reasoning.
 * CRITICAL SECURITY & EVALUATION BOUNDARY:
 * - Explicitly projects fields (NEVER does SELECT *).
 * - Excludes all EventGroundTruth properties.
 * - Excludes customer PII (e.g. customerEmail).
 */
export async function getAIInputByEventId(eventId: string): Promise<AIInputDTO | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const event = await prisma.riskEvent.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          amountAtRisk: true,
          currency: true,
          category: true,
          severity: true,
          paymentMethod: true,
          failureCode: true,
          failureReason: true,
          attemptNumber: true,
          recoveryAttemptsCount: true,
          customerTier: true,
          isSubscription: true,
          subscriptionPlanId: true,
          isRecoveryEligible: true,
          previousSuccessCount: true,
          previousFailureCount: true,
          metadata: true,
        },
      });

      if (event) {
        return {
          eventId: event.id,
          amountAtRisk: event.amountAtRisk,
          amountAtRiskINR: Math.round((event.amountAtRisk / 100) * 100) / 100,
          currency: event.currency,
          category: event.category,
          severity: event.severity as DiagnosisSeverity,
          paymentMethod: event.paymentMethod,
          failureCode: event.failureCode ?? "",
          failureReason: event.failureReason ?? "",
          attemptNumber: event.attemptNumber,
          recoveryAttemptsCount: event.recoveryAttemptsCount,
          customerTier: event.customerTier,
          isSubscription: event.isSubscription,
          subscriptionPlanId: event.subscriptionPlanId ?? undefined,
          isRecoveryEligible: event.isRecoveryEligible,
          previousSuccessCount: event.previousSuccessCount,
          previousFailureCount: event.previousFailureCount,
          metadata: (event.metadata ?? {}) as Record<string, unknown>,
        };
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback to local store
  const store = ensureLocalStore();
  const match = store.find((s) => s.event.id === eventId);
  if (!match) {
    return null;
  }

  const e = match.event;
  // Construct clean DTO strictly without ground truth or customerEmail
  const aiSafeInput: AIInputDTO = {
    eventId: e.id,
    amountAtRisk: e.amountAtRisk,
    amountAtRiskINR: Math.round((e.amountAtRisk / 100) * 100) / 100,
    currency: e.currency,
    category: e.category,
    severity: e.severity as DiagnosisSeverity,
    paymentMethod: e.paymentMethod,
    failureCode: e.failureCode ?? "",
    failureReason: e.failureReason ?? "",
    attemptNumber: e.attemptNumber,
    recoveryAttemptsCount: e.recoveryAttemptsCount,
    customerTier: e.customerTier,
    isSubscription: e.isSubscription,
    subscriptionPlanId: e.subscriptionPlanId,
    isRecoveryEligible: e.isRecoveryEligible,
    previousSuccessCount: e.previousSuccessCount,
    previousFailureCount: e.previousFailureCount,
    metadata: e.metadata,
  };

  return aiSafeInput;
}

/**
 * Persists an AI Recovery Recommendation.
 * Ground-truth fields are strictly NOT stored here.
 */
export async function saveRecoveryRecommendation(data: PersistRecommendationInput): Promise<void> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      await prisma.recoveryRecommendation.upsert({
        where: { riskEventId: data.riskEventId },
        create: {
          riskEventId: data.riskEventId,
          action: data.action,
          confidenceScore: data.confidenceScore,
          reasoning: data.reasoning,
          diagnosisSummary: data.diagnosisSummary,
          likelyCause: data.likelyCause,
          severity: data.severity,
          expectedBenefit: data.expectedBenefit,
          safetyFlags: data.safetyFlags,
          provider: data.provider ?? "mock",
          model: data.model ?? "mock-reasoning-v1",
          createdAt: data.createdAt ?? new Date(),
        },
        update: {
          action: data.action,
          confidenceScore: data.confidenceScore,
          reasoning: data.reasoning,
          diagnosisSummary: data.diagnosisSummary,
          likelyCause: data.likelyCause,
          severity: data.severity,
          expectedBenefit: data.expectedBenefit,
          safetyFlags: data.safetyFlags,
          provider: data.provider ?? "mock",
          model: data.model ?? "mock-reasoning-v1",
        },
      });
      return;
    } catch {
      // Fall through to fallback
    }
  }

  const store = ensureRecommendationsStore();
  const existingIdx = store.findIndex((r) => r.riskEventId === data.riskEventId);
  if (existingIdx >= 0) {
    store[existingIdx] = data;
  } else {
    store.push(data);
  }
  persistRecommendationsStore(store);
}

/**
 * Retrieves a persisted AI Recovery Recommendation by event ID.
 */
export async function getRecoveryRecommendationByEventId(
  riskEventId: string
): Promise<PersistRecommendationInput | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const rec = await prisma.recoveryRecommendation.findUnique({
        where: { riskEventId },
      });
      if (rec) {
        return {
          riskEventId: rec.riskEventId,
          action: rec.action,
          confidenceScore: rec.confidenceScore,
          reasoning: rec.reasoning,
          diagnosisSummary: rec.diagnosisSummary,
          likelyCause: rec.likelyCause,
          severity: rec.severity,
          expectedBenefit: rec.expectedBenefit,
          safetyFlags: rec.safetyFlags as PersistRecommendationInput["safetyFlags"],
          provider: rec.provider,
          model: rec.model,
          createdAt: rec.createdAt,
        };
      }
    } catch {
      // Fallback to local store
    }
  }

  const store = ensureRecommendationsStore();
  const found = store.find((r) => r.riskEventId === riskEventId);
  return found ?? null;
}

export interface PersistPolicyDecisionInput {
  id?: string;
  riskEventId: string;
  recommendationId?: string;
  decision: string;
  originalAction: string;
  approvedAction: string;
  reasons: string[];
  ruleResults: unknown;
  policyVersion?: string;
  requiresHumanReview?: boolean;
  requiresCustomerAction?: boolean;
  shouldStopAutomation?: boolean;
  evaluatedAt?: Date;
}

const POLICY_DECISIONS_FALLBACK_PATH = path.join(process.cwd(), "data", "policy-decisions.json");
let policyDecisionsMemoryStore: PersistPolicyDecisionInput[] = [];

function ensurePolicyDecisionsStore(): PersistPolicyDecisionInput[] {
  if (policyDecisionsMemoryStore.length > 0) {
    return policyDecisionsMemoryStore;
  }
  try {
    if (fs.existsSync(POLICY_DECISIONS_FALLBACK_PATH)) {
      const content = fs.readFileSync(POLICY_DECISIONS_FALLBACK_PATH, "utf-8");
      policyDecisionsMemoryStore = JSON.parse(content) as PersistPolicyDecisionInput[];
      return policyDecisionsMemoryStore;
    }
  } catch (err) {
    console.warn("Could not read local policy decisions JSON store:", err);
  }
  return policyDecisionsMemoryStore;
}

function persistPolicyDecisionsStore(decisions: PersistPolicyDecisionInput[]): void {
  policyDecisionsMemoryStore = decisions;
  try {
    const dataDir = path.dirname(POLICY_DECISIONS_FALLBACK_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(POLICY_DECISIONS_FALLBACK_PATH, JSON.stringify(decisions, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist local policy decisions JSON store:", err);
  }
}

/**
 * Persists a Policy Decision with duplicate/idempotency protection.
 */
export async function savePolicyDecision(
  data: PersistPolicyDecisionInput
): Promise<PersistPolicyDecisionInput> {
  const dbOnline = await isDatabaseAvailable();
  const id = data.id ?? `dec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const evaluatedAt = data.evaluatedAt ?? new Date();

  if (dbOnline) {
    try {
      const result = await prisma.policyDecision.upsert({
        where: { riskEventId: data.riskEventId },
        create: {
          id,
          riskEventId: data.riskEventId,
          recommendationId: data.recommendationId,
          decision: data.decision,
          originalAction: data.originalAction,
          approvedAction: data.approvedAction,
          reasons: data.reasons,
          ruleResults: data.ruleResults as unknown as Prisma.InputJsonValue,
          policyVersion: data.policyVersion ?? "1.0.0",
          requiresHumanReview: data.requiresHumanReview ?? false,
          requiresCustomerAction: data.requiresCustomerAction ?? false,
          shouldStopAutomation: data.shouldStopAutomation ?? false,
          evaluatedAt,
        },
        update: {
          recommendationId: data.recommendationId,
          decision: data.decision,
          originalAction: data.originalAction,
          approvedAction: data.approvedAction,
          reasons: data.reasons,
          ruleResults: data.ruleResults as unknown as Prisma.InputJsonValue,
          policyVersion: data.policyVersion ?? "1.0.0",
          requiresHumanReview: data.requiresHumanReview ?? false,
          requiresCustomerAction: data.requiresCustomerAction ?? false,
          shouldStopAutomation: data.shouldStopAutomation ?? false,
          evaluatedAt,
        },
      });

      return {
        id: result.id,
        riskEventId: result.riskEventId,
        recommendationId: result.recommendationId ?? undefined,
        decision: result.decision,
        originalAction: result.originalAction,
        approvedAction: result.approvedAction,
        reasons: result.reasons,
        ruleResults: result.ruleResults,
        policyVersion: result.policyVersion,
        requiresHumanReview: result.requiresHumanReview,
        requiresCustomerAction: result.requiresCustomerAction,
        shouldStopAutomation: result.shouldStopAutomation,
        evaluatedAt: result.evaluatedAt,
      };
    } catch {
      // Fall through to fallback
    }
  }

  const record: PersistPolicyDecisionInput = {
    ...data,
    id,
    evaluatedAt,
    policyVersion: data.policyVersion ?? "1.0.0",
    requiresHumanReview: data.requiresHumanReview ?? false,
    requiresCustomerAction: data.requiresCustomerAction ?? false,
    shouldStopAutomation: data.shouldStopAutomation ?? false,
  };

  const store = ensurePolicyDecisionsStore();
  const existingIdx = store.findIndex((d) => d.riskEventId === data.riskEventId);
  if (existingIdx >= 0) {
    store[existingIdx] = record;
  } else {
    store.push(record);
  }
  persistPolicyDecisionsStore(store);
  return record;
}

/**
 * Retrieves a persisted Policy Decision by risk event ID.
 */
export async function getPolicyDecisionByEventId(
  riskEventId: string
): Promise<PersistPolicyDecisionInput | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const decision = await prisma.policyDecision.findUnique({
        where: { riskEventId },
      });
      if (decision) {
        return {
          id: decision.id,
          riskEventId: decision.riskEventId,
          recommendationId: decision.recommendationId ?? undefined,
          decision: decision.decision,
          originalAction: decision.originalAction,
          approvedAction: decision.approvedAction,
          reasons: decision.reasons,
          ruleResults: decision.ruleResults,
          policyVersion: decision.policyVersion,
          requiresHumanReview: decision.requiresHumanReview,
          requiresCustomerAction: decision.requiresCustomerAction,
          shouldStopAutomation: decision.shouldStopAutomation,
          evaluatedAt: decision.evaluatedAt,
        };
      }
    } catch {
      // Fallback
    }
  }

  const store = ensurePolicyDecisionsStore();
  const found = store.find((d) => d.riskEventId === riskEventId);
  return found ?? null;
}

export interface PersistRecoveryExecutionInput {
  id?: string;
  riskEventId: string;
  policyDecisionId: string;
  action: RecoveryAction;
  status: RecoveryExecutionStatus;
  provider: RecoveryExecutionProvider;
  providerReference?: string;
  recoveredAmount: number; // in minor units (paise)
  currency?: string;
  failureReason?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  executedAt?: Date | string;
}

export interface PersistCommunicationTaskInput {
  id?: string;
  riskEventId: string;
  policyDecisionId: string;
  customerReference: string;
  action: string;
  reason: string;
  status?: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  createdAt?: Date | string;
}

export interface PersistHumanReviewTaskInput {
  id?: string;
  riskEventId: string;
  policyDecisionId: string;
  reason: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status?: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt?: Date | string;
}

const RECOVERY_EXECUTIONS_FALLBACK_PATH = path.join(
  process.cwd(),
  "data",
  "recovery-executions.json"
);
let recoveryExecutionsMemoryStore: PersistRecoveryExecutionInput[] = [];

function ensureRecoveryExecutionsStore(): PersistRecoveryExecutionInput[] {
  if (recoveryExecutionsMemoryStore.length > 0) {
    return recoveryExecutionsMemoryStore;
  }
  try {
    if (fs.existsSync(RECOVERY_EXECUTIONS_FALLBACK_PATH)) {
      const content = fs.readFileSync(RECOVERY_EXECUTIONS_FALLBACK_PATH, "utf-8");
      recoveryExecutionsMemoryStore = JSON.parse(content) as PersistRecoveryExecutionInput[];
      return recoveryExecutionsMemoryStore;
    }
  } catch (err) {
    console.warn("Could not read local recovery executions JSON store:", err);
  }
  return recoveryExecutionsMemoryStore;
}

function persistRecoveryExecutionsStore(executions: PersistRecoveryExecutionInput[]): void {
  recoveryExecutionsMemoryStore = executions;
  try {
    const dataDir = path.dirname(RECOVERY_EXECUTIONS_FALLBACK_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(
      RECOVERY_EXECUTIONS_FALLBACK_PATH,
      JSON.stringify(executions, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to persist local recovery executions JSON store:", err);
  }
}

const RECOVERY_TASKS_FALLBACK_PATH = path.join(process.cwd(), "data", "recovery-tasks.json");

interface LocalTasksStore {
  communicationTasks: PersistCommunicationTaskInput[];
  humanReviewTasks: PersistHumanReviewTaskInput[];
}

let localTasksStore: LocalTasksStore = {
  communicationTasks: [],
  humanReviewTasks: [],
};

function ensureRecoveryTasksStore(): LocalTasksStore {
  if (
    localTasksStore.communicationTasks.length > 0 ||
    localTasksStore.humanReviewTasks.length > 0
  ) {
    return localTasksStore;
  }
  try {
    if (fs.existsSync(RECOVERY_TASKS_FALLBACK_PATH)) {
      const content = fs.readFileSync(RECOVERY_TASKS_FALLBACK_PATH, "utf-8");
      localTasksStore = JSON.parse(content) as LocalTasksStore;
      return localTasksStore;
    }
  } catch (err) {
    console.warn("Could not read local recovery tasks JSON store:", err);
  }
  return localTasksStore;
}

function persistRecoveryTasksStore(store: LocalTasksStore): void {
  localTasksStore = store;
  try {
    const dataDir = path.dirname(RECOVERY_TASKS_FALLBACK_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(RECOVERY_TASKS_FALLBACK_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist local recovery tasks JSON store:", err);
  }
}

/**
 * Saves a recovery execution record.
 * Idempotency: If idempotencyKey exists, returns the existing execution.
 */
export async function saveRecoveryExecution(
  data: PersistRecoveryExecutionInput
): Promise<PersistRecoveryExecutionInput> {
  const dbOnline = await isDatabaseAvailable();
  const id = data.id ?? `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const executedAt = data.executedAt ? new Date(data.executedAt) : new Date();

  if (dbOnline) {
    try {
      const existing = await prisma.recoveryExecution.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return {
          id: existing.id,
          riskEventId: existing.riskEventId,
          policyDecisionId: existing.policyDecisionId,
          action: existing.action as RecoveryAction,
          status: existing.status as RecoveryExecutionStatus,
          provider: existing.provider as RecoveryExecutionProvider,
          providerReference: existing.providerReference ?? undefined,
          recoveredAmount: existing.recoveredAmount,
          currency: existing.currency,
          failureReason: existing.failureReason ?? undefined,
          idempotencyKey: existing.idempotencyKey,
          metadata: (existing.metadata as Record<string, unknown>) ?? undefined,
          executedAt: existing.executedAt.toISOString(),
        };
      }

      const created = await prisma.recoveryExecution.create({
        data: {
          id,
          riskEventId: data.riskEventId,
          policyDecisionId: data.policyDecisionId,
          action: data.action,
          status: data.status,
          provider: data.provider,
          providerReference: data.providerReference,
          recoveredAmount: data.recoveredAmount,
          currency: data.currency ?? "INR",
          failureReason: data.failureReason,
          idempotencyKey: data.idempotencyKey,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          executedAt,
        },
      });

      return {
        id: created.id,
        riskEventId: created.riskEventId,
        policyDecisionId: created.policyDecisionId,
        action: created.action as RecoveryAction,
        status: created.status as RecoveryExecutionStatus,
        provider: created.provider as RecoveryExecutionProvider,
        providerReference: created.providerReference ?? undefined,
        recoveredAmount: created.recoveredAmount,
        currency: created.currency,
        failureReason: created.failureReason ?? undefined,
        idempotencyKey: created.idempotencyKey,
        metadata: (created.metadata as Record<string, unknown>) ?? undefined,
        executedAt: created.executedAt.toISOString(),
      };
    } catch {
      // Fall through to fallback
    }
  }

  const store = ensureRecoveryExecutionsStore();
  const existing = store.find((e) => e.idempotencyKey === data.idempotencyKey);
  if (existing) {
    return existing;
  }

  const record: PersistRecoveryExecutionInput = {
    ...data,
    id,
    currency: data.currency ?? "INR",
    executedAt: executedAt.toISOString(),
  };

  store.push(record);
  persistRecoveryExecutionsStore(store);
  return record;
}

/**
 * Retrieves a recovery execution record by idempotency key.
 */
export async function getRecoveryExecutionByIdempotencyKey(
  idempotencyKey: string
): Promise<PersistRecoveryExecutionInput | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const rec = await prisma.recoveryExecution.findUnique({
        where: { idempotencyKey },
      });
      if (rec) {
        return {
          id: rec.id,
          riskEventId: rec.riskEventId,
          policyDecisionId: rec.policyDecisionId,
          action: rec.action as RecoveryAction,
          status: rec.status as RecoveryExecutionStatus,
          provider: rec.provider as RecoveryExecutionProvider,
          providerReference: rec.providerReference ?? undefined,
          recoveredAmount: rec.recoveredAmount,
          currency: rec.currency,
          failureReason: rec.failureReason ?? undefined,
          idempotencyKey: rec.idempotencyKey,
          metadata: (rec.metadata as Record<string, unknown>) ?? undefined,
          executedAt: rec.executedAt.toISOString(),
        };
      }
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryExecutionsStore();
  const found = store.find((e) => e.idempotencyKey === idempotencyKey);
  return found ?? null;
}

/**
 * Retrieves a recovery execution record by ID.
 */
export async function getRecoveryExecutionById(
  id: string
): Promise<PersistRecoveryExecutionInput | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const rec = await prisma.recoveryExecution.findUnique({
        where: { id },
      });
      if (rec) {
        return {
          id: rec.id,
          riskEventId: rec.riskEventId,
          policyDecisionId: rec.policyDecisionId,
          action: rec.action as RecoveryAction,
          status: rec.status as RecoveryExecutionStatus,
          provider: rec.provider as RecoveryExecutionProvider,
          providerReference: rec.providerReference ?? undefined,
          recoveredAmount: rec.recoveredAmount,
          currency: rec.currency,
          failureReason: rec.failureReason ?? undefined,
          idempotencyKey: rec.idempotencyKey,
          metadata: (rec.metadata as Record<string, unknown>) ?? undefined,
          executedAt: rec.executedAt.toISOString(),
        };
      }
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryExecutionsStore();
  const found = store.find((e) => e.id === id);
  return found ?? null;
}

/**
 * Retrieves all recovery executions for an event.
 */
export async function getRecoveryExecutionsByEventId(
  riskEventId: string
): Promise<PersistRecoveryExecutionInput[]> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const recs = await prisma.recoveryExecution.findMany({
        where: { riskEventId },
        orderBy: { executedAt: "desc" },
      });
      if (recs.length > 0) {
        return recs.map((rec) => ({
          id: rec.id,
          riskEventId: rec.riskEventId,
          policyDecisionId: rec.policyDecisionId,
          action: rec.action as RecoveryAction,
          status: rec.status as RecoveryExecutionStatus,
          provider: rec.provider as RecoveryExecutionProvider,
          providerReference: rec.providerReference ?? undefined,
          recoveredAmount: rec.recoveredAmount,
          currency: rec.currency,
          failureReason: rec.failureReason ?? undefined,
          idempotencyKey: rec.idempotencyKey,
          metadata: (rec.metadata as Record<string, unknown>) ?? undefined,
          executedAt: rec.executedAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryExecutionsStore();
  return store.filter((e) => e.riskEventId === riskEventId);
}

/**
 * Updates a recovery execution outcome (e.g. from outcome webhook).
 */
export async function updateRecoveryExecutionOutcome(
  executionId: string,
  updates: {
    status: RecoveryExecutionStatus;
    recoveredAmount?: number;
    providerReference?: string;
    failureReason?: string;
  }
): Promise<PersistRecoveryExecutionInput | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const updated = await prisma.recoveryExecution.update({
        where: { id: executionId },
        data: {
          status: updates.status,
          ...(updates.recoveredAmount !== undefined
            ? { recoveredAmount: updates.recoveredAmount }
            : {}),
          ...(updates.providerReference !== undefined
            ? { providerReference: updates.providerReference }
            : {}),
          ...(updates.failureReason !== undefined ? { failureReason: updates.failureReason } : {}),
        },
      });

      return {
        id: updated.id,
        riskEventId: updated.riskEventId,
        policyDecisionId: updated.policyDecisionId,
        action: updated.action as RecoveryAction,
        status: updated.status as RecoveryExecutionStatus,
        provider: updated.provider as RecoveryExecutionProvider,
        providerReference: updated.providerReference ?? undefined,
        recoveredAmount: updated.recoveredAmount,
        currency: updated.currency,
        failureReason: updated.failureReason ?? undefined,
        idempotencyKey: updated.idempotencyKey,
        metadata: (updated.metadata as Record<string, unknown>) ?? undefined,
        executedAt: updated.executedAt.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryExecutionsStore();
  const idx = store.findIndex((e) => e.id === executionId);
  if (idx < 0) {
    return null;
  }

  const item = store[idx];
  store[idx] = {
    ...item,
    status: updates.status,
    recoveredAmount:
      updates.recoveredAmount !== undefined ? updates.recoveredAmount : item.recoveredAmount,
    providerReference:
      updates.providerReference !== undefined ? updates.providerReference : item.providerReference,
    failureReason: updates.failureReason !== undefined ? updates.failureReason : item.failureReason,
  };
  persistRecoveryExecutionsStore(store);
  return store[idx];
}

/**
 * Persists a dunning communication task.
 */
export async function saveRecoveryCommunicationTask(
  data: PersistCommunicationTaskInput
): Promise<PersistCommunicationTaskInput> {
  const dbOnline = await isDatabaseAvailable();
  const id = data.id ?? `task_com_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

  if (dbOnline) {
    try {
      const created = await prisma.recoveryCommunicationTask.create({
        data: {
          id,
          riskEventId: data.riskEventId,
          policyDecisionId: data.policyDecisionId,
          customerReference: data.customerReference,
          action: data.action,
          reason: data.reason,
          status: data.status ?? "PENDING",
          createdAt,
        },
      });

      return {
        id: created.id,
        riskEventId: created.riskEventId,
        policyDecisionId: created.policyDecisionId,
        customerReference: created.customerReference,
        action: created.action,
        reason: created.reason,
        status: created.status as PersistCommunicationTaskInput["status"],
        createdAt: created.createdAt.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryTasksStore();
  const record: PersistCommunicationTaskInput = {
    ...data,
    id,
    status: data.status ?? "PENDING",
    createdAt: createdAt.toISOString(),
  };
  store.communicationTasks.push(record);
  persistRecoveryTasksStore(store);
  return record;
}

/**
 * Persists a human review operational task.
 */
export async function saveHumanReviewTask(
  data: PersistHumanReviewTaskInput
): Promise<PersistHumanReviewTaskInput> {
  const dbOnline = await isDatabaseAvailable();
  const id = data.id ?? `task_rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

  if (dbOnline) {
    try {
      const created = await prisma.humanReviewTask.create({
        data: {
          id,
          riskEventId: data.riskEventId,
          policyDecisionId: data.policyDecisionId,
          reason: data.reason,
          priority: data.priority ?? "MEDIUM",
          status: data.status ?? "OPEN",
          createdAt,
        },
      });

      return {
        id: created.id,
        riskEventId: created.riskEventId,
        policyDecisionId: created.policyDecisionId,
        reason: created.reason,
        priority: created.priority as PersistHumanReviewTaskInput["priority"],
        status: created.status as PersistHumanReviewTaskInput["status"],
        createdAt: created.createdAt.toISOString(),
      };
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryTasksStore();
  const record: PersistHumanReviewTaskInput = {
    ...data,
    id,
    priority: data.priority ?? "MEDIUM",
    status: data.status ?? "OPEN",
    createdAt: createdAt.toISOString(),
  };
  store.humanReviewTasks.push(record);
  persistRecoveryTasksStore(store);
  return record;
}

/**
 * Retrieves communication tasks for an event.
 */
export async function getRecoveryCommunicationTasksByEventId(
  riskEventId: string
): Promise<PersistCommunicationTaskInput[]> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const tasks = await prisma.recoveryCommunicationTask.findMany({
        where: { riskEventId },
        orderBy: { createdAt: "desc" },
      });
      if (tasks.length > 0) {
        return tasks.map((t) => ({
          id: t.id,
          riskEventId: t.riskEventId,
          policyDecisionId: t.policyDecisionId,
          customerReference: t.customerReference,
          action: t.action,
          reason: t.reason,
          status: t.status as PersistCommunicationTaskInput["status"],
          createdAt: t.createdAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryTasksStore();
  return store.communicationTasks.filter((t) => t.riskEventId === riskEventId);
}

/**
 * Retrieves human review tasks for an event.
 */
export async function getHumanReviewTasksByEventId(
  riskEventId: string
): Promise<PersistHumanReviewTaskInput[]> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const tasks = await prisma.humanReviewTask.findMany({
        where: { riskEventId },
        orderBy: { createdAt: "desc" },
      });
      if (tasks.length > 0) {
        return tasks.map((t) => ({
          id: t.id,
          riskEventId: t.riskEventId,
          policyDecisionId: t.policyDecisionId,
          reason: t.reason,
          priority: t.priority as PersistHumanReviewTaskInput["priority"],
          status: t.status as PersistHumanReviewTaskInput["status"],
          createdAt: t.createdAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
  }

  const store = ensureRecoveryTasksStore();
  return store.humanReviewTasks.filter((t) => t.riskEventId === riskEventId);
}

/**
 * Computes dynamic recovery revenue metrics solely from verified RecoveryExecution records.
 *
 * CRITICAL SEPARATION RULE:
 * - Reads ONLY RecoveryExecution records.
 * - NEVER accesses or reads EventGroundTruth.
 * - "Recovered Revenue" strictly counts executions with status === "SUCCESS".
 */
export async function getExecutionMetrics(): Promise<ExecutionMetricsDTO> {
  let executions: PersistRecoveryExecutionInput[] = [];

  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const dbExecutions = await prisma.recoveryExecution.findMany();
      if (dbExecutions.length > 0) {
        executions = dbExecutions.map((rec) => ({
          id: rec.id,
          riskEventId: rec.riskEventId,
          policyDecisionId: rec.policyDecisionId,
          action: rec.action as RecoveryAction,
          status: rec.status as RecoveryExecutionStatus,
          provider: rec.provider as RecoveryExecutionProvider,
          providerReference: rec.providerReference ?? undefined,
          recoveredAmount: rec.recoveredAmount,
          currency: rec.currency,
          failureReason: rec.failureReason ?? undefined,
          idempotencyKey: rec.idempotencyKey,
          metadata: (rec.metadata as Record<string, unknown>) ?? undefined,
          executedAt: rec.executedAt.toISOString(),
        }));
      }
    } catch {
      // Fallback to local store
    }
  }

  if (executions.length === 0) {
    executions = ensureRecoveryExecutionsStore();
  }

  const actions: RecoveryAction[] = [
    "SMART_RETRY",
    "DYNAMIC_PAYMENT_LINK",
    "CUSTOMER_DUNNING",
    "ESCALATE_HUMAN",
    "NONE",
  ];

  const recoveryRateByAction = actions.reduce(
    (acc, act) => {
      acc[act] = {
        attempts: 0,
        successes: 0,
        recoveredPaise: 0,
        recoveredINR: 0,
        successRate: 0,
      };
      return acc;
    },
    {} as ExecutionMetricsDTO["recoveryRateByAction"]
  );

  let totalExecutionAttempts = 0;
  let successfulRecoveries = 0;
  let failedExecutions = 0;
  let pendingExecutions = 0;
  let escalations = 0;
  let skippedExecutions = 0;
  let totalAmountAttemptedPaise = 0;
  let totalAmountRecoveredPaise = 0;

  for (const execution of executions) {
    const action = execution.action;
    const isSkipped = execution.status === "SKIPPED";
    const amountAtRisk = Number(execution.metadata?.amountAtRisk ?? execution.recoveredAmount ?? 0);

    if (isSkipped) {
      skippedExecutions += 1;
    } else {
      totalExecutionAttempts += 1;
      totalAmountAttemptedPaise += amountAtRisk;
    }

    if (recoveryRateByAction[action]) {
      if (!isSkipped) {
        recoveryRateByAction[action].attempts += 1;
      }
    }

    if (execution.status === "SUCCESS") {
      successfulRecoveries += 1;
      totalAmountRecoveredPaise += execution.recoveredAmount;
      if (recoveryRateByAction[action]) {
        recoveryRateByAction[action].successes += 1;
        recoveryRateByAction[action].recoveredPaise += execution.recoveredAmount;
      }
    } else if (execution.status === "FAILED") {
      failedExecutions += 1;
    } else if (execution.status === "PENDING") {
      pendingExecutions += 1;
    } else if (execution.status === "ESCALATED") {
      escalations += 1;
    }
  }

  for (const act of actions) {
    const stat = recoveryRateByAction[act];
    stat.recoveredINR = Math.round((stat.recoveredPaise / 100) * 100) / 100;
    stat.successRate =
      stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 10000) / 100 : 0;
  }

  const recoverySuccessRate =
    totalExecutionAttempts > 0
      ? Math.round((successfulRecoveries / totalExecutionAttempts) * 10000) / 100
      : 0;

  return {
    totalExecutionAttempts,
    successfulRecoveries,
    failedExecutions,
    pendingExecutions,
    escalations,
    skippedExecutions,
    totalAmountAttemptedPaise,
    totalAmountAttemptedINR: Math.round((totalAmountAttemptedPaise / 100) * 100) / 100,
    totalAmountRecoveredPaise,
    totalAmountRecoveredINR: Math.round((totalAmountRecoveredPaise / 100) * 100) / 100,
    recoverySuccessRate,
    recoveryRateByAction,
  };
}
