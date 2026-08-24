# Deployment Guide — Alps Academy

Everything you need to know to put the portal and the marketing site online,
keep them running, and ship changes safely.

Domain owned: **alpsacademy.az**

---

## 1. What gets deployed where

Two separate products, two separate deployments, one domain:

| What | Address | Type |
|---|---|---|
| Marketing website | `https://alpsacademy.az` and `www.alpsacademy.az` | Static files (HTML/CSS/JS) |
| Management portal | `https://app.alpsacademy.az` | Next.js app + PostgreSQL database |

Keeping them separate matters: the marketing site must be fast and public for
Google, the portal must be private and never indexed. If the portal breaks, the
marketing site stays up, and vice versa.

---

## 2. The three realistic options

### Option A — Vercel + Neon  ← recommended
- **Vercel** hosts the Next.js app. It is made by the same company that makes Next.js, so it needs zero configuration.
- **Neon** hosts PostgreSQL. Built for serverless, includes connection pooling and database branching.

| | |
|---|---|
| Setup effort | Lowest — connect the git repo, set 2 secrets, done |
| Deploy | `git push` → live in ~90 seconds |
| Zero-downtime | Automatic (see §4) |
| Preview environments | Automatic, every branch gets its own URL |
| Backups | Automatic point-in-time restore |
| Maintenance | None — no servers, no patching |
| Cost (approx.) | Vercel Pro ~$20/mo + Neon ~$0–19/mo |
| Data location | Choose region at setup — **Frankfurt** is the closest EU region |
| Downside | Two vendors; Vercel's free tier is not licensed for commercial use, so Pro is required |

### Option B — Railway or Render (all-in-one)
App and database from the same vendor, one dashboard, one bill.

| | |
|---|---|
| Setup effort | Low |
| Deploy | `git push` → live |
| Zero-downtime | Yes (health-checked rolling deploys) |
| Preview environments | Render: yes on paid plans · Railway: yes |
| Backups | Daily automatic; point-in-time on higher tiers |
| Cost (approx.) | ~$15–35/mo total |
| Downside | Slightly slower cold starts than Vercel for Next.js; fewer Next.js-specific optimisations |

### Option C — VPS (Hetzner/DigitalOcean) + Docker + Coolify
A server you rent and control. Coolify/Dokploy give you a Vercel-like dashboard on your own machine.

| | |
|---|---|
| Setup effort | High — you install and configure everything |
| Deploy | `git push` → Coolify rebuilds the container |
| Zero-downtime | Yes, but you configure it |
| Backups | **You set them up. If you forget, there are none** |
| Maintenance | Security patches, disk space, certificate renewals — yours forever |
| Cost (approx.) | ~$8–20/mo |
| Upside | Cheapest; full control; **you choose the physical country of the data** |
| Downside | You are now a sysadmin. Every hour spent here is an hour not spent on the academy |

**Recommendation: Option A for the pilot.** Revisit Option C only if the personal-data law
requires the data to sit in Azerbaijan — that is a legal question, not a technical one.

⚠️ All prices are approximate and change; verify current pricing before committing.

---

## 3. What you actually manage, day to day

Once it is running, your entire job is five things:

| Thing | How often | What it means |
|---|---|---|
| **Deploy changes** | Whenever we ship | `git push` — everything else is automatic |
| **Secrets** | Rarely | Two environment variables (`DATABASE_URL`, `SESSION_SECRET`) set once in a dashboard |
| **Database** | Monthly glance | Check size and that backups are green |
| **Users** | Ongoing | Create/disable accounts inside the portal itself — not a hosting task |
| **Domain** | Once | DNS records, set up at the start (see §6) |

There is **no server to log into, no operating system to patch, no antivirus, no disk to clean.**
That is the entire point of managed hosting.

---

## 4. Shipping changes without users noticing — your Docker question

What you are describing is called **atomic deployment** (or blue-green deployment).
You are right that it exists. You are wrong that you need Docker for it.

### How it actually works on managed hosting

1. You `git push` a change.
2. The platform builds the **new** version on a completely separate machine.
   Meanwhile, 100% of your users are still being served the **old** version. They notice nothing.
3. The build either succeeds or fails.
   - **Fails** → nothing changes. Users stay on the old version and never knew a build happened.
   - **Succeeds** → traffic switches to the new version, instantly, between one request and the next.
4. The old version is kept. If something is wrong, you press **Rollback** and you are back
   on the previous version in about five seconds.

Nobody ever sees a half-updated site. There is no "maintenance mode" page. This is
included by default on Vercel, Railway and Render.

### So do you need Docker?

**No — not for this.** Docker is a way of packaging an application so it runs identically
everywhere. Managed platforms already build an immutable, isolated artifact for you; Docker
would be a second layer doing the same job.

You would need Docker if you:
- self-host on a VPS (Option C), or
- run several services that must be started together (app + database + queue + cache), or
- need byte-identical environments across a larger team.

For one Next.js app on managed hosting, you never write a Dockerfile.

### Preview deployments — the feature you will actually love

Every git branch automatically gets its **own private URL** with its own copy of the app.

