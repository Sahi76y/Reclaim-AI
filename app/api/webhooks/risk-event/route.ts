import { NextRequest, NextResponse } from "next/server";
import { riskEventIngestionSchema } from "@/lib/validations/risk-event";
import { createRiskEvent } from "@/server/risk-events/repository";

/**
 * POST /api/webhooks/risk-event
 *
 * Synthetic & Development Webhook Ingestion Endpoint for Revenue-at-Risk Events.
 * NOTE: Razorpay cryptographic webhook signature verification will be implemented in Step 5.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parseResult = riskEventIngestionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Malformed or invalid risk-event payload",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const eventInput = parseResult.data;

    const result = await createRiskEvent(eventInput);

    return NextResponse.json(
      {
        success: true,
        message: "Risk event ingested successfully (Synthetic/Dev Mode)",
        eventId: result.event.id,
        persistedVia: result.persistedVia,
        category: result.event.category,
        amountAtRisk: result.event.amountAtRisk,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Risk event ingestion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during event ingestion",
      },
      { status: 500 }
    );
  }
}
