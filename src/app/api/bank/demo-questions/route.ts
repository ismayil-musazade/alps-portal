import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/authz";
import { installDemoBankQuestions } from "@/lib/demo-bank-questions";

/** Load the five sample questions into the skill tree. */
export async function POST() {
  const gate = await requireCapability("bank.manage");
  if (gate instanceof NextResponse) return gate;

  const result = await installDemoBankQuestions();
  return NextResponse.json({ ok: true, ...result });
}
