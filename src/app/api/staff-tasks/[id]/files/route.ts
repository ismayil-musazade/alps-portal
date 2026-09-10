import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { head, put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { FileConfirmSchema } from "@/lib/schemas";
import {
  ALLOWED_TYPES, MAX_FILE_BYTES, MAX_FILE_LABEL, DIRECT_POST_LIMIT_BYTES,
  safeName, staffTaskFilter, taskFolder,
} from "@/lib/staff-tasks";

/** Resolve the task and confirm the caller is allowed to attach to it. */
async function openTask(gate: { id: string; role: Role }, id: string) {
  const task = await db.staffTask.findFirst({
    where: { id, ...staffTaskFilter(gate) },
    select: { id: true, assignedToId: true, status: true },
  });
  if (!task) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const isManager = can(gate.role, "stafftasks.assign");
  if (!isManager && task.assignedToId !== gate.id) {
    return { error: NextResponse.json({ error: "Not your task" }, { status: 403 }) };
  }
  return { task, isManager };
}

/** Handing work in is the point of uploading, so move the task along. */
async function advance(task: { id: string; status: string }, isManager: boolean) {
  if (!isManager && task.status === "TODO") {
    await db.staffTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
  }
}

/**
 * Two ways in:
 *
 *  - JSON `{ url, filename }` — the browser has already uploaded straight to
 *    storage and is telling us where it landed. Nothing it says is believed:
 *    the size, type and folder all come back from storage via head().
 *  - multipart form data — the original path, kept as a fallback for small
 *    files in case a browser or network cannot do the direct upload.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const opened = await openTask(gate, id);
  if (opened.error) return opened.error;
  const { task, isManager } = opened;

  const contentType = req.headers.get("content-type") ?? "";

  // ---------- confirm a direct-to-storage upload ----------
  if (contentType.includes("application/json")) {
    const parsed = FileConfirmSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const meta = await head(parsed.data.url).catch(() => null);
    if (!meta) return NextResponse.json({ error: "That upload was not found" }, { status: 404 });

    // the token was scoped to this folder, but check the result too
    if (!meta.pathname.startsWith(taskFolder(task.id))) {
      await del(parsed.data.url).catch(() => {});
      return NextResponse.json({ error: "That file does not belong to this task" }, { status: 403 });
    }
    if (meta.size > MAX_FILE_BYTES) {
      await del(parsed.data.url).catch(() => {});
      return NextResponse.json({ error: `File is too large — the limit is ${MAX_FILE_LABEL}` }, { status: 413 });
    }
    if (meta.contentType && !ALLOWED_TYPES.includes(meta.contentType)) {
      await del(parsed.data.url).catch(() => {});
      return NextResponse.json({ error: "That file type is not accepted." }, { status: 415 });
    }

    const already = await db.staffTaskFile.findFirst({
      where: { url: parsed.data.url },
      select: { id: true },
    });
    if (already) return NextResponse.json({ ok: true, id: already.id });

    const record = await db.staffTaskFile.create({
      data: {
        taskId: task.id,
        filename: safeName(parsed.data.filename),
        url: parsed.data.url,
        pathname: meta.pathname,
        size: meta.size,
        contentType: meta.contentType || null,
        uploadedById: gate.id,
      },
    });
    await advance(task, isManager);
    return NextResponse.json({ ok: true, id: record.id });
  }

  // ---------- fallback: the file travels through this function ----------
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  if (file.size > DIRECT_POST_LIMIT_BYTES) {
    return NextResponse.json(
      { error: "This file has to go straight to storage — reload the page and try again." },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "That file type is not accepted. Use a document, spreadsheet, PDF or image." },
      { status: 415 },
    );
  }

  const filename = safeName(file.name);
  const blob = await put(`${taskFolder(task.id)}${filename}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  const record = await db.staffTaskFile.create({
    data: {
      taskId: task.id,
      filename,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type || null,
      uploadedById: gate.id,
    },
  });
  await advance(task, isManager);
  return NextResponse.json({ ok: true, id: record.id });
}
