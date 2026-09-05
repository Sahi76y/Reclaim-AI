import { NextRequest, NextResponse } from "next/server";
import { getRiskEventSummary } from "@/server/risk-events/repository";

/**
 * GET /api/risk-events/summary
 *
 * Returns aggregate metrics from seeded / ingested revenue-risk events.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId") || undefined;

    const summary = await getRiskEventSummary(merchantId);

    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating risk events summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve risk events summary",
      },
      { status: 500 }
    );
  }
}
