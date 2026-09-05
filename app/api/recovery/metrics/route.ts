import { NextResponse } from "next/server";
import { getExecutionMetrics } from "@/server/risk-events/repository";

export async function GET() {
  try {
    const metrics = await getExecutionMetrics();
    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("Error retrieving execution metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve execution metrics",
        code: "METRICS_FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
