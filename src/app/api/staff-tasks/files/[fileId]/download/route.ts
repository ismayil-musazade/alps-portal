import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";

/** Shown inline in the browser; everything else downloads. */
const INLINE = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];

/**
 * Files live in a private blob store, so they are never reachable by URL alone.
 * Every byte is served through here, after the caller's access to the task is checked.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { fileId } = await params;
  const file = await db.staffTaskFile.findUnique({
    where: { id: fileId },
    include: { task: { select: { assignedToId: true } } },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!can(gate.role, "stafftasks.assign") && file.task.assignedToId !== gate.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(file.url, { access: "private" }).catch(() => null);
  if (!result) return NextResponse.json({ error: "File is no longer in storage" }, { status: 404 });

  const type = file.contentType || result.blob.contentType || "application/octet-stream";
  const disposition = INLINE.includes(type) ? "inline" : "attachment";
  // quotes and non-ASCII would break the header, so send an escaped ASCII name plus UTF-8
  const ascii = file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");

  return new Response(result.stream, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
