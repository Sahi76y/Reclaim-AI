import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import type {
  SyntheticGroundTruth,
  PairedSyntheticRecord,
} from "@/server/data/synthetic-generator";
import { isDatabaseAvailable } from "@/server/risk-events/repository";

const FALLBACK_DATA_PATH = path.join(process.cwd(), "data", "synthetic-risk-events.json");

/**
 * Dedicated Evaluation-Only Ground Truth Repository
 *
 * ARCHITECTURAL BOUNDARY:
 * - This file belongs exclusively to the evaluation/benchmark layer.
 * - Production operational modules (server/ai, server/policy, server/recovery)
 *   MUST NOT import or depend on this module.
 * - Ground truth is strictly retrieved AFTER production-style processing completes.
 */

let cachedGroundTruthMap: Map<string, SyntheticGroundTruth> | null = null;

function loadLocalGroundTruths(): Map<string, SyntheticGroundTruth> {
  if (cachedGroundTruthMap && cachedGroundTruthMap.size > 0) {
    return cachedGroundTruthMap;
  }

  const map = new Map<string, SyntheticGroundTruth>();

  try {
    if (fs.existsSync(FALLBACK_DATA_PATH)) {
      const content = fs.readFileSync(FALLBACK_DATA_PATH, "utf-8");
      const records = JSON.parse(content) as PairedSyntheticRecord[];
      for (const record of records) {
        if (record.groundTruth && record.event?.id) {
          map.set(record.event.id, record.groundTruth);
        }
      }
    }
  } catch (err) {
    console.warn("Could not read local ground-truth dataset:", err);
  }

  cachedGroundTruthMap = map;
  return map;
}

/**
 * Retrieves the ground-truth label for a single risk event.
 * STRICTLY FOR EVALUATION / BENCHMARK HARNESS ONLY.
 */
export async function getGroundTruthByEventId(
  riskEventId: string
): Promise<SyntheticGroundTruth | null> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const dbGt = await prisma.eventGroundTruth.findUnique({
        where: { riskEventId },
      });
      if (dbGt) {
        return {
          riskEventId: dbGt.riskEventId,
          isRecoverable: dbGt.isRecoverable,
          recoverableAmount: dbGt.recoverableAmount,
          expectedRecoveryAction: dbGt.expectedRecoveryAction,
          simulatedOutcome: dbGt.simulatedOutcome,
          simulatedRecoveryLatencyHours: dbGt.simulatedRecoveryLatencyHours ?? 0,
          evaluationNotes: dbGt.evaluationNotes ?? "",
        };
      }
    } catch {
      // Fall through to local fallback
    }
  }

  const localMap = loadLocalGroundTruths();
  return localMap.get(riskEventId) ?? null;
}

/**
 * Retrieves all ground-truth labels indexed by event ID.
 * STRICTLY FOR EVALUATION / BENCHMARK HARNESS ONLY.
 */
export async function getAllGroundTruths(): Promise<Map<string, SyntheticGroundTruth>> {
  const dbOnline = await isDatabaseAvailable();
  if (dbOnline) {
    try {
      const dbGts = await prisma.eventGroundTruth.findMany();
      if (dbGts.length > 0) {
        const map = new Map<string, SyntheticGroundTruth>();
        for (const dbGt of dbGts) {
          map.set(dbGt.riskEventId, {
            riskEventId: dbGt.riskEventId,
            isRecoverable: dbGt.isRecoverable,
            recoverableAmount: dbGt.recoverableAmount,
            expectedRecoveryAction: dbGt.expectedRecoveryAction,
            simulatedOutcome: dbGt.simulatedOutcome,
            simulatedRecoveryLatencyHours: dbGt.simulatedRecoveryLatencyHours ?? 0,
            evaluationNotes: dbGt.evaluationNotes ?? "",
          });
        }
        return map;
      }
    } catch {
      // Fall through to local fallback
    }
  }

  return loadLocalGroundTruths();
}

/**
 * Resets the in-memory cache for deterministic testing.
 */
export function resetGroundTruthCache(): void {
  cachedGroundTruthMap = null;
}
