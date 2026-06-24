# Beacon Collective — Mentorship Platform

Status report and technical overview of the Freebleeders / Beacon Collective mentorship app.

- **Preview:** https://id-preview--2963ad52-8cbb-43f1-b67a-1b16a33439a8.lovable.app
- **Published:** https://beacon-collective.lovable.app
- **Custom domain:** https://mentorship.freebleeders.org

---

## 1. Project overview

A private mentorship platform serving two cohort programs:

- **The Vanguard Brotherhood** — 3-month elite mentorship for young men aged 12–18 (12 weekly sessions).
- **The Flow Collective** — 6-month sisterhood circle for young women aged 12–18 with bleeding disorders (24 weekly circles; 12 foundational weeks ship today).

The platform supports four roles — **admin, mentor, mentee, parent** — with curriculum delivery, 1:1 and group messaging, scheduled Zoom sessions, resources, tracking, a workbook, parent links, announcements, and a transactional email pipeline.

---

## 2. Tech stack

**Frontend**
- React 19 + TypeScript (strict mode)
- TanStack Start v1 / TanStack Router (file-based routing, SSR-capable)
- TanStack Query v5
- Tailwind CSS v4 (token-driven via `src/styles.css`)
- shadcn/ui on Radix primitives, Lucide icons, Sonner, Recharts
- react-hook-form + Zod, date-fns

**Backend (in-app)**
- `createServerFn` server functions (`@tanstack/react-start`)
- Public HTTP endpoints under `/api/public/*` (Zoom OAuth callback)
- Lovable email routes under `/lovable/email/*` (send / preview / queue / webhook / suppression / unsubscribe)

**Data, auth, storage**
- Lovable Cloud (Supabase): Postgres with RLS, Auth, Storage
- Private storage buckets: `resources-vanguard`, `resources-flow`
- `pgmq` queues for email delivery + DLQ

**Build / runtime**
- Vite 7, Bun for installs
- Cloudflare Worker runtime with `nodejs_compat`

---

## 3. Feature status

### Fully working
- **Auth** — email/password + Google OAuth via Lovable broker. New users get a `profiles` row and a default `mentee` role via the `handle_new_user` trigger; `role` can be overridden through signup metadata.
- **Role model** — `admin | mentor | mentee | parent` stored in `user_roles`, checked through security-definer functions `has_role`, `is_admin`, `get_user_role`.
- **Admin "View as" preview** — admins can preview the mentor/mentee/parent experience per program (`ViewAsBar` + `useUserContext`).
- **Dashboard** — landing surface for each role.
- **People** directory.
- **Announcements** — admin/mentor posts visible to relevant cohorts.
- **Calendar / Sessions** — schedule sessions with title, description, start/end.
- **Messages + Compose** — 1:1 direct threads auto-provisioned by `ensure_direct_thread` on `mentor_assignments`; per-program group threads auto-provisioned by `ensure_program_group_membership` on profile change.
- **Resources** — per-program private storage buckets surfaced through the `resources` table.
- **Tracking logs** — health/activity tracking entries.
- **Workbook** — private reflection entries.
- **Parent linking** — `parent_links` join + parent dashboard via `parent.functions.ts`.
- **Admin console** — user management and role grants via `admin.functions.ts`.
- **Curriculum**
  - Program hub at `/hub/$program`.
  - 12-week list at `/curriculum`.
  - Per-week page at `/curriculum/$week` with:
    - `WeekLessons` — admins/mentors author lesson/module/topic notes; mentees read.
    - `WeekMaterials` — file uploads (PDF, slides, etc.) and video/link assets per week.
- **Zoom integration** — OAuth connect/disconnect, refresh-on-demand, create scheduled meeting bound to a `sessions` row (stores `join_url`, `start_url`, `meeting_id`).
- **Transactional email** — Resend-backed pipeline with React Email templates (`test-email`, `composed-message`, auth flows: invite, magic link, recovery, signup, reauth, email change), queued through pgmq with DLQ fallback.

### In progress / partial
- Flow program advertises 24 weekly circles; only the foundational 12 weeks are encoded in `src/lib/curriculum.ts`.
- `DonateModal` UI exists; not yet wired to a payment provider.
- Lovable AI Gateway key (`LOVABLE_API_KEY`) is provisioned but not consumed by any feature yet.

