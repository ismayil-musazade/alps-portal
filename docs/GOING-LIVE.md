# Going live — the week the academy starts using this

Everything below is ordinary work, not engineering. Nothing here needs a
developer, and nothing here is hard to undo except step 2, which is called out.

---

## The short version

| | What | Who | When |
|---|---|---|---|
| 1 | Decide the real names, roles and emails | Manager | before the reset |
| 2 | Clear the demo data, create the first manager | Manager, one command | day 1, once |
| 3 | Add staff and teacher accounts | Manager, in the app | day 1 |
| 4 | Enter courses and groups | Manager | day 1–2 |
| 5 | Enter students and put them in groups | Manager + staff | day 2–3 |
| 6 | Teachers mark attendance for real | Teachers | day 3 onwards |
| 7 | Student and parent accounts | Manager | once the above is steady |

Steps 3–7 are just using the app. There is no migration, no import, no
downtime — the portal is already live and already works.

---

## 1. Before you touch anything

Write down, on paper or in a note:

- **Who gets an account, and as what.** Manager, staff, teacher, student,
  parent. A person gets exactly one account with one role.
- **An email address for each person.** Students can use a phone number
  instead if they have no email.
- **Your own name and email** — this becomes the first manager account.

Roles are not cosmetic. A teacher only ever sees the students in their own
groups; staff see the whole CRM but cannot approve work; only a manager can
create accounts. Getting this list right now saves untangling it later.

---

## 2. Clear the demo data ⚠️ irreversible

Everything in the database today was put there to show how the app works —
"Demo Manager", two invented students, four invented leads. None of it should
sit alongside real people.

First, look at what would go:

```bash
npx tsx prisma/reset-for-launch.ts
```

That changes nothing. It prints what it *would* delete and what it keeps. The
68 study-task templates and the course list survive; they are a real curriculum
library, not demo noise.

When the list looks right:

```bash
npx tsx prisma/reset-for-launch.ts --confirm --name "Your Name" --email you@example.com
```

**This cannot be undone.** It prints a one-time password at the end. Write it
down before you close the terminal — it is not stored anywhere and cannot be
recovered. Sign in with it and change it immediately.

Do this once, on the day you start. Not before, or you will be signing in with
a password you set a week ago and half-remember.

---

## 3. Add everyone else

**Users & Accounts → New user.** Each one gets a one-time password on screen,
shown once, looking like `alps-4F2A-91BC`.

Pass it on the way you would a door key — say it in person, or send it in a
message you then delete. Not in a group chat. They will be forced to change it
the first time they sign in, so it only has to survive one conversation.

If someone loses it before signing in, reset it from the same screen.

---

## 4. Courses and groups

**Courses** are what you teach: SAT Preparation, IELTS Academic, General
English. These already exist and can be edited.

**Groups** are actual classes: a course, a teacher, a schedule. "SAT Evening A,
Tue/Thu 19:00, Orkhan". Attendance and enrolment hang off groups, so a teacher
with no group sees nothing.

Create the groups you are actually running this term. Not the ones you plan to.

---

## 5. Students

Two ways in, and the difference matters:

- Somebody enquiring → **Leads → New lead**. They sit in the CRM with a
  follow-up date and a reason, and convert to a student when they enrol. Their
  achievements and placement result follow them across.
- Somebody already studying with you → **Students → New student** directly.

For the students you already have, the second route is faster. Use the first
one from now on for everybody new, because that is where the follow-up
reminders and the placement scores live.

---

## 6. Teachers start marking attendance

This is the moment it becomes real. A teacher signs in on their phone, opens
**Attendance**, picks their group and the date, and marks the register.

Everything else — low-attendance warnings, report cards, the manager's
dashboard — is built on this one habit. If attendance is not marked, the rest
of the app has nothing to work with.

Ask teachers to do it during or straight after the lesson, not at the end of
the week.

---

## 7. Students and parents

Leave these until staff and teachers are comfortable. A student account shows
progress, tasks and report cards; a parent account shows the same for their
child and nothing else.

There is no rush: the academy runs perfectly well with only staff accounts for
the first week or two, and it is easier to explain the app to families once you
have used it yourself.

---

## What to expect in the first week

**Things will look empty.** Dashboards, alerts and averages need a few weeks of
attendance and exam data before they say anything useful. That is not a fault.

**Somebody will be given the wrong role.** Change it in Users & Accounts;
nothing is lost.

**Somebody will forget their password.** Reset it from the same screen.

**The app will be slow on the first click after a quiet spell.** The free
database tier goes to sleep after a few minutes idle and takes a moment to wake
up. Every click after that is fast. If this becomes annoying during the day, a
paid database plan removes it.

---

## What is not ready yet

Say these out loud when you introduce the app, so nobody is surprised:

- **Placement exams** are being built now.
- **No email or SMS goes out.** Reminders live inside the app, on the bell.
  Nobody is notified outside it.
- **The interface is in English.** Azerbaijani translation is not done.
- **The public website is separate** and does not yet share this database.
