import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { studentMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/* ---------- shared bits ---------- */

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" | "risk" }) {
  const toneCls = tone === "risk" ? "text-risk" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className={`text-2xl font-extrabold ${toneCls}`}>{value}</div>
      <div className="text-sm text-ink/60">{label}</div>
    </div>
  );
}

function WarningBadge({ level }: { level: "green" | "yellow" | "red" }) {
  const map = {
    green: ["bg-ok/10 text-ok", "On track"],
    yellow: ["bg-warn/10 text-warn", "Needs attention"],
    red: ["bg-risk/10 text-risk", "At risk"],
  } as const;
  const [cls, label] = map[level];
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">{title}</h2>
      {children}
    </section>
  );
}

/* ---------- role dashboards ---------- */

async function ManagerDashboard() {
  const [students, leads, followUps, teachers] = await Promise.all([
    db.studentProfile.count({ where: { status: "ACTIVE" } }),
    db.lead.count({ where: { status: { notIn: ["CONVERTED", "LOST"] } } }),
    db.lead.findMany({
      where: { nextFollowUpAt: { lte: new Date(Date.now() + 3 * 86400_000) }, status: { notIn: ["CONVERTED", "LOST"] } },
      orderBy: { nextFollowUpAt: "asc" },
      take: 5,
      include: { responsibleStaff: { select: { name: true } } },
    }),
    db.user.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">Manager Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active students" value={students} />
        <Stat label="Open leads" value={leads} />
        <Stat label="Follow-ups due (3 days)" value={followUps.length} tone={followUps.length ? "warn" : "ok"} />
        <Stat label="Teachers" value={teachers} />
      </div>
      <Section title="Leads needing follow-up">
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-130 text-sm">
            <thead className="bg-paper text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Follow-up</th>
                <th className="px-4 py-2 font-semibold">Staff</th>
              </tr>
            </thead>
            <tbody>
              {followUps.map((l) => (
                <tr key={l.id} className="border-t border-black/5">
                  <td className="px-4 py-2 font-medium">{l.fullName}</td>
                  <td className="px-4 py-2"><span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-dark">{l.status.replaceAll("_", " ").toLowerCase()}</span></td>
                  <td className="px-4 py-2">{l.nextFollowUpAt?.toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2 text-ink/60">{l.responsibleStaff?.name ?? "—"}</td>
                </tr>
              ))}
              {!followUps.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">Nothing due.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

async function StaffDashboard({ userId }: { userId: string }) {
  const [newLeads, myFollowUps] = await Promise.all([
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.findMany({
      where: { responsibleStaffId: userId, status: { notIn: ["CONVERTED", "LOST"] } },
      orderBy: { nextFollowUpAt: "asc" },
      take: 8,
    }),
  ]);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Staff Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="New leads" value={newLeads} tone={newLeads ? "warn" : "ok"} />
        <Stat label="My open leads" value={myFollowUps.length} />
      </div>
      <Section title="My leads by next follow-up">
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
          {myFollowUps.map((l) => (
            <li key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-semibold">{l.fullName}</div>
                <div className="text-ink/50">{l.lastContactNote ?? "No note yet"}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{l.nextFollowUpAt?.toLocaleDateString("en-GB") ?? "—"}</div>
                <div className="text-xs text-ink/50">{l.status.replaceAll("_", " ").toLowerCase()}</div>
              </div>
            </li>
          ))}
          {!myFollowUps.length && <li className="px-4 py-6 text-center text-ink/40">No open leads.</li>}
        </ul>
      </Section>
    </>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const groups = await db.group.findMany({
    where: { teacherId: userId, status: "ACTIVE" },
    include: { course: true, enrollments: { where: { status: "ACTIVE" }, include: { student: true } } },
  });
  const studentIds = groups.flatMap((g) => g.enrollments.map((e) => e.studentId));
  const toCheck = await db.studentTask.count({
    where: { studentId: { in: studentIds }, status: "SUBMITTED", teacherApproved: false },
  });
  const missing = await db.studentTask.count({
    where: { studentId: { in: studentIds }, status: "MISSING" },
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">Teacher Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="My groups" value={groups.length} />
        <Stat label="My students" value={studentIds.length} />
        <Stat label="Tasks to check" value={toCheck} tone={toCheck ? "warn" : "ok"} />
        <Stat label="Missing homework" value={missing} tone={missing ? "risk" : "ok"} />
      </div>
      <Section title="My groups">
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="font-bold">{g.name}</div>
              <div className="text-sm text-ink/50">{g.course.name} · {g.schedule}</div>
              <div className="mt-2 text-sm">{g.enrollments.length} student(s): {g.enrollments.map((e) => e.student.fullName).join(", ") || "—"}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

async function StudentDashboard({ userId }: { userId: string }) {
  const profile = await db.studentProfile.findUnique({ where: { userId } });
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

/** Shared student/parent read-only summary. NEVER includes internal notes. */
async function StudentSummary({ studentId, heading }: { studentId: string; heading: string }) {
  const m = await studentMetrics(studentId);
  const reportCard = await db.reportCard.findFirst({
    where: { studentId, publishedAt: { not: null } },
    orderBy: { period: "desc" },
  });
  const nextTasks = await db.studentTask.findMany({
    where: { studentId, status: { in: ["NOT_STARTED", "IN_PROGRESS", "MISSING"] } },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">{heading}</h1>
        <WarningBadge level={m.warning} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Target" value={m.goal?.targetOverall ?? "—"} />
        <Stat label="Latest exam" value={m.latestExam?.totalScore ?? "—"} />
        <Stat label="Attendance" value={m.attendancePct != null ? `${m.attendancePct}%` : "—"} tone={m.attendancePct != null && m.attendancePct < 80 ? "warn" : undefined} />
        <Stat label="Tasks done" value={m.taskPct != null ? `${m.taskPct}%` : "—"} />
      </div>

      <Section title="Next tasks">
        <p className="mb-2 -mt-1 text-sm"><a className="font-semibold text-brand hover:underline" href={`/app/students/${studentId}?tab=tasks`}>Open all tasks →</a></p>
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
          {nextTasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="font-medium">{t.title}</div>
              <div className="flex items-center gap-3">
                {t.deadline && <span className="text-ink/50">{t.deadline.toLocaleDateString("en-GB")}</span>}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.status === "MISSING" ? "bg-risk/10 text-risk" : "bg-black/5 text-ink/60"}`}>
                  {t.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </div>
            </li>
          ))}
          {!nextTasks.length && <li className="px-4 py-6 text-center text-ink/40">All caught up.</li>}
        </ul>
      </Section>

      {reportCard && (
        <Section title={`Report card · ${reportCard.period}`}>
          <div className="rounded-xl border border-black/10 bg-white p-4 text-sm leading-relaxed">
            <p><span className="font-semibold">Strengths:</span> {reportCard.strengths}</p>
            <p><span className="font-semibold">To improve:</span> {reportCard.weaknesses}</p>
            <p><span className="font-semibold">Next target:</span> {reportCard.nextTarget}</p>
            <p className="mt-2 border-t border-black/5 pt-2 text-ink/70">{reportCard.teacherComment}</p>
          </div>
        </Section>
      )}
    </>
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