---

## 4. File structure (key paths)

```
src/
├── routes/
│   ├── __root.tsx                       # App shell, head meta, auth listener
│   ├── index.tsx                        # Public landing
│   ├── auth.tsx                         # Sign in / sign up
│   ├── unsubscribe.tsx
│   ├── _authenticated/
│   │   ├── route.tsx                    # Managed ssr:false auth gate
│   │   ├── dashboard.tsx
│   │   ├── people.tsx
│   │   ├── announcements.tsx
│   │   ├── calendar.tsx
│   │   ├── compose.tsx
│   │   ├── messages.tsx
│   │   ├── resources.tsx
│   │   ├── tracking.tsx
│   │   ├── workbook.tsx
│   │   ├── reports.tsx
│   │   ├── admin.tsx
│   │   ├── hub.$program.tsx
│   │   ├── curriculum.index.tsx         # Week list
│   │   └── curriculum.$week.tsx         # Week detail (lessons + materials)
│   ├── api/public/zoom/callback.ts      # Zoom OAuth return
│   ├── lovable/email/*                  # Send / preview / queue / webhook / suppression
│   └── email/unsubscribe.ts
├── components/
│   ├── AppHeader.tsx, AppSidebar.tsx
│   ├── ViewAsBar.tsx                    # Admin preview banner + picker
│   ├── WeekLessons.tsx                  # Lesson CRUD per week
│   ├── WeekMaterials.tsx                # Per-week assets
│   ├── AddChildDialog.tsx, CreateAccountDialog.tsx, DonateModal.tsx
│   └── ui/*                             # shadcn primitives
├── hooks/
│   └── useSession.ts                    # Session + role + program + view-as
├── lib/
│   ├── curriculum.ts                    # Program metadata + 12-week topics
│   ├── admin.functions.ts               # Admin server fns
│   ├── parent.functions.ts              # Parent dashboard server fns
│   ├── compose.functions.ts             # Compose / messaging server fns
│   ├── zoom.functions.ts                # Zoom OAuth + meeting create
│   ├── email/send.ts                    # Client → /lovable/email/transactional/send
│   ├── email-templates/                 # React Email templates + registry
│   └── config.server.ts
└── integrations/supabase/               # Auto-generated clients + middleware
    ├── client.ts, client.server.ts
    ├── auth-middleware.ts, auth-attacher.ts
    └── types.ts
```

---

## 5. Database schema (public, all RLS-enabled)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Per-user profile, joins `auth.users` | `id` (= auth user id), `full_name`, `program` |
| `user_roles` | Role assignments (one user → many roles) | `user_id`, `role` (`admin\|mentor\|mentee\|parent`) |
| `mentor_assignments` | Mentor ↔ mentee pairing | `mentor_id`, `mentee_id` → triggers direct chat |
| `parent_links` | Parent ↔ child relationship | `parent_id`, `child_id` |
| `chat_threads` | Direct or group thread | `kind` (`direct\|group`), `program`, `cohort` |
| `chat_thread_members` | Membership | `thread_id`, `user_id` |
| `chat_messages` | Messages | `thread_id`, `author_id`, `body` |
| `announcements` | Program/cohort posts | `program`, `title`, `body`, `author_id` |
| `sessions` | Scheduled meetings | `starts_at`, `ends_at`, `zoom_url`, `zoom_meeting_id`, `zoom_start_url`, `created_by` |
| `resources` | Pointers into per-program storage | `program`, `bucket`, `path`, `title` |
| `tracking_logs` | Health/activity tracking | `user_id`, `category`, `value`, `notes` |
| `workbook_entries` | Private reflections | `user_id`, `week`, `prompt`, `body` |
| `weekly_progress` | Per-week completion + notes | `user_id`, `program`, `week_number` |
| `week_lessons` | Mentor/admin lesson notes per week | `program`, `week_number`, `title`, `body`, `author_id`, `position` |
| `zoom_connections` | OAuth tokens per user | `user_id`, `access_token`, `refresh_token`, `expires_at`, `zoom_user_id` |
| `zoom_oauth_states` | CSRF state for OAuth | `state`, `user_id` |
| `email_send_log` | History | `template`, `recipient`, `status` |
| `email_send_state` | Idempotency | `idempotency_key`, `status` |
| `email_unsubscribe_tokens` | One-time unsubscribe tokens | `token`, `email` |
| `suppressed_emails` | Bounces / unsubscribes | `email`, `reason` |

