import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { FileReviewSchema } from "@/lib/schemas";

/** Manager marks one uploaded file approved or needing revision. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const gate = await requireCapability("stafftasks.assign");
  if (gate instanceof NextResponse) return gate;

  const { fileId } = await params;
  const file = await db.staffTaskFile.findUnique({ where: { id: fileId }, select: { id: true } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = FileReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  await db.staffTaskFile.update({
    where: { id: fileId },
    data: {
      status: d.status,
      reviewNote: d.reviewNote || null,
      reviewedById: gate.id,
      reviewedAt: d.status === "PENDING" ? null : new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}

/** A manager may remove any file; the uploader only while it is still unreviewed. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { fileId } = await params;
  const file = await db.staffTaskFile.findUnique({
    where: { id: fileId },
    select: { id: true, url: true, uploadedById: true, status: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isManager = can(gate.role, "stafftasks.assign");
  if (!isManager && !(file.uploadedById === gate.id && file.status === "PENDING")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await del(file.url).catch(() => {});
  await db.staffTaskFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
