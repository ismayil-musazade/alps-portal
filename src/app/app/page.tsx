import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { studentMetrics } from "@/lib/metrics";
import { studentListFilter } from "@/lib/scope";
import { StatusBadge, LEAD_STATUS_TONE } from "@/components/ui";
import {
  lowAttendance, missingTasks, belowTarget, staleProgress,
  incompleteDetails, upcomingExams, type StudentAlert,
} from "@/lib/alerts";

export const dynamic = "force-dynamic";

/* ---------- shared bits ---------- */

function Stat({ label, value, tone, href }: { label: string; value: string | number; tone?: "ok" | "warn" | "risk"; href?: string }) {
  const toneCls = tone === "risk" ? "text-risk" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  const inner = (
    <>
      <div className={`text-2xl font-extrabold ${toneCls}`}>{value}</div>
      <div className="text-sm text-ink/60">{label}</div>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-black/10 bg-white p-4 transition hover:border-brand/40 hover:shadow-sm">{inner}</Link>
  ) : (
    <div className="rounded-xl border border-black/10 bg-white p-4">{inner}</div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Alert list — every row links to the student profile. */
function AlertList({ items, empty }: { items: StudentAlert[]; empty: string }) {
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-center text-sm text-ink/40">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
      {items.map((a) => (
        <li key={`${a.id}-${a.detail}`}>
          <Link href={`/app/students/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
            <span className="font-semibold">{a.name}</span>
            <span className={`text-right text-xs font-medium ${a.tone === "risk" ? "text-risk" : "text-warn"}`}>{a.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- manager ---------- */

async function ManagerDashboard() {
  const scope = {};
  const [students, waiting, openLeads, dueLeads, teachers, attendance, missing, below, stale, exams] = await Promise.all([
    db.studentProfile.count({ where: { status: "ACTIVE" } }),
    db.studentProfile.count({ where: { status: "WAITING_GROUP" } }),
    db.lead.count({ where: { status: { notIn: ["CONVERTED", "LOST"] } } }),
    db.lead.findMany({
      where: { nextFollowUpAt: { lte: new Date(Date.now() + 3 * 86400_000) }, status: { notIn: ["CONVERTED", "LOST"] } },
      orderBy: { nextFollowUpAt: "asc" }, take: 6,
      include: { responsibleStaff: { select: { name: true } } },
    }),
    db.user.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
    lowAttendance(scope), missingTasks(scope), belowTarget(scope), staleProgress(scope), upcomingExams(scope),
  ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">Manager Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Active students" value={students} href="/app/students?status=ACTIVE" />
        <Stat label="Waiting for a group" value={waiting} tone={waiting ? "warn" : undefined} href="/app/students?status=WAITING_GROUP" />
        <Stat label="Open leads" value={openLeads} href="/app/leads" />
        <Stat label="Follow-ups due" value={dueLeads.length} tone={dueLeads.length ? "warn" : "ok"} href="/app/leads?due=1" />
        <Stat label="Teachers" value={teachers} href="/app/users" />
      </div>

      <div className="grid gap-x-6 md:grid-cols-2">
        <Section title="Low attendance"><AlertList items={attendance} empty="Everyone above 80%." /></Section>
        <Section title="Missing / overdue tasks"><AlertList items={missing} empty="No overdue tasks." /></Section>
        <Section title="Below target"><AlertList items={below} empty="No one behind target." /></Section>
        <Section title="No progress updates (21 days)"><AlertList items={stale} empty="All students updated recently." /></Section>
        <Section title="Upcoming target exam dates"><AlertList items={exams} empty="No exam dates in the next 60 days." /></Section>
        <Section title="Leads needing follow-up" action={<Link href="/app/leads?due=1" className="text-xs font-bold text-brand hover:underline">view all</Link>}>
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
            {dueLeads.map((l) => (
              <li key={l.id}>
                <Link href={`/app/leads/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                  <span className="font-semibold">{l.fullName}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge value={l.status} tone={LEAD_STATUS_TONE[l.status]} />
                    <span className="text-xs text-ink/50">{l.nextFollowUpAt?.toLocaleDateString("en-GB")}</span>
                  </span>
                </Link>
              </li>
            ))}
            {!dueLeads.length && <li className="px-4 py-5 text-center text-sm text-ink/40">Nothing due.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}

/* ---------- staff ---------- */

async function StaffDashboard({ userId }: { userId: string }) {
  const [newLeads, myLeads, placement, converted, lost, incomplete] = await Promise.all([
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.findMany({
      where: { responsibleStaffId: userId, status: { notIn: ["CONVERTED", "LOST"] } },
      orderBy: { nextFollowUpAt: { sort: "asc", nulls: "last" } }, take: 8,
    }),
    db.lead.findMany({ where: { status: { in: ["PLACEMENT_BOOKED", "TRIAL_BOOKED"] } }, orderBy: { nextFollowUpAt: "asc" }, take: 6 }),
    db.lead.count({ where: { status: "CONVERTED" } }),
    db.lead.count({ where: { status: "LOST" } }),
    incompleteDetails(),
  ]);

  const overdue = myLeads.filter((l) => l.nextFollowUpAt && l.nextFollowUpAt <= new Date()).length;

  return (
    <>
      <h1 className="text-2xl font-extrabold">Staff Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="New leads" value={newLeads} tone={newLeads ? "warn" : "ok"} href="/app/leads?status=NEW" />
        <Stat label="My open leads" value={myLeads.length} href="/app/leads" />
        <Stat label="Overdue follow-ups" value={overdue} tone={overdue ? "risk" : "ok"} href="/app/leads?due=1" />
        <Stat label="Converted" value={converted} tone="ok" href="/app/leads?status=CONVERTED" />
        <Stat label="Lost" value={lost} href="/app/leads?status=LOST" />
      </div>

      <div className="grid gap-x-6 md:grid-cols-2">
        <Section title="My leads by next follow-up">
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
            {myLeads.map((l) => {
              const late = l.nextFollowUpAt && l.nextFollowUpAt <= new Date();
              return (
                <li key={l.id}>
                  <Link href={`/app/leads/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                    <span>
                      <span className="font-semibold">{l.fullName}</span>
                      <span className="block text-xs text-ink/50">{l.lastContactNote ?? "no note yet"}</span>
                    </span>
                    <span className="text-right">
                      <span className={`block text-xs font-bold ${late ? "text-risk" : "text-ink/60"}`}>
                        {l.nextFollowUpAt?.toLocaleDateString("en-GB") ?? "—"}
                      </span>
                      <StatusBadge value={l.status} tone={LEAD_STATUS_TONE[l.status]} />
                    </span>
                  </Link>
                </li>
              );
            })}
            {!myLeads.length && <li className="px-4 py-5 text-center text-sm text-ink/40">No open leads.</li>}
          </ul>
        </Section>

        <Section title="Placement / trial booked">
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
            {placement.map((l) => (
              <li key={l.id}>
                <Link href={`/app/leads/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                  <span className="font-semibold">{l.fullName}</span>
                  <span className="text-xs text-ink/50">{l.nextFollowUpAt?.toLocaleDateString("en-GB") ?? "no date"}</span>
                </Link>
              </li>
            ))}
            {!placement.length && <li className="px-4 py-5 text-center text-sm text-ink/40">Nothing booked.</li>}
          </ul>
        </Section>

        <Section title="Student details to complete">
          <AlertList items={incomplete} empty="All student records complete." />
        </Section>
      </div>
    </>
  );
}

/* ---------- teacher ---------- */

async function TeacherDashboard({ userId }: { userId: string }) {
  const scope = studentListFilter({ id: userId, role: "TEACHER" });
  const groups = await db.group.findMany({
    where: { teacherId: userId, status: "ACTIVE" },
    include: {
      course: true,
      enrollments: { where: { status: "ACTIVE" }, include: { student: { select: { id: true, fullName: true } } } },
    },
  });
  const studentIds = groups.flatMap((g) => g.enrollments.map((e) => e.studentId));

  const [toCheck, attendance, missing, stale, exams, todayMarked] = await Promise.all([
    db.studentTask.findMany({
      where: { studentId: { in: studentIds }, status: "SUBMITTED", teacherApproved: false },
      include: { student: { select: { id: true, fullName: true } } },
      take: 8,
    }),
    lowAttendance(scope), missingTasks(scope), staleProgress(scope), upcomingExams(scope),
    db.attendance.count({
      where: { groupId: { in: groups.map((g) => g.id) }, lessonDate: new Date(new Date().toISOString().slice(0, 10)) },
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">Teacher Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="My groups" value={groups.length} />
        <Stat label="My students" value={studentIds.length} href="/app/students" />
        <Stat label="Tasks to check" value={toCheck.length} tone={toCheck.length ? "warn" : "ok"} />
        <Stat label="Attendance marked today" value={todayMarked} tone={todayMarked ? "ok" : "warn"} href="/app/attendance" />
      </div>

      <Section title="My groups" action={<Link href="/app/attendance" className="text-xs font-bold text-brand hover:underline">mark attendance</Link>}>
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="font-bold">{g.name}</div>
              <div className="text-sm text-ink/50">{g.course.name} · {g.schedule ?? "no schedule"}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.enrollments.map((e) => (
                  <Link key={e.id} href={`/app/students/${e.student.id}`} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold hover:bg-brand-tint hover:text-brand-dark">
                    {e.student.fullName}
                  </Link>
                ))}
                {!g.enrollments.length && <span className="text-xs text-ink/40">no students yet</span>}
              </div>
            </div>
          ))}
          {!groups.length && <p className="text-sm text-ink/40">No active groups assigned.</p>}
        </div>
      </Section>

      <div className="grid gap-x-6 md:grid-cols-2">
        <Section title="Tasks waiting for your check">
          {toCheck.length ? (
            <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
              {toCheck.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/students/${t.student.id}?tab=tasks`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                    <span className="font-semibold">{t.student.fullName}</span>
                    <span className="text-xs text-warn">{t.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-center text-sm text-ink/40">Nothing waiting.</p>
          )}
        </Section>
        <Section title="Missing homework"><AlertList items={missing} empty="No overdue tasks." /></Section>
        <Section title="Low attendance"><AlertList items={attendance} empty="Everyone above 80%." /></Section>
        <Section title="Needs a progress update"><AlertList items={stale} empty="All students updated recently." /></Section>
        <Section title="Upcoming target exams"><AlertList items={exams} empty="No exam dates in the next 60 days." /></Section>
      </div>
    </>
  );
}

/* ---------- student / parent ---------- */

async function StudentDashboard({ userId }: { userId: string }) {
  const profile = await db.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return <p className="text-ink/50">No student profile linked to this account yet.</p>;
  return <StudentSummary studentId={profile.id} heading="My Progress" />;
}

async function ParentDashboard({ userId }: { userId: string }) {
  const links = await db.parentLink.findMany({ where: { parentUserId: userId }, include: { student: true } });
  if (!links.length) return <p className="text-ink/50">No child linked to this account yet.</p>;
  return (
    <>
      {links.map((l) => (
        <StudentSummary key={l.studentId} studentId={l.studentId} heading={l.student.fullName} />
      ))}
    </>
  );
}

/** Read-only summary for student/parent. Never includes internal notes or drafts. */
async function StudentSummary({ studentId, heading }: { studentId: string; heading: string }) {
  const m = await studentMetrics(studentId);
  const [reportCard, nextTasks, enrollment] = await Promise.all([
    db.reportCard.findFirst({ where: { studentId, publishedAt: { not: null } }, orderBy: { period: "desc" } }),
    db.studentTask.findMany({
      where: { studentId, status: { in: ["NOT_STARTED", "IN_PROGRESS", "MISSING", "SUBMITTED"] } },
      orderBy: { deadline: { sort: "asc", nulls: "last" } }, take: 6,
    }),
    db.enrollment.findFirst({ where: { studentId, status: "ACTIVE" }, include: { course: true, teacher: { select: { name: true } } } }),
  ]);

  const warnTone = { green: "ok", yellow: "warn", red: "risk" } as const;
  const warnLabel = { green: "On track", yellow: "Needs attention", red: "At risk" } as const;

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{heading}</h1>
        <StatusBadge value={warnLabel[m.warning]} tone={warnTone[m.warning]} />
        {enrollment && <span className="text-sm text-ink/50">{enrollment.course.name} · {enrollment.teacher?.name}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Target" value={m.goal?.targetOverall ?? "—"} />
        <Stat label="Latest exam" value={m.latestExam?.totalScore ?? "—"} />
        <Stat label="Since placement" value={m.placement?.totalScore ?? "—"} />
        <Stat label="Attendance" value={m.attendancePct != null ? `${m.attendancePct}%` : "—"} tone={m.attendancePct != null && m.attendancePct < 80 ? "warn" : undefined} />
        <Stat label="Tasks done" value={m.taskPct != null ? `${m.taskPct}%` : "—"} />
      </div>

      <Section title="Next tasks" action={<Link href={`/app/students/${studentId}?tab=tasks`} className="text-xs font-bold text-brand hover:underline">open all tasks</Link>}>
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
          {nextTasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="flex items-center gap-3">
                {t.deadline && <span className="text-ink/50">{t.deadline.toLocaleDateString("en-GB")}</span>}
                <StatusBadge value={t.status} tone={t.status === "MISSING" ? "risk" : t.status === "SUBMITTED" ? "warn" : "muted"} />
              </span>
            </li>
          ))}
          {!nextTasks.length && <li className="px-4 py-5 text-center text-sm text-ink/40">All caught up.</li>}
        </ul>
      </Section>

      {reportCard && (
        <Section title={`Report card · ${reportCard.period}`} action={<Link href={`/app/students/${studentId}?tab=report`} className="text-xs font-bold text-brand hover:underline">full report</Link>}>
          <div className="rounded-xl border border-black/10 bg-white p-4 text-sm leading-relaxed">
            <p><span className="font-semibold">Strengths:</span> {reportCard.strengths ?? "—"}</p>
            <p><span className="font-semibold">To improve:</span> {reportCard.weaknesses ?? "—"}</p>
            <p><span className="font-semibold">Next target:</span> {reportCard.nextTarget ?? "—"}</p>
            {reportCard.teacherComment && <p className="mt-2 border-t border-black/5 pt-2 text-ink/70">{reportCard.teacherComment}</p>}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ---------- entry ---------- */

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/login");

  switch (user.role) {
    case "MANAGER": return <ManagerDashboard />;
    case "STAFF": return <StaffDashboard userId={user.id} />;
    case "TEACHER": return <TeacherDashboard userId={user.id} />;
    case "STUDENT": return <StudentDashboard userId={user.id} />;
    case "PARENT": return <ParentDashboard userId={user.id} />;
  }
}
