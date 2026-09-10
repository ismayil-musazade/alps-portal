import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Record-level access control (the "lock record access" rule).
 * Answers: may THIS user open THIS student?
 *  - manager/staff: any student
 *  - teacher: only students in their groups / enrollments
 *  - student: only their own profile
 *  - parent: only linked children
 */
export async function canAccessStudent(
  user: { id: string; role: Role },
  studentId: string
): Promise<boolean> {
  switch (user.role) {
    case "MANAGER":
    case "STAFF":
      return true;
    case "TEACHER": {
      const n = await db.enrollment.count({
        where: {
          studentId,
          OR: [{ teacherId: user.id }, { group: { teacherId: user.id } }],
        },
      });
      return n > 0;
    }
    case "STUDENT": {
      const p = await db.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      return p?.id === studentId;
    }
    case "PARENT": {
      const n = await db.parentLink.count({ where: { parentUserId: user.id, studentId } });
      return n > 0;
    }
    case "EXAM_SEAT":
      return false;
  }
}

/** Prisma filter for listing students this user may see. */
export function studentListFilter(user: { id: string; role: Role }) {
  switch (user.role) {
    case "MANAGER":
    case "STAFF":
      return {};
    case "TEACHER":
      return {
        enrollments: {
          some: { OR: [{ teacherId: user.id }, { group: { teacherId: user.id } }] },
        },
      };
    case "STUDENT":
      return { userId: user.id };
    case "PARENT":
      return { parentLinks: { some: { parentUserId: user.id } } };
    case "EXAM_SEAT":
      // matches nothing: a seat has no business listing students
      return { id: "" };
  }
}

/** Internal-facing roles may see internal notes; students/parents never. */
export function isInternalRole(role: Role) {
  return role === "MANAGER" || role === "STAFF" || role === "TEACHER";
}
