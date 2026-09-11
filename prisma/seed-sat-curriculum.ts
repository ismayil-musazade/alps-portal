/**
 * Install the SAT skill tree from a terminal.
 * The same thing happens when a manager presses "Install the SAT syllabus".
 *
 *   npx tsx prisma/seed-sat-curriculum.ts
 */
import { installSatCurriculum } from "../src/lib/install-curriculum";
import { db } from "../src/lib/db";

installSatCurriculum()
  .then((r) => console.log(`SAT curriculum installed — ${r.skills} skills in ${r.subjects} subjects.`))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