**Storage buckets** (private): `resources-vanguard`, `resources-flow` — mapped to programs through the `bucket_program(_bucket)` function.

**Security-definer helpers** (all `SECURITY DEFINER`, fixed `search_path`):
`has_role`, `is_admin`, `get_user_role`, `get_user_program`, `is_thread_member`, `bucket_program`, `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.

**Triggers**:
- `handle_new_user` on `auth.users` → inserts `profiles` + default `user_roles`.
- `ensure_program_group_membership` on `profiles` → adds user to the program group thread.
- `ensure_direct_thread` on `mentor_assignments` → creates mentor↔mentee direct thread.
- `touch_updated_at` on tables with `updated_at`.

**RLS posture** — every public table has RLS enabled with policies scoped to `auth.uid()` and `has_role(...)`. Examples:
- `week_lessons`: read for admins, users in the matching program, and mentors of mentees in that program; write for the author or any admin.
- `chat_messages`: read/write only for members of the thread (via `is_thread_member`).
- `resources`: scoped to program membership.

---

## 6. Integrations & external APIs

| Integration | Purpose | Secrets |
|---|---|---|
| Lovable Cloud (Supabase) | DB, Auth, Storage | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only) |
| Lovable AI Gateway | Reserved for AI features | `LOVABLE_API_KEY` (not yet consumed) |
| Zoom OAuth + API | Schedule meetings per session | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`; callback `/api/public/zoom/callback` |
| Lovable email (Resend-backed) | Auth + transactional email | Managed by platform |
| Google OAuth | Sign-in | Brokered by Lovable (`lovable.auth.signInWithOAuth("google", …)`) |

---

## 7. Pending tasks / TODOs

- Encode the remaining **Flow weeks 13–24** in `src/lib/curriculum.ts`, or formally scope Flow at 12 weeks.
- Wire **Lovable AI** into a real surface (AI-assisted lesson drafting, mentor coaching prompts, tracking-log summaries).
- No **automated tests** in repo.
- No **analytics / observability** beyond the Reports page.
- `DonateModal` is **not connected to a payment provider** (Stripe / Paddle not enabled).
- No **admin UI** for the email queue / DLQ inspection.

---

## 8. Known bugs & architectural limitations

- **Curriculum sidebar link** does not navigate when the user is already on `/curriculum/$week`. Workaround: the "← Back to curriculum" button on the week page.
- **Mobile polish** for `AppSidebar` and several dialogs is uneven across protected routes.
- **Realtime chat** isn't using Supabase realtime subscriptions yet — `messages.tsx` relies on query invalidation, which can feel slow under load.
- **Zoom token refresh** assumes Zoom rotates the refresh token; revocation mid-session surfaces a raw error toast instead of a guided reconnect.
- **Cloudflare Worker runtime** disallows `child_process`, `sharp`, `puppeteer`, native modules, and `fs.watch`. Any future PDF/image processing must be edge-safe or moved to a background job.
- **Email pipeline** depends on pgmq; DLQ exists but cannot be inspected from the UI.
- **Auth callback path** must remain a public route — never point an OAuth `redirect_uri` directly into `_authenticated/*`, or the gate bounces the session before hydration.

---

## 9. Recommended next features (prioritized)

1. **AI-assisted lesson drafting + tracking-log summaries** (uses the existing `LOVABLE_API_KEY`).
2. **Supabase realtime on `chat_messages`** for live messaging + unread badges in the sidebar.
3. **Unified mentee progress view** tying `weekly_progress` + `workbook_entries` + `tracking_logs` for mentors and parents.
4. **Session reminders + `.ics` calendar invites** via the existing email pipeline.
5. **Admin email queue / DLQ inspector** page.
6. **Flow curriculum expansion** to the full 24-week arc.
7. **Optional Stripe/Paddle** for the donation modal.

---

## 10. Running locally

```bash
bun install
bun run dev
```

Environment variables (`SUPABASE_*`, `ZOOM_*`, `LOVABLE_API_KEY`) are provisioned by Lovable Cloud — no manual `.env` setup required for the managed preview. The production site is published at the URLs at the top of this document.
