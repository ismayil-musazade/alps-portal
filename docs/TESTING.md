# Alps Academy Portal — Test Plan (MVP)

Everything in the build brief §21 acceptance criteria is now implemented.
Work through this top to bottom; it takes roughly one hour.

---

## 0. Start the system

```bash
cd ~/Desktop/alps-portal && npm run dev
```

Open **http://localhost:3000** → you land on the login screen.

### Demo accounts

| Role | Login | Password |
|---|---|---|
| Manager | `manager@alps.local` | `Manager!234` |
| Staff | `staff@alps.local` | `Staff!234` |
| Teacher (Orkhan Safarov) | `teacher@alps.local` | `Teacher!234` |
| Student (Cavid Cebiyev) | `student@alps.local` | `Student!234` |
| Parent (Cavid's parent) | `parent@alps.local` | `Parent!234` |

Use a **private/incognito window** (or sign out) when switching roles — one session at a time per browser.

Reset the demo data at any point:
```bash
npx prisma migrate reset --force
```

---

## 1. Login & security basics  *(5 min)*

| # | Steps | Expected |
|---|---|---|
| 1.1 | Log in with a wrong password | "Wrong login or password." Nothing reveals whether the account exists |
| 1.2 | Repeat 6 wrong attempts on the same login | After 5, "Too many attempts. Try again in 15 minutes." |
| 1.3 | Log in as parent with the **phone number** `+994507654321` / `Parent!234` | Works — phone login is supported |
| 1.4 | While logged out, type `localhost:3000/app/students` in the address bar | Redirected to login |
| 1.5 | Log in, then press "Sign out", then press browser Back | You do **not** get back in; you land on login |

---

## 2. Manager — full pass  *(15 min)*

Log in as **manager**.

| # | Steps | Expected |
|---|---|---|
| 2.1 | Look at the dashboard | 5 stat tiles + alert sections: low attendance, missing/overdue tasks, below target, no progress updates, upcoming exams, leads needing follow-up |
| 2.2 | Click the "Cavid Cebiyev" row under "Below target" | Opens his profile directly |
| 2.3 | Click every stat tile | Each opens a filtered list (e.g. "Follow-ups due" → leads filtered to due) |
| 2.4 | **CRM → + New lead**, fill name + phone + source, save | Lead created, you land on its detail page, activity shows "Lead created." |
| 2.5 | On the lead, add an activity (type: Call, some text) | Appears at the top of the timeline with your name and timestamp |
| 2.6 | Change the lead's status to "placement booked" and set a follow-up date, Save | Status badge updates; timeline logs "Status: new → placement booked" |
| 2.7 | Set status to "lost" with a reason | Reason is stored and shown; the lead disappears from "open leads" counts |
| 2.8 | Press **Convert to student** on a non-lost lead | Confirm → student profile opens with all the lead's details carried over; status "waiting group" |
| 2.9 | Go back to that lead | It is now "converted", editing is locked, and there is a link to the student profile |
| 2.10 | **Courses & Groups → + Course**, add "TOEFL Prep" (type OTHER/other) | Appears as a course card |
| 2.11 | **+ New group**, name it, pick course + teacher + schedule | Appears in the groups table |
| 2.12 | Open the new group → add your converted student → Enroll | Roster shows them; the student's status flips from "waiting group" to "active" |
| 2.13 | Try enrolling the same student again | "Already enrolled in this group" |
| 2.14 | In Group settings, change the teacher and Save | Teacher updates on the group **and** on the student's profile course card |
| 2.15 | **Users → + New account**, role Teacher, with an email | A one-time temporary password is shown once (copy it) |
| 2.16 | Sign out, log in with that new teacher + temp password | You are forced to the "Change password" screen and cannot reach anything else |
| 2.17 | Set a new password (min 8 chars) | You land on the teacher dashboard normally |
| 2.18 | As manager, **Users** → "reset pw" on that teacher | A new temp password appears; the old one no longer works |
| 2.19 | **Users** → "disable" an account, then try logging in as it | Login refuses |

---

## 3. Teacher — full pass  *(15 min)*

Log in as **teacher** (`teacher@alps.local`).

| # | Steps | Expected |
|---|---|---|
| 3.1 | Dashboard | Only *your* groups; tiles for tasks to check, attendance marked today; alerts scoped to your students only |
| 3.2 | **My Students** | Only students in your groups (Cavid, Rustam) — nobody else in the academy |
| 3.3 | Open Cavid → **Goals** → "+ Set goal" (SAT, target 1400, sub-targets, exam date) | Saved and displayed; sub-target fields change per course type |
| 3.4 | **Tasks** tab → "+ Assign tasks" | Template bank opens grouped by category; already-assigned templates are greyed out |
| 3.5 | Select 3 templates → Assign | "Assigned 3 task(s)."; they appear in the table |
| 3.6 | Select an already-assigned one and assign again | Reported as skipped, no duplicates |
| 3.7 | Add a **custom task** with a deadline | Appears in the table |
| 3.8 | In a task row: set a score, type a comment, click away | Saves automatically (row dims briefly) |
| 3.9 | Enter a score above 5 | Rejected — score cap enforced |
| 3.10 | Click **approve** on a task | Turns green, status becomes "completed" |
| 3.11 | Click **rev** on a practice test | Mistake-review flag toggles (shows ✓rev) |
| 3.12 | Delete a task | Confirmation, then gone |
| 3.13 | Scroll to **Skill checklist**, change a skill to "mastered" | Saves immediately |
| 3.14 | **Exams** tab → "+ Record exam" (SAT, mock, date, total, section scores, comment) | Appears in history; the Overview tab's "Latest exam" updates |
| 3.15 | **Attendance** (top nav) → pick your group + today → tap P/L/A → Save | "Saved N record(s)." |
| 3.16 | Reload the same group + date | Your marks are still there (editing, not duplicating) |
| 3.17 | **Report Card** → "+ New report card" for this month, fill the four text areas | Draft created with real numbers auto-filled (attendance %, tasks %, avg quality, placement, latest exam, target) |
| 3.18 | Press **publish to student & parent** | Badge changes from "draft" to "published" |
| 3.19 | Open **Notes** tab, add an internal note | Saved with your name and visibility label |

---

## 4. Staff — full pass  *(5 min)*

Log in as **staff**.

| # | Steps | Expected |
|---|---|---|
| 4.1 | Dashboard | Lead pipeline stats, your leads by follow-up date (overdue in red), placement/trial bookings, "student details to complete" |
| 4.2 | CRM: create a lead, change status, add notes | All allowed |
| 4.3 | Students list → open a student → **Edit details** | Allowed (background, contact, status) |
| 4.4 | On a student, look for score/task/exam editing | **Not available** — staff is view-only on academics |
| 4.5 | Look at the top navigation | No "Users" (manager only). "Courses & Groups" is visible but read-only |
| 4.6 | Open Courses & Groups → a group | No "Enroll" box, no group settings panel |

---

## 5. Student — full pass  *(5 min)*

Log in as **student** (`student@alps.local`).

| # | Steps | Expected |
|---|---|---|
| 5.1 | Dashboard | Target, latest exam, since-placement, attendance %, tasks %, status badge, next tasks, published report card |
| 5.2 | Top navigation | Only "My Progress" — no CRM, no Students list, no Users |
| 5.3 | Click "open all tasks" | Your task list, read-only, with a **Mark done** button on unfinished tasks |
| 5.4 | Press "Mark done" on one | Status becomes "submitted", shows "waiting for teacher" |
| 5.5 | Look for a **Notes** tab on your own profile | **Absent** — internal notes are invisible to students |
| 5.6 | Look at the Report Card tab | Only **published** cards; drafts are invisible |
| 5.7 | Anywhere: try to change a score or approve anything | No controls exist |

Then log in as **teacher** again → the task you submitted appears under "Tasks waiting for your check" → approve it → back as student, it shows completed with the score.

---

## 6. Parent — full pass  *(3 min)*

Log in as **parent**.

| # | Steps | Expected |
|---|---|---|
| 6.1 | Dashboard | Your child's name, attendance, task completion, latest exam, published report card, teacher comment |
| 6.2 | Navigation | Only "My Child" |
| 6.3 | Report card content | Matches what the teacher published — no internal notes, no drafts |

---

## 7. Security — try to break it  *(10 min)*

These are the tests that matter most. Use the **address bar** and, where noted, the browser console (F12 → Console).

| # | Steps | Expected |
|---|---|---|
| 7.1 | As **student**, copy another student's profile URL (get one from the manager session) and open it | Redirected away — you only see yourself |
| 7.2 | As **student**, open `localhost:3000/app/leads` | Redirected to your dashboard |
| 7.3 | As **student**, open `localhost:3000/app/users` | Redirected |
| 7.4 | As **teacher**, open a student who is **not** in your groups | Redirected |
| 7.5 | As **staff**, in the console run: `fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'X',email:'x@x.az',role:'MANAGER'})}).then(r=>r.status)` | **403** — staff cannot create a manager account |
| 7.6 | As **student**, in the console run: `fetch('/api/tasks/ANY_ID',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({score:5,teacherApproved:true})}).then(r=>r.status)` | **403** — students cannot grade themselves |
| 7.7 | As **student**, try `fetch('/api/report-cards/ANY_ID',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({publish:true})}).then(r=>r.status)` | **403** |
| 7.8 | As **teacher**, in the console: `fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:'X',phone:'+994500000000',source:'OTHER'})}).then(r=>r.status)` | **403** — CRM is staff/manager |
| 7.9 | As **manager**, view a student's page source (Ctrl+U) with an internal note present, then repeat as the **student** | The note text is completely absent from the student's page source — not merely hidden |
| 7.10 | Sign in as one role in one browser and another role in a second browser | Sessions stay independent |

---

## 8. Feature checklist (brief §21 acceptance criteria)

- [ ] Admin can create staff, teacher, student and parent accounts
- [ ] Staff/admin can create a lead with full CRM details
- [ ] Staff/admin can update lead status and next follow-up date
- [ ] A lead converts to a student without losing background data
- [ ] Admin can assign a student to course, group and teacher
- [ ] Teacher sees only assigned students/groups
- [ ] Teacher can add/tick academic tasks and score them
- [ ] Student sees targets, tasks, completion, exam results, report card
- [ ] Parent sees child's attendance, tasks, exams, report card
- [ ] Manager can see performance overview: attendance, tasks, latest score, target, weak areas, warning status
- [ ] Internal notes never visible to students or parents
- [ ] Payment / study abroad / video / mobile app are **not** present (correct for MVP)

---

## 9. Known limitations (deliberate MVP cuts — please don't file these)

1. **No email/SMS** — temporary passwords are shown on screen once and must be passed on manually.
2. **No password reset by the user** — a manager resets it from the Users page.
3. **No file uploads** — homework is tracked as tasks, not submitted files.
4. **English only** — Azerbaijani translation is a later phase.
5. **No attendance calendar view** — marking is per group per date.
6. **No printing/PDF export** of report cards yet (browser print works but is unstyled).
7. **No audit log UI** — author and timestamp are stored on records but there is no history screen.
8. **Local only** — runs on your machine; no deployment, no backups configured yet.
9. **Demo data** — the seeded students/leads are fictional; delete or reset before real use.

---

## 10. How to report what you find

For each problem: **what you did → what you expected → what happened** (a screenshot helps).
Tell me the role you were logged in as — most subtle issues are role-specific.
