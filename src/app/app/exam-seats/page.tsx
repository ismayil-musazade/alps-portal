import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { SEAT_COUNT, SEAT_NUMBERS, seatLogin } from "@/lib/exam-seats";
import { CreateSeats, ResetSeatPassword } from "@/components/exam-seat-controls";

export const dynamic = "force-dynamic";

export default async function ExamSeatsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "tests.manage")) redirect("/app");

  const seats = await db.examSeat.findMany({
    orderBy: { seatNo: "asc" },
    include: {
      sittings: {
        where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        select: { id: true, candidateName: true, status: true },
      },
    },
  });

  const have = new Set(seats.map((s) => s.seatNo));
  const missing = SEAT_NUMBERS.filter((n) => !have.has(n));

  return (
    <>
      <h1 className="text-2xl font-extrabold">Exam desks</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        {SEAT_COUNT} shared logins, one per machine, so five walk-in candidates can sit a
        placement test at the same time. A desk is furniture, not a person — the name and the
        score belong to the candidate, so the same desk can be used again tomorrow without
        anybody&rsquo;s result being confused with anybody else&rsquo;s.
      </p>

      {missing.length > 0 && (
        <div className="mt-5 rounded-xl border border-brand/30 bg-brand-tint/40 p-4">
          <p className="text-sm font-semibold">
            {seats.length === 0
              ? "The exam desks have not been set up yet."
              : `${missing.length} of the ${SEAT_COUNT} desks are missing.`}
          </p>
          <div className="mt-3">
            <CreateSeats missing={missing.length} />
          </div>
        </div>
      )}

      {seats.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-140 text-sm">
            <thead className="bg-paper text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Desk</th>
                <th className="px-4 py-2.5 font-semibold">Login</th>
                <th className="px-4 py-2.5 font-semibold">Right now</th>
                <th className="px-4 py-2.5 text-right font-semibold">Password</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => {
                const sitting = s.sittings[0];
                return (
                  <tr key={s.id} className="border-t border-black/5 align-top">
                    <td className="px-4 py-2.5 font-semibold">{s.label}</td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-black/5 px-2 py-0.5 font-mono font-bold">
                        {seatLogin(s.seatNo)}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      {sitting ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{sitting.candidateName}</span>
                          <StatusBadge value={sitting.status} tone="warn" />
                        </span>
                      ) : (
                        <StatusBadge value="FREE" tone="ok" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ResetSeatPassword seatNo={s.seatNo} busy={Boolean(sitting)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-black/10 bg-white p-4 text-sm text-ink/70">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">How a walk-in exam runs</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open a desk machine and sign in with that desk&rsquo;s login.</li>
          <li>From <strong>Exams</strong>, create the sitting: choose the paper and type the candidate&rsquo;s name.</li>
          <li>The candidate sits down and starts. The timer runs from their first question.</li>
          <li>It is marked automatically and the score lands on their record in the CRM.</li>
        </ol>
        <p className="mt-2 text-ink/50">
          Steps 2 to 4 are being built now. The desks themselves are ready.
        </p>
      </div>
    </>
  );
}
