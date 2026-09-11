import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/authz";
import { installSatCurriculum } from "@/lib/install-curriculum";

/** Install (or refresh) the SAT skill tree. */
export async function POST() {
  const gate = await requireCapability("bank.manage");
  if (gate instanceof NextResponse) return gate;

  const result = await installSatCurriculum();
  return NextResponse.json({ ok: true, ...result });
}
