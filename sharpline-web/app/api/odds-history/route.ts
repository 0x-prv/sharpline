import { NextResponse } from "next/server";
import { getOddsHistory } from "../../../lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixtureId");
  const market = searchParams.get("market");
  const selection = searchParams.get("selection");
  const limit = Number(searchParams.get("limit") ?? 80);

  if (!fixtureId || !market) return NextResponse.json({ ticks: [] }, { status: 400 });

  const ticks = await getOddsHistory(fixtureId, market, Number.isFinite(limit) ? limit : 80, selection ?? undefined);
  return NextResponse.json({ ticks });
}
