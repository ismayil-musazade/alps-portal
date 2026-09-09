import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { taskFolder } from "@/lib/uploads";

export {
  MAX_FILE_BYTES, MAX_FILE_LABEL, MULTIPART_ABOVE_BYTES, DIRECT_POST_LIMIT_BYTES,
  ALLOWED_TYPES, taskFolder, safeName, humanSize,
} from "@/lib/uploads";

export const TASK_STATUS_TONE: Record<string, "brand" | "ok" | "warn" | "risk" | "muted"> = {
  TODO: "muted",
  IN_PROGRESS: "brand",
  SUBMITTED: "warn",
  APPROVED: "ok",
  REJECTED: "risk",
};

export const FILE_STATUS_TONE: Record<string, "brand" | "ok" | "warn" | "risk" | "muted"> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "risk",
};

/** Managers see every task; everyone else sees only what is assigned to them. */
export function staffTaskFilter(user: { id: string; role: Role }) {
  return can(user.role, "stafftasks.assign") ? {} : { assignedToId: user.id };
}

/** Statuses the caller is allowed to move a task into. */
export function allowedStatuses(user: { id: string; role: Role }, assignedToId: string) {
  if (can(user.role, "stafftasks.assign")) {
    return ["TODO", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"];
  }
  // the assignee may work on it and hand it in, but never mark their own work approved
  return user.id === assignedToId ? ["TODO", "IN_PROGRESS", "SUBMITTED"] : [];
}

/**
 * May this person put a file into this task's folder?
 *
 * Kept out of the token route so it can be exercised on its own: the storage
 * library resolves its credentials before it hands control to the callback, so
 * a test running without storage credentials would otherwise never reach these
 * checks and would pass on the wrong error.
 */
export async function uploadRefusal(
  user: { id: string; role: Role } | null,
  taskId: string,
  pathname: string,
): Promise<string | null> {
  if (!user || !can(user.role, "stafftasks.own")) return "Not allowed";

  const task = await db.staffTask.findFirst({
    where: { id: taskId, ...staffTaskFilter(user) },
    select: { id: true, assignedToId: true },
  });
  if (!task) return "Not found";
  if (!can(user.role, "stafftasks.assign") && task.assignedToId !== user.id) return "Not your task";
  if (!pathname.startsWith(taskFolder(task.id))) return "Wrong folder";
  return null;
}

/** Load a task the caller is allowed to see, or null. */
export async function loadTask(user: { id: string; role: Role }, id: string) {
  return db.staffTask.findFirst({
    where: { id, ...staffTaskFilter(user) },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { name: true } },
      files: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
      parentTask: { select: { id: true, title: true, status: true } },
      followUps: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, title: true, status: true, dueAt: true,
          assignedTo: { select: { name: true } },
        },
      },
    },
  });
}

