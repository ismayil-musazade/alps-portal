import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

/** Vercel caps a serverless request body at ~4.5 MB, so the file must fit in one. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_LABEL = "4 MB";

/** Office documents and images. Executables and scripts are deliberately absent. */
export const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

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
    },
  });
}

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
