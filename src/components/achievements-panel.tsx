import { db } from "@/lib/db";
import { formatDate } from "@/lib/time";
import { AddAchievement, DeleteAchievement } from "@/components/achievement-controls";

const ICON: Record<string, string> = {
  OLYMPIAD: "🏅",
  EXAM: "📄",
  CERTIFICATE: "🎓",
  COMPETITION: "🏆",
  AWARD: "⭐",
  OTHER: "•",
};

const LABEL: Record<string, string> = {
  OLYMPIAD: "Olympiad",
  EXAM: "Exam result",
  CERTIFICATE: "Certificate",
  COMPETITION: "Competition",
  AWARD: "Award",
  OTHER: "Other",
};

/**
 * What this person has already achieved — olympiads, certificates, exam scores
 * from before they joined. Useful when placing someone in a group, and it is
 * the sort of thing a parent expects the centre to remember.
 */
export async function AchievementsPanel({
  leadId,
  studentId,
  canEdit,
}: {
  leadId?: string;
  studentId?: string;
  canEdit: boolean;
}) {
  const rows = await db.achievement.findMany({
    where: leadId ? { leadId } : { studentId },
    orderBy: [{ achievedOn: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 40,
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink/50">Achievements</h3>
        {canEdit && <AddAchievement leadId={leadId} studentId={studentId} />}
      </div>

      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
            <span aria-hidden className="text-base leading-5">{ICON[a.category] ?? "•"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.title}</span>
                {a.result && (
                  <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-dark">
                    {a.result}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink/40">
                {LABEL[a.category] ?? a.category}
                {a.achievedOn ? ` · ${formatDate(a.achievedOn, { month: "short", year: "numeric" })}` : ""}
                {` · added by ${a.createdBy.name}`}
              </p>
              {a.note && <p className="mt-1 text-ink/70">{a.note}</p>}
            </div>
            {canEdit && <DeleteAchievement id={a.id} />}
          </li>
        ))}
        {!rows.length && (
          <li className="py-3 text-center text-sm text-ink/40">
            Nothing recorded yet — olympiads, certificates and past exam scores go here.
          </li>
        )}
      </ul>
    </div>
  );
}
