import prisma from "@/lib/prisma";
import { generateSyntheticRiskDataset, type PairedSyntheticRecord } from "./synthetic-generator";
import { persistLocalStore, calculateMetricsFromRecords } from "../risk-events/repository";

const DEFAULT_MERCHANT_ID = "merchant_default_reclaimai";
const DEFAULT_EVENT_COUNT = 1000;
const DEFAULT_SEED = 42;

export async function runSeed(
  count = DEFAULT_EVENT_COUNT,
  seed = DEFAULT_SEED,
  merchantId = DEFAULT_MERCHANT_ID
): Promise<void> {
  console.log("=================================================================");
  console.log("  ReclaimAI — Synthetic Revenue Risk Dataset Generator & Seed");
  console.log("=================================================================");
  console.log(`Config: ${count} events, Seed: ${seed}, Merchant: ${merchantId}`);
  console.log("Generating deterministic dataset...\n");

  const records: PairedSyntheticRecord[] = generateSyntheticRiskDataset(count, seed, merchantId);

  // Always persist local store file for zero-setup local dev / offline testing
  persistLocalStore(records);

  let dbPersisted = false;

  try {
    // Attempt database connection with short timeout
    await prisma.$connect();

    console.log("Connected to PostgreSQL database. Safely updating merchant & synthetic events...");

    // 1. Upsert default test merchant
    await prisma.merchant.upsert({
      where: { id: merchantId },
      update: {
        name: "Acme Payments Inc.",
        email: "merchant@reclaimai.test",
        safetyTier: "STRICT",
        maxAutoRecover: 5000000,
      },
      create: {
        id: merchantId,
        name: "Acme Payments Inc.",
        email: "merchant@reclaimai.test",
        safetyTier: "STRICT",
        maxAutoRecover: 5000000,
      },
    });

    // 2. Clear only synthetic events for this merchant
    await prisma.riskEvent.deleteMany({
      where: {
        merchantId,
        id: { startsWith: "evt_syn_" },
      },
    });

    // 3. Batch insert in chunks of 100 to stay performant
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      for (const { event, groundTruth } of chunk) {
        await prisma.riskEvent.create({
          data: {
            id: event.id,
            merchantId: event.merchantId,
            category: event.category,
            severity: event.severity,
            amountAtRisk: event.amountAtRisk,
            currency: event.currency,
            customerId: event.customerId,
            customerEmail: event.customerEmail,
            orderId: event.orderId,
            paymentMethod: event.paymentMethod,
            failureCode: event.failureCode,
            failureReason: event.failureReason,
            attemptNumber: event.attemptNumber,
            recoveryAttemptsCount: event.recoveryAttemptsCount,
            customerTier: event.customerTier,
            isSubscription: event.isSubscription,
            subscriptionPlanId: event.subscriptionPlanId,
            isRecoveryEligible: event.isRecoveryEligible,
            previousSuccessCount: event.previousSuccessCount,
            previousFailureCount: event.previousFailureCount,
            metadata: (event.metadata ?? {}) as object,
            createdAt: event.createdAt,
            groundTruth: {
              create: {
                isRecoverable: groundTruth.isRecoverable,
                recoverableAmount: groundTruth.recoverableAmount,
                expectedRecoveryAction: groundTruth.expectedRecoveryAction,
                simulatedOutcome: groundTruth.simulatedOutcome,
                simulatedRecoveryLatencyHours: groundTruth.simulatedRecoveryLatencyHours,
                evaluationNotes: groundTruth.evaluationNotes,
              },
            },
          },
        });
      }
    }

    dbPersisted = true;
    console.log(`✅ Successfully seeded ${records.length} records into PostgreSQL.`);
  } catch (err: unknown) {
    const error = err as Error;
    console.log("ℹ️ PostgreSQL database connection not available on localhost:5432.");
    console.log(`  Reason: ${error.message?.slice(0, 100) ?? "Connection refused"}`);
    console.log("  -> Saved 1,000 deterministic records to 'data/synthetic-risk-events.json'");
    console.log("  -> The API & repository layer will serve from this local store seamlessly.");
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  // Calculate dynamic metrics directly from generated records
  const metrics = calculateMetricsFromRecords(records, dbPersisted ? "database" : "local_store");

  // Format currency in INR (₹)
  const formatINR = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  console.log("\n-----------------------------------------------------------------");
  console.log("                     SEED SUMMARY REPORT                         ");
  console.log("-----------------------------------------------------------------");
  console.log(`Events generated:         ${metrics.totalEvents}`);
  console.log(
    `Total revenue at risk:    ${formatINR(metrics.totalAmountAtRiskINR)} (${metrics.totalAmountAtRiskPaise.toLocaleString()} paise)`
  );
  console.log(
    `Recoverable revenue:      ${formatINR(metrics.totalRecoverableAmountINR)} (${metrics.recoverablePercentage}% recoverable)`
  );
  console.log(`Non-recoverable revenue:  ${formatINR(metrics.totalNonRecoverableAmountINR)}`);
  console.log(`Persistence source:       ${metrics.source}`);
  console.log("\nBreakdown by event type:");

  for (const [catName, stats] of Object.entries(metrics.categoryBreakdown)) {
    const paddedName = catName.padEnd(28, " ");
    const paddedCount = `${stats.count} events`.padEnd(12, " ");
    const atRiskStr = formatINR(stats.amountAtRiskINR).padStart(14, " ");
    const recoverableStr = `(Recoverable: ${formatINR(stats.recoverableAmountINR)})`;
    console.log(`  • ${paddedName} : ${paddedCount} ${atRiskStr}  ${recoverableStr}`);
  }

  console.log("\nPayment Method Distribution:");
  for (const [method, count] of Object.entries(metrics.paymentMethodBreakdown)) {
    console.log(`  • ${method.padEnd(14, " ")}: ${count} transactions`);
  }
  console.log("-----------------------------------------------------------------\n");
}

// Execute when run directly via CLI
if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal seeding error:", err);
      process.exit(1);
    });
}
