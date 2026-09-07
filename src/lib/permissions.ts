/**
 * Role capability matrix — single source of truth (Build Brief §16).
 * Every API route checks `can(role, capability)` BEFORE touching data,
 * and additionally scopes queries to the caller's own records
 * (teacher → assigned groups, parent → linked children, student → self).
 */
import type { Role } from "@prisma/client";

export type Capability =
  | "users.manage"
  | "groups.manage" | "groups.view"
  | "leads.view" | "leads.edit"
  | "students.view.all" | "students.view.assigned" | "students.view.own" | "students.view.child"
  | "students.edit"
  | "academics.edit"      // scores, exams, tasks ticking — teacher (assigned) + manager
  | "academics.view"
  | "attendance.mark"
  | "reports.edit" | "reports.view"
  | "notes.internal.view" | "notes.internal.edit"
  | "reminders.use" | "reminders.assign.others"
  | "stafftasks.assign" | "stafftasks.own"
  | "tests.manage" | "tests.take"
  | "website.edit";

const matrix: Record<Role, Capability[]> = {
  MANAGER: [
    "users.manage", "groups.manage", "groups.view", "leads.view", "leads.edit",
    "students.view.all", "students.edit",
    "academics.edit", "academics.view",
    "attendance.mark", "reports.edit", "reports.view",
    "notes.internal.view", "notes.internal.edit",
    "reminders.use", "reminders.assign.others",
    "stafftasks.assign", "stafftasks.own",
    "tests.manage", "website.edit",
  ],
  STAFF: [
    "groups.view",
    "leads.view", "leads.edit",
    "students.view.all", "students.edit",
    "academics.view", "reports.view",
    "notes.internal.view", "notes.internal.edit",
    "reminders.use", "stafftasks.own",
    "tests.manage", "website.edit",
  ],
  TEACHER: [
    "students.view.assigned",
    "academics.edit", "academics.view",
    "attendance.mark", "reports.edit", "reports.view",
    "notes.internal.view", "notes.internal.edit",
    "reminders.use", "stafftasks.own",
  ],
  STUDENT: ["students.view.own", "academics.view", "reports.view", "tests.take"],
  PARENT: ["students.view.child", "academics.view", "reports.view"],
};

export function can(role: Role, capability: Capability): boolean {
  return matrix[role].includes(capability);
}

/** Roles allowed into the app shell at all */
export const APP_ROLES: Role[] = ["MANAGER", "STAFF", "TEACHER", "STUDENT", "PARENT"];
