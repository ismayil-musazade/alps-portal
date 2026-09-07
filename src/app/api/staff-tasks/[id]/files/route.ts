import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { ALLOWED_TYPES, MAX_FILE_BYTES, MAX_FILE_LABEL, staffTaskFilter } from "@/lib/staff-tasks";

/** Strip anything that could escape the task's folder or confuse a browser. */
function safeName(name: string) {
  return (name.split(/[\\/]/).pop() ?? "file")
    .replace(/[^\w.\- ]+/g, "_")
    .slice(0, 120) || "file";
}

/** The assignee (or a manager) attaches a file to the task. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const task = await db.staffTask.findFirst({
    where: { id, ...staffTaskFilter(gate) },
    select: { id: true, assignedToId: true, status: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isManager = can(gate.role, "stafftasks.assign");
  if (!isManager && task.assignedToId !== gate.id) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }

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
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File is too large — the limit is ${MAX_FILE_LABEL}` }, { status: 413 });
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "That file type is not accepted. Use a document, spreadsheet, PDF or image." },
      { status: 415 },
    );
  }

  const filename = safeName(file.name);
  const blob = await put(`staff-tasks/${task.id}/${filename}`, file, {
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

  // handing work in is the point of uploading, so move it along
  if (!isManager && task.status === "TODO") {
    await db.staffTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
  }

  return NextResponse.json({ ok: true, id: record.id });
}
