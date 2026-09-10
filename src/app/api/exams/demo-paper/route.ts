import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/authz";
import { installDemoPaper } from "@/lib/demo-placement-paper";

/** Put the demo placement paper in, or refresh it if it is already there. */
export async function POST() {
  const gate = await requireCapability("tests.manage");
  if (gate instanceof NextResponse) return gate;

  const paper = await installDemoPaper();
  return NextResponse.json({ ok: true, ...paper });
}
