import { NextResponse } from "next/server";

import { getActiveQuoteOverlay } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const overlay = await getActiveQuoteOverlay();

  return NextResponse.json(
    {
      ok: true,
      data: overlay,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
