import { type NextRequest, NextResponse } from "next/server";
import { getBoard, getSectors, getBreadth, minuteBucket, type Side } from "@/lib/fakeData";
import { fyersBoardPayload } from "@/lib/feed/fyers";

// The board's data seam: real Fyers quotes when connected, else synthetic in
// the same shape. Screen code never changes.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const side: Side = new URL(req.url).searchParams.get("side") === "bear" ? "bear" : "bull";

  const live = await fyersBoardPayload(side);
  if (live) return NextResponse.json(live);

  const bucket = minuteBucket();
  return NextResponse.json({
    source: "synthetic",
    side,
    rows: getBoard(side, bucket),
    sectors: getSectors(bucket),
    breadth: getBreadth(bucket),
  });
}
