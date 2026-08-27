# Alps Academy — Management Portal

Private, role-based management platform for Alps Academy: CRM for leads,
student profiles with measurable academic progress, task tracking, exams,
attendance, report cards and role-specific dashboards.

**This is not a public website.** Accounts are created by a manager; there is no
self-registration, and the app is excluded from search engines.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | PostgreSQL via Prisma |
| Auth | Email-or-phone + password, encrypted HttpOnly session cookies |
| Styling | Tailwind CSS |
| Validation | zod on every write endpoint |

## Running locally

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate dev
npm run seed              # optional demo data
npm run dev
```

Open http://localhost:3000 — you land on the login screen.

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (use the **pooled** one in production) |
| `SESSION_SECRET` | 64-character random string that encrypts login cookies |
| `DEMO_PASSWORD` | Optional. Overrides all demo account passwords when seeding |

Generate a session secret with `openssl rand -hex 32`.

## Useful commands

```bash
npm run dev                                    # local development
npm run build                                  # production build (runs migrations)
npx tsx prisma/create-admin.ts "Name" email    # first real manager account
npx tsx prisma/wipe-demo-data.ts               # remove demo data before real use
npx prisma studio                              # browse the database
```

## Documentation

| Document | Contents |
|---|---|
| [docs/TESTING.md](docs/TESTING.md) | Full manual test plan, role by role |
| [docs/REQUIREMENTS_STATUS.md](docs/REQUIREMENTS_STATUS.md) | Coverage against the original build brief |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting options, database management, how deploys work |
| [docs/MANAGER_BRIEFING.md](docs/MANAGER_BRIEFING.md) | Plain-language explanation and decision list |
| [docs/LMS_BUILD_PLAN.md](docs/LMS_BUILD_PLAN.md) | Original phased build plan |

## Security notes

- All permission checks run server-side; queries are scoped to the caller
  (teachers see only their groups, parents only their children).
- Internal notes are never serialised into student or parent responses.
- Login is rate-limited; passwords are hashed with bcrypt.
- Accounts created by a manager start with a temporary password and are
  confined to the change-password screen until it is replaced.
