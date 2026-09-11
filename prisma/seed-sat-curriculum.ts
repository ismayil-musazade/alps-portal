/**
 * Install the SAT skill tree. Re-runnable: skills are matched on their slug,
 * so running it again updates names and ordering without touching any
 * questions, sessions or student attempts hanging off them.
 *
 *   npx tsx prisma/seed-sat-curriculum.ts
 */
import { PrismaClient } from "@prisma/client";
import { SAT_CURRICULUM } from "../src/lib/sat-curriculum";

const db = new PrismaClient();

async function main() {
  let skills = 0;

  for (const [si, subject] of SAT_CURRICULUM.entries()) {
    const s = await db.bankSubject.upsert({
      where: { slug: subject.slug },
      update: { name: subject.name, blurb: subject.blurb, accent: subject.accent, order: si },
      create: {
        slug: subject.slug, name: subject.name, blurb: subject.blurb,
        accent: subject.accent, order: si, courseType: "SAT",
      },
    });

    for (const [di, domain] of subject.domains.entries()) {
      const existingDomain = await db.bankDomain.findFirst({
        where: { subjectId: s.id, name: domain.name },
      });
      const d = existingDomain
        ? await db.bankDomain.update({ where: { id: existingDomain.id }, data: { order: di } })
        : await db.bankDomain.create({ data: { subjectId: s.id, name: domain.name, order: di } });

      for (const [ki, skill] of domain.skills.entries()) {
        await db.bankSkill.upsert({
          where: { domainId_slug: { domainId: d.id, slug: skill.slug } },
          update: { name: skill.name, description: skill.description, order: ki },
          create: {
            domainId: d.id, slug: skill.slug, name: skill.name,
            description: skill.description, order: ki,
          },
        });
        skills += 1;
      }
    }
  }

  console.log(`SAT curriculum installed — ${skills} skills.`);
  for (const subject of SAT_CURRICULUM) {
    const n = subject.domains.reduce((m, d) => m + d.skills.length, 0);
    console.log(`  ${subject.name}: ${n} skills in ${subject.domains.length} domains`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
