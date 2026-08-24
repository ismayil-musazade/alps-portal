# Alps Academy Portal — Requirements Coverage
Against `Alps_Academy_AI_Website_Build_Brief.docx` (MVP / Phase 1)
Status as of the current build.

Legend: ✅ done · 🟡 partial · ⬜ not built (deliberate MVP cut)

---

## §2 MVP Scope

| Included in Phase 1 | Status |
|---|---|
| Manager/Admin account | ✅ |
| Staff account | ✅ |
| Teacher account | ✅ |
| Student account | ✅ |
| Parent account | ✅ |
| CRM for potential students/leads | ✅ |
| Student profiles with background and goals | ✅ |
| Placement, progress, mock, final exams | ✅ |
| Task/checklist tracking | ✅ |
| Report cards + performance scoring | ✅ |

| Correctly omitted | Status |
|---|---|
| Online payment, study abroad, video lessons, mobile app, advanced automation, chat, financial accounting, university tracking, password vault, WhatsApp/Instagram API | ⬜ as specified |

## §3 Roles and access levels — ✅ all five roles, access enforced server-side

## §4 Technology direction

| Item | Status |
|---|---|
| React / Next.js, responsive | ✅ (mobile browser not yet verified) |
| Next.js API routes backend | ✅ |
| PostgreSQL | ✅ (v17, local) |
| Email/phone + password auth, role permissions | ✅ |
| File uploads (marked optional) | ⬜ |
| Clean dashboard, forms, tables, filters, status colours | ✅ |

## §5 Core user flow — ✅ all eight steps working end to end
Placement exam is *recorded* and its status tracked in the pipeline; there is no scheduling calendar (not required by the brief).

## §6 Main modules — ✅ all nine built
Dashboard · CRM · Student Profiles · Courses and Groups · Task Tracker · Exam Management · Report Cards · Attendance · Users and Permissions

## §7 CRM fields

| Field group | Status |
|---|---|
| Basic details (name, phone, parent name, parent phone, school, grade) | ✅ |
| — age / date of birth | 🟡 **column exists in the database but is not on the form** |
| Lead source (7 options) | ✅ |
| Academic interest (course, level, target, schedule, group/individual) | ✅ |
| CRM status (all 9 stages) | ✅ |
| Follow-up control (staff, first contact, next follow-up, note, lost reason) | ✅ |

## §8 Student profile

| Section | Status |
|---|---|
| Basic identity | ✅ (same date-of-birth gap as above) |
| Background (level, previous scores, strengths, weaknesses, notes) | ✅ |
| Course details (course, group, teacher, start date, status) | ✅ |
| Status options (active/frozen/completed/dropped/waiting) | ✅ |
| Goals (target, exam date, sub-targets) | ✅ |
| Academic progress (attendance, tasks, exams, feedback, weak areas) | ✅ |
| Internal notes, hidden from student/parent | ✅ verified |

## §9 Goals by course type — ✅ IELTS, SAT, General English, Other with per-type sub-target fields

## §10 Task tracker — ✅ all 11 specified fields
Title · category · course type · assigned date · deadline · status · teacher tick · student-side status · score · comment · mistake review

## §11 SAT checklist example

| Item | Status |
|---|---|
| Practice Tests 1–10 | ✅ templates seeded |
| Vocabulary Lists 1–20 | ✅ |
| Reading Articles 1–30 | ✅ |
| Skill checklist (8 skills × 5 statuses) | ✅ |
| Per-practice-test **total / English / Math** scores | 🟡 **recorded in the Exams module, not as fields on the task row** (task score is a 1–5 quality rating) |

## §12 Exam management — ✅ 4 exam types, per-course section scores, linked to profile and report card

## §13 Performance scoring — ✅ attendance %, task completion %, average quality, latest exam, progress since placement, green/yellow/red warning

## §14 Report card — ✅ all 10 sections, draft → publish, metrics frozen at publish

## §15 Dashboards and alerts

| Role | Status |
|---|---|
| Manager (active students, new leads, follow-ups, low attendance, missing tasks, below target, stale teacher updates, upcoming exams) | ✅ |
| Staff (new leads, placement/trial booked, follow-up reminders, converted/lost, details to complete) | ✅ |
| Teacher (groups, tasks to check, missing homework, students needing attention, upcoming exams) | ✅ |
| — teacher "today's lessons" | 🟡 groups are listed with their schedule text; there is no day-filtered lesson list |
| Student (target, next tasks, completion, latest exam, report card, feedback) | ✅ |
| Parent (attendance, tasks, latest exam, report card, comment) | ✅ |

## §16 Permission matrix — ✅ implemented and penetration-tested per row

## §17 Database entities — ✅ all 14 required, plus LeadActivity, StudentSkillStatus, LoginAttempt

## §18 Essential pages — ✅ all 14 (login, 5 dashboards, CRM list/detail/convert, students list/profile/goals/tasks/exams, report card, attendance, groups, users)

## §19 Design and usability

| Item | Status |
|---|---|
| Operational, not marketing | ✅ |
| Profile tabs (Overview/Background/Goals/Tasks/Exams/Attendance/Report/Notes) | ✅ |
| Filters on all lists | ✅ |
| Colour labels green/yellow/red | ✅ |
| Clean student/parent views without internal notes | ✅ |
| Works on laptop **and phone browser** | 🟡 built responsive, **not yet tested on a phone** |

## §20 Build priorities 1–10 — 1–9 ✅ · 10 (polish, permissions testing, responsive) 🟡
Permissions testing done; visual polish and phone testing outstanding.

## §21 Acceptance criteria — 12 of 12 ✅

---

## Summary

**Roughly 95% of the MVP brief is delivered and working.**

Four honest gaps, all small:
1. **Date of birth** is not on the lead or student form (~15 minutes to add).
2. **Per-practice-test SAT scores** live in the Exams module rather than on the task row (~1 hour if you want them on the task).
3. **Teacher "today's lessons"** is a group list with schedule text, not a day-filtered view (~1 hour; needs a proper lesson schedule model to do well).
4. **Phone browser** layout is built but unverified (~1 hour to test and fix).

Plus two things the brief marked optional or excluded: file uploads and everything in the "omitted" column.
