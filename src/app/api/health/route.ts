import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Uptime probe: confirms the app is running AND the database is reachable. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
