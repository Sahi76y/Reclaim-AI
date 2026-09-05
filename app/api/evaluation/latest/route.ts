import { NextResponse } from "next/server";
import { getLatestEvaluationResult, runEvaluationEngine } from "@/server/evaluation/engine";

export async function GET() {
  try {
    let latest = getLatestEvaluationResult();
    if (!latest || latest.datasetSize < 1000) {
      latest = await runEvaluationEngine({ sampleSize: 1000, includeCaseRecords: true });
    }

    return NextResponse.json(
      {
        success: true,
        evaluation: latest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error retrieving latest evaluation result:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve latest evaluation result",
        code: "FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
