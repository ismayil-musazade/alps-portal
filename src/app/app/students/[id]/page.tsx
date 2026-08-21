import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { canAccessStudent, isInternalRole } from "@/lib/scope";
import { studentMetrics } from "@/lib/metrics";
import { StatusBadge } from "@/components/ui";
import { GoalForm, NoteBox } from "@/components/student-controls";
import { AssignTasksPanel, TasksTable, SkillsPanel, type TaskDTO } from "@/components/task-controls";

export const dynamic = "force-dynamic";

const STATUS_TONE = { ACTIVE: "ok", FROZEN: "warn", COMPLETED: "muted", DROPPED: "risk", WAITING_GROUP: "warn" } as const;
const WARN_TONE = { green: "ok", yellow: "warn", red: "risk" } as const;
const WARN_LABEL = { green: "On track", yellow: "Needs attention", red: "At risk" } as const;

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-black/5 py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-ink/50">{label}</span>
      <span className="text-right font-medium whitespace-pre-wrap">{value || "—"}</span>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      {title && <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">{title}</h3>}
      {children}
    </div>
  );
}

export default async function StudentProfile({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!(await canAccessStudent(user, id))) redirect("/app");

  const internal = isInternalRole(user.role);
  const { tab: rawTab } = await searchParams;
  const tabs = internal
    ? ["overview", "background", "goals", "tasks", "exams", "attendance", "report", "notes"]
    : ["overview", "goals", "tasks", "exams", "attendance", "report"];
  const tab = tabs.includes(rawTab ?? "") ? (rawTab as string) : "overview";

  const student = await db.studentProfile.findUnique({
    where: { id },
    include: {
      enrollments: { include: { course: true, group: true, teacher: { select: { name: true } } }, orderBy: { startDate: "desc" } },
      goals: { orderBy: { updatedAt: "desc" } },
      tasks: { orderBy: [{ assignedAt: "desc" }] },
      exams: { orderBy: { examDate: "desc" } },
      attendance: { orderBy: { lessonDate: "desc" }, take: 60, include: { group: { select: { name: true } } } },
      reportCards: { orderBy: { period: "desc" }, ...(internal ? {} : { where: { publishedAt: { not: null } } }) },
    },
  });
  if (!student) notFound();

  const m = await studentMetrics(id);
  const activeEnrollment = student.enrollments.find((e) => e.status === "ACTIVE");

  const canEditAcademicsEarly = can(user.role, "academics.edit");
  const [templates, skillRows] = await Promise.all([
    canEditAcademicsEarly
      ? db.taskTemplate.findMany({ orderBy: [{ courseType: "asc" }, { defaultOrder: "asc" }] })
      : Promise.resolve([]),
    db.studentSkillStatus.findMany({ where: { studentId: id }, orderBy: { skill: "asc" } }),
  ]);

  const taskDTOs: TaskDTO[] = student.tasks.map((t) => ({
    id: t.id, title: t.title, category: t.category, status: t.status,
    teacherApproved: t.teacherApproved, score: t.score, scoreMax: t.scoreMax,
    comment: t.comment ?? "", mistakeReviewDone: t.mistakeReviewDone,
    deadline: t.deadline?.toLocaleDateString("en-GB") ?? "",
    deadlineISO: t.deadline?.toISOString().slice(0, 10) ?? "",
  }));
  const taskMode = canEditAcademicsEarly ? "editor" as const
    : user.role === "STUDENT" ? "student" as const
    : "readonly" as const;
  const defaultCourseType = activeEnrollment?.course.type ?? "SAT";

  // internal notes: visibility rules (manager sees all; staff: STAFF+TEACHER; teacher: TEACHER)
  const notes = internal
    ? await db.internalNote.findMany({
        where: {
          studentId: id,
          ...(user.role === "MANAGER" ? {} :
            user.role === "STAFF" ? { visibility: { in: ["STAFF", "TEACHER"] } } :
            { visibility: "TEACHER" }),
        },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, role: true } } },
      })
    : [];

  const canEditAcademics = can(user.role, "academics.edit");
  const canEditStudent = can(user.role, "students.edit");

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {internal && <Link href="/app/students" className="text-sm text-ink/50 hover:text-brand">← Students</Link>}
        <h1 className="text-2xl font-extrabold">{student.fullName}</h1>
        <StatusBadge value={student.status} tone={STATUS_TONE[student.status]} />
        <StatusBadge value={WARN_LABEL[m.warning]} tone={WARN_TONE[m.warning]} />
        {canEditStudent && (
          <Link href={`/app/students/${id}/edit`} className="ml-auto rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
            Edit details
          </Link>
        )}
      </div>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-black/10">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/app/students/${id}?tab=${t}`}
            className={`rounded-t-lg px-3.5 py-2 text-sm font-semibold capitalize ${
              tab === t ? "border border-b-0 border-black/10 bg-white text-brand" : "text-ink/50 hover:text-ink"
            }`}
          >
            {t === "report" ? "Report card" : t}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "overview" && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                ["Target", m.goal?.targetOverall ?? "—"],
                ["Latest exam", m.latestExam?.totalScore ?? "—"],
                ["Attendance", m.attendancePct != null ? `${m.attendancePct}%` : "—"],
                ["Tasks approved", m.taskPct != null ? `${m.taskPct}%` : "—"],
                ["Avg quality", m.avgQuality != null ? `${m.avgQuality}/5` : "—"],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="text-xl font-extrabold">{v as string}</div>
                  <div className="text-xs text-ink/50">{l as string}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Course">
                <Row label="Course" value={activeEnrollment?.course.name} />
                <Row label="Group" value={activeEnrollment?.group?.name} />
                <Row label="Teacher" value={activeEnrollment?.teacher?.name} />
                <Row label="Start date" value={student.startDate?.toLocaleDateString("en-GB")} />
                <Row label="Progress since placement" value={m.placement && m.latestExam && m.placement.id !== m.latestExam.id ? `${m.placement.totalScore} → ${m.latestExam.totalScore}` : "—"} />
              </Card>
              <Card title="Contact">
                <Row label="Student phone" value={student.phone} />
                <Row label="Parent" value={student.parentName} />
                <Row label="Parent phone" value={student.parentPhone} />
                <Row label="School" value={student.school} />
                <Row label="Grade" value={student.gradeLevel} />
              </Card>
            </div>
          </div>
        )}

        {tab === "background" && internal && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Level & history">
              <Row label="Current level" value={student.currentLevel} />
              <Row label="Previous scores" value={student.previousScores} />
            </Card>
            <Card title="Profile notes">
              <Row label="Strengths" value={student.strengths} />
              <Row label="Weaknesses" value={student.weaknesses} />
              <Row label="Learning notes" value={student.learningNotes} />
            </Card>
          </div>
        )}

        {tab === "goals" && (
          <div className="space-y-4">
            {canEditAcademics && <GoalForm studentId={id} />}
            {student.goals.map((g) => (
              <Card key={g.id} title={`${g.courseType.replaceAll("_", " ")} goal`}>
                <Row label="Target overall" value={g.targetOverall} />
                <Row label="Target exam date" value={g.targetExamDate?.toLocaleDateString("en-GB")} />
                {g.subTargets && Object.entries(g.subTargets as Record<string, string>).map(([k, v]) => (
                  <Row key={k} label={k} value={v} />
                ))}
                {g.notes && <Row label="Notes" value={g.notes} />}
              </Card>
            ))}
            {!student.goals.length && <p className="py-6 text-center text-sm text-ink/40">No goals set yet.</p>}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-4">
            {canEditAcademics && (
              <AssignTasksPanel
                studentId={id}
                templates={templates.map((t) => ({ id: t.id, title: t.title, category: t.category, courseType: t.courseType }))}
                assignedTemplateIds={student.tasks.map((t) => t.templateId).filter(Boolean) as string[]}
                defaultCourseType={defaultCourseType}
              />
            )}
            <TasksTable tasks={taskDTOs} mode={taskMode} />
            <SkillsPanel
              studentId={id}
              courseType={defaultCourseType}
              skills={skillRows.map((r) => ({ skill: r.skill, status: r.status }))}
              editable={canEditAcademics}
            />
          </div>
        )}

        {tab === "exams" && (
          <div className="space-y-3">
            {student.exams.map((e) => (
              <Card key={e.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge value={e.examType} tone={e.examType === "PLACEMENT" ? "muted" : e.examType === "FINAL" ? "brand" : "warn"} />
                  <span className="font-bold">{e.courseType.replaceAll("_", " ")}</span>
                  <span className="text-sm text-ink/50">{e.examDate.toLocaleDateString("en-GB")}</span>
                  <span className="ml-auto text-xl font-extrabold text-brand">{e.totalScore}</span>
                </div>
                {e.sectionScores && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(e.sectionScores as Record<string, string | number>).map(([k, v]) => (
                      <span key={k} className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold">{k}: {String(v)}</span>
                    ))}
                  </div>
                )}
                {e.teacherComment && <p className="mt-2 text-sm text-ink/70">{e.teacherComment}</p>}
                {e.recommendedAction && <p className="mt-1 text-sm"><span className="font-semibold">Next:</span> {e.recommendedAction}</p>}
              </Card>
            ))}
            {!student.exams.length && <p className="py-6 text-center text-sm text-ink/40">No exams recorded yet.</p>}
          </div>
        )}

        {tab === "attendance" && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Summary">
              <div className="text-3xl font-extrabold">{m.attendancePct != null ? `${m.attendancePct}%` : "—"}</div>
              <p className="text-sm text-ink/50">{m.absences} absence(s) · {student.attendance.length} lessons recorded</p>
            </Card>
            <div className="md:col-span-2 overflow-x-auto rounded-xl border border-black/10 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-paper text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Group</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {student.attendance.map((a) => (
                    <tr key={a.id} className="border-t border-black/5">
                      <td className="px-4 py-2">{a.lessonDate.toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-2 text-ink/60">{a.group.name}</td>
                      <td className="px-4 py-2">
                        <StatusBadge value={a.status} tone={a.status === "PRESENT" ? "ok" : a.status === "LATE" ? "warn" : "risk"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "report" && (
          <div className="space-y-4">
            {student.reportCards.map((r) => (
              <Card key={r.id} title={`Period ${r.period}${r.publishedAt ? "" : " · DRAFT (not visible to student/parent)"}`}>
                {r.metrics && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {Object.entries(r.metrics as Record<string, string | number>).map(([k, v]) => (
                      <span key={k} className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold">{k}: {String(v)}</span>
                    ))}
                  </div>
                )}
                <Row label="Strengths" value={r.strengths} />
                <Row label="Weaknesses" value={r.weaknesses} />
                <Row label="Next target" value={r.nextTarget} />
                {r.teacherComment && <p className="mt-2 border-t border-black/5 pt-2 text-sm text-ink/70">{r.teacherComment}</p>}
              </Card>
            ))}
            {!student.reportCards.length && <p className="py-6 text-center text-sm text-ink/40">No report cards yet.</p>}
          </div>
        )}

        {tab === "notes" && internal && (
          <div className="space-y-3">
            {can(user.role, "notes.internal.edit") && (
              <NoteBox studentId={id} canManagerOnly={user.role === "MANAGER"} />
            )}
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{n.author.name} <span className="font-normal text-ink/40">· {n.author.role.toLowerCase()}</span></span>
                  <span className="text-xs text-ink/40">
                    {n.visibility.replaceAll("_", " ").toLowerCase()} · {n.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-0.5 text-ink/80">{n.body}</p>
              </div>
            ))}
            {!notes.length && <p className="py-6 text-center text-sm text-ink/40">No internal notes.</p>}
          </div>
        )}
      </div>
    </>
  );
}
