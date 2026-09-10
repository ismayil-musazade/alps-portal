/**
 * Install the demo placement paper from a terminal.
 * The same thing happens when a manager presses "Add the demo paper".
 *
 *   npx tsx prisma/seed-placement-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { installDemoPaper } from "../src/lib/demo-placement-paper";

const db = new PrismaClient();

installDemoPaper(db)
  .then((p) => console.log(`"${p.title}" — ${p.questions} questions. Preview it at /app/exams`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
