import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { MessageCreateSchema } from "@/lib/schemas";
import { STAFF_ROLES } from "@/lib/messages";

/** Send a message to a colleague. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("messages.use");
  if (gate instanceof NextResponse) return gate;

  const parsed = MessageCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { recipientId, body } = parsed.data;

  if (recipientId === gate.id) {
    return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  }

  const recipient = await db.user.findFirst({
    where: { id: recipientId, status: "ACTIVE", role: { in: [...STAFF_ROLES] } },
    select: { id: true },
  });
  if (!recipient) return NextResponse.json({ error: "Unknown recipient" }, { status: 400 });

  const message = await db.message.create({
    data: { senderId: gate.id, recipientId, body },
  });
  return NextResponse.json({ ok: true, id: message.id });
}
