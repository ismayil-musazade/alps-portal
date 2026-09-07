import { z } from "zod";

/** Shared zod schemas — every write endpoint validates against these.
 *  .strict() rejects any field not listed (anti-tampering). */

export const LeadCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  parentName: z.string().trim().max(120).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(30).optional().or(z.literal("")),
  school: z.string().trim().max(160).optional().or(z.literal("")),
  gradeLevel: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.enum(["INSTAGRAM", "WHATSAPP", "REFERRAL", "WALK_IN", "PHONE_CALL", "WEBSITE", "OTHER"]),
  interestedCourse: z.enum(["IELTS", "SAT", "GENERAL_ENGLISH", "OTHER"]).optional().or(z.literal("")),
  currentLevel: z.string().trim().max(60).optional().or(z.literal("")),
  targetScore: z.string().trim().max(60).optional().or(z.literal("")),
  preferredSchedule: z.string().trim().max(120).optional().or(z.literal("")),
  groupPreference: z.string().trim().max(40).optional().or(z.literal("")),
  responsibleStaffId: z.string().trim().optional().or(z.literal("")),
  nextFollowUpAt: z.string().optional().or(z.literal("")), // yyyy-mm-dd
  lastContactNote: z.string().trim().max(2000).optional().or(z.literal("")),
  followUpNote: z.string().trim().max(2000).optional().or(z.literal("")),
}).strict();

export const LeadUpdateSchema = LeadCreateSchema.partial().extend({
  status: z.enum([
    "NEW", "CONTACTED", "PLACEMENT_BOOKED", "PLACEMENT_DONE",
    "TRIAL_BOOKED", "INTERESTED", "WAITING_DECISION", "CONVERTED", "LOST",
  ]).optional(),
  lostReason: z.string().trim().max(500).optional().or(z.literal("")),
}).strict();

export const ActivityCreateSchema = z.object({
  type: z.enum(["NOTE", "CALL", "FOLLOW_UP"]),
  body: z.string().trim().min(1).max(2000),
}).strict();

export const ReminderCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  dueAt: z.string().min(8), // yyyy-mm-dd or full ISO
  assignedToId: z.string().trim().optional().or(z.literal("")),
  leadId: z.string().trim().optional().or(z.literal("")),
  studentId: z.string().trim().optional().or(z.literal("")),
}).strict();

export const ReminderUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  dueAt: z.string().min(8).optional(),
  status: z.enum(["OPEN", "DONE", "DISMISSED"]).optional(),
}).strict();

export const StaffTaskCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  assignedToId: z.string().trim().min(1),
  dueAt: z.string().optional().or(z.literal("")),
}).strict();

export const StaffTaskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  assignedToId: z.string().trim().min(1).optional(),
  dueAt: z.string().optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
  managerNote: z.string().trim().max(2000).optional().or(z.literal("")),
}).strict();

export const FileReviewSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal("")),
}).strict();

/** Turn "" → undefined and "yyyy-mm-dd" → Date for optional fields */
export function emptyToNull<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}
