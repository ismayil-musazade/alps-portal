import { db } from "@/lib/db";
import { SAT_CURRICULUM } from "@/lib/sat-curriculum";

/**
 * Put the SAT skill tree into the database.
 *
 * Matched on slug, so running it again corrects names and ordering without
 * disturbing the sessions, questions or attempts hanging off a skill. That
 * matters more than it sounds: the syllabus will be edited after students have
 * already practised against it.
 */
export async function installSatCurriculum() {
  let subjects = 0;
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
    subjects += 1;

    for (const [di, domain] of subject.domains.entries()) {
      const found = await db.bankDomain.findFirst({
        where: { subjectId: s.id, name: domain.name },
        select: { id: true },
      });
      const d = found
        ? await db.bankDomain.update({ where: { id: found.id }, data: { order: di } })
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

  return { subjects, skills };
}
