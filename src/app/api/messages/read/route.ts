import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const Schema = z.object({ withUserId: z.string().trim().min(1) }).strict();

/** Mark everything that person has sent you as read. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("messages.use");
  if (gate instanceof NextResponse) return gate;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await db.message.updateMany({
    where: { recipientId: gate.id, senderId: parsed.data.withUserId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