```
main branch      →  https://app.alpsacademy.az        (real users)
feature/reports  →  https://alps-portal-git-feature-reports-....vercel.app   (only you)
```

So when I build something new, you click a link and try it **before** it reaches your
teachers. With Neon, that preview can even get its own branched copy of the database, so
you can enter junk test data without touching real student records.

This replaces the "let me show you on my laptop" workflow entirely.

### The part that genuinely is hard: database migrations

Code rolls back in seconds. **A database change does not.** If a deployment deletes a column
and you roll the code back, the column is still gone.

So for any change to the database structure we use the **expand → migrate → contract** pattern:

1. **Expand** — add the new column/table. Old code ignores it, new code uses it. Both versions work.
2. **Migrate** — deploy the new code, let it run for a few days, confirm everything is fine.
3. **Contract** — only then remove the old column, in a later deployment.

Slower, but at no point is a rollback impossible. Additive changes (new tables, new optional
columns) are always safe; renames and deletions are the dangerous ones.

Migrations run automatically at deploy time via `prisma migrate deploy`.

---

## 5. The database — what you need to know

### Size and growth
Today: **9 MB** including all demo data. Realistic projection:

| Data | Per year at ~200 students |
|---|---|
| Attendance (2 lessons/week × 40 weeks) | ~16,000 rows |
| Tasks (~60 per student) | ~12,000 rows |
| Exams, goals, report cards, leads, notes | ~5,000 rows |
| **Total** | **well under 100 MB/year** |

This is a *small* database. Text records, no images, no video. The free/entry tiers of every
provider listed are comfortable for years. Storage is not a cost you need to plan around.

### Connection pooling — the one technical gotcha
Serverless functions start and stop constantly, and each one wants its own database
connection. Postgres allows a limited number (often ~100), so a busy moment can exhaust them
and the site starts erroring.

The fix is a **connection pooler**, and it is why Neon is the recommendation — it is built in.
Practically, this means the app uses the *pooled* connection string. I will configure this;
you just need to know why there are sometimes two connection strings in the dashboard
(a pooled one for the app, a direct one for migrations).

### Backups — non-negotiable
| Setting | Target |
|---|---|
| Automatic daily backups | On |
| Point-in-time recovery | 7 days minimum |
| Restore test | **Run once, before real data goes in, and once more after the pilot** |

An untested backup is a rumour. We will deliberately restore into a scratch database and
confirm the data comes back.

### Access
Nobody logs into the database day to day. Content is managed through the portal. Direct
access is for migrations and emergencies only, and the credentials live in the hosting
dashboard — never in the git repository, never in a chat message.

---

## 6. Domain setup for alpsacademy.az

At your domain registrar you will add DNS records. The exact values come from the hosting
dashboards during setup, but the shape is:

| Record | Name | Points to | Purpose |
|---|---|---|---|
| A or ALIAS | `@` (root) | marketing host | `alpsacademy.az` |
| CNAME | `www` | marketing host | `www.alpsacademy.az` |
| CNAME | `app` | Vercel | `app.alpsacademy.az` (the portal) |

HTTPS certificates are issued and renewed automatically by the platform — nothing to buy,
nothing to remember.

**DNS propagation** takes anywhere from minutes to a few hours the first time. Plan the
switch for a quiet moment, not an hour before a demo.

---

## 7. Environment variables (secrets)

Only two, set in the hosting dashboard — never in git:

| Name | What it is |
|---|---|
| `DATABASE_URL` | The pooled Postgres connection string from Neon |
| `SESSION_SECRET` | A 64-character random string; encrypts the login cookies |

If `SESSION_SECRET` ever changes, everyone is simply logged out — harmless. If either leaks,
rotate it immediately (regenerate in the dashboard, redeploy).

Production and preview environments get **different** database URLs, so test data can never
touch real records.

---

## 8. What still needs adding for production

These are not built yet and are worth knowing before launch:

| Item | Why | Effort |
|---|---|---|
| **Transactional email** (Resend/Postmark) | Password resets and account invitations currently require handing over a temporary password in person | ½ session |
| **Error monitoring** (Sentry) | Right now, if a teacher hits an error at 9pm, nobody finds out | ½ session |
| **Uptime alert** | Get a message if the site goes down | 15 min |
| **MFA for manager accounts** | The highest-value target in the system | 1 session |
| **`robots.txt` / noindex on the portal** | Already set via metadata; verify after deploy | done |

---

## 9. Launch checklist

- [ ] Hosting accounts created (Vercel + Neon), region set to Frankfurt
- [ ] Repository pushed to GitHub, connected to Vercel
- [ ] `DATABASE_URL` and `SESSION_SECRET` set in production
- [ ] `prisma migrate deploy` runs successfully on first deploy
- [ ] Backups enabled, **restore tested into a scratch database**
- [ ] DNS records added; `app.alpsacademy.az` serves the portal over HTTPS
- [ ] Demo/seed data deleted; one real manager account created
- [ ] Manager's temporary password changed on first login
- [ ] All five roles tested from a phone on mobile data (not office wifi)
- [ ] Marketing site deployed to the root domain
- [ ] Error monitoring and uptime alert connected
- [ ] Rollback tested once on purpose, so you have seen it work
