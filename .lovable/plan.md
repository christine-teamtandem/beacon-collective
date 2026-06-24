## Goal

Create a single `README.md` at the project root that serves as a complete status report of the Beacon Collective / Freebleeders Mentorship app — features, architecture, schema, integrations, known issues, and recommended next steps.

## Deliverable

One file: `README.md` (overwrites the current one if present).

## Outline of the README

1. **Project overview** — Beacon Collective mentorship platform for two programs (Vanguard Brotherhood — young men 12–18; Flow Collective — young women 12–18 with bleeding disorders).

2. **Tech stack**
   - Frontend: React 19 + TypeScript (strict), TanStack Router/Start v1, TanStack Query v5, Tailwind CSS v4, shadcn/Radix UI, Lucide icons, Sonner, Recharts, date-fns, react-hook-form + Zod.
   - Backend: TanStack Start server functions (`createServerFn`) + a few public `/api/public/*` routes (Zoom OAuth callback, email webhooks/queue/unsubscribe).
   - Data/auth/storage: Lovable Cloud (Supabase) — Postgres + RLS, Auth, Storage buckets `resources-vanguard` / `resources-flow`, pgmq email queue.
   - Build/deploy: Vite 7, Cloudflare Worker runtime (nodejs_compat). Published at `mentorship.freebleeders.org`.

3. **Feature status — what works today**
   - Auth: email/password + Google OAuth via Lovable broker; role auto-assigned via `handle_new_user` trigger (default `mentee`).
   - Role model: `admin`, `mentor`, `mentee`, `parent` in `user_roles` with `has_role` / `is_admin` / `get_user_role` security-definer functions.
   - Admin **View-as** preview (admin can preview mentor/mentee/parent + program) via `ViewAsBar`/`useUserContext`.
   - Dashboard, People directory, Announcements, Calendar/Sessions, Compose & Messages (1:1 + program group threads auto-provisioned by `ensure_program_group_membership` / `ensure_direct_thread`), Reports, Resources (per-program private storage buckets), Tracking logs, Workbook entries, Parent linking, Admin console.
   - Curriculum: program hub (`hub.$program.tsx`) + 12-week curriculum list + per-week page with:
     - `WeekLessons` — admins/mentors author lesson/module/topic notes; mentees read.
     - `WeekMaterials` — per-week file/video assets (PDF, video links, etc.).
   - Zoom integration: OAuth connect/disconnect, token refresh, create scheduled meeting per session, stores join/start URL on `sessions` row.
   - Transactional email pipeline: Resend-style templates (`test-email`, `composed-message`, auth emails), `/lovable/email/*` routes for send/preview/queue/suppression/unsubscribe, pgmq queue helpers (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`).

4. **File structure (key paths)**
   - `src/routes/__root.tsx` — shell, head meta, auth state listener.
   - `src/routes/_authenticated/route.tsx` — managed `ssr:false` auth gate.
   - `src/routes/_authenticated/*.tsx` — feature pages listed above.
   - `src/routes/api/public/zoom/callback.ts` — Zoom OAuth return.
   - `src/routes/lovable/email/*` — email send/preview/queue/webhook/suppression/unsubscribe.
   - `src/components/` — `AppHeader`, `AppSidebar`, `ViewAsBar`, `WeekLessons`, `WeekMaterials`, `AddChildDialog`, `CreateAccountDialog`, `DonateModal`, `ui/*`.
   - `src/lib/` — `curriculum.ts` (program metadata + 12-week topic data), `admin.functions.ts`, `parent.functions.ts`, `compose.functions.ts`, `zoom.functions.ts`, `email/send.ts`, `email-templates/*`.
   - `src/hooks/useSession.ts` — session + role + program + view-as.
   - `src/integrations/supabase/*` — auto-generated clients and middleware.

5. **Database schema (public tables, all RLS-enabled)**
   Document each with purpose, key columns and relationships:
   - `profiles` (id → auth.users, full_name, program, …)
   - `user_roles` (user_id, role enum: admin/mentor/mentee/parent)
   - `mentor_assignments` (mentor_id, mentee_id) — triggers direct chat thread.
   - `parent_links` (parent_id, child_id)
   - `chat_threads`, `chat_thread_members`, `chat_messages` (kind: direct/group; program group auto-membership).
   - `announcements`
   - `sessions` (title, starts_at/ends_at, zoom_url, zoom_meeting_id, zoom_start_url, created_by)
   - `resources` (program-scoped pointers to storage objects)
   - `tracking_logs`
   - `workbook_entries`
   - `weekly_progress`
   - `week_lessons` (program, week_number, title, body, author_id, position) — RLS: read for admins + program-matched users + mentors of program mentees; write for author or admin.
   - `zoom_connections` / `zoom_oauth_states`
   - `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`
   - Security-definer helpers: `has_role`, `is_admin`, `get_user_role`, `get_user_program`, `is_thread_member`, `bucket_program`.
   - Triggers: `handle_new_user` (auth.users), `ensure_program_group_membership` (profiles), `ensure_direct_thread` (mentor_assignments), `touch_updated_at` on timestamped tables.
   - Storage buckets: `resources-vanguard`, `resources-flow` (private).

6. **Integrations & external APIs**
   - Lovable Cloud (Supabase) — DB, Auth, Storage.
   - Lovable AI Gateway — `LOVABLE_API_KEY` present (not yet consumed by a feature).
   - Zoom OAuth — `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` configured; callback at `/api/public/zoom/callback`.
   - Lovable email (Resend-backed) — auth templates, transactional send, suppression, unsubscribe.
   - Google OAuth via Lovable broker.

7. **Pending tasks / TODOs / in-progress**
   - Flow program advertises 24 weekly circles but `curriculum.ts` only ships the foundational 12 weeks — extend to 24 or document as intentional.
   - Lovable AI key is provisioned but not yet wired to any feature (good candidate: AI-assisted lesson drafting or mentor coaching prompts).
   - No automated tests in repo.
   - No analytics/observability surfaces beyond Reports page.
   - `DonateModal` exists but donations are not wired to a payment provider (Stripe/Paddle not enabled).

8. **Known bugs / architectural limitations**
   - Curriculum sidebar link does not navigate when already inside `/curriculum/$week`; users must use the "Back to curriculum" button (UX papercut).
   - Mobile-first polish for `AppSidebar` and dialogs is uneven across the protected routes.
   - Cloudflare Worker runtime: no `child_process`, `sharp`, etc. — any future PDF/image processing must be edge-safe or moved to a background job.
   - Email pipeline depends on pgmq; DLQ handling exists but no admin UI to inspect failures.
   - Realtime chat updates rely on query invalidation, not Supabase realtime subscriptions — messages page may feel slow under load.
   - Zoom token refresh assumes `refresh_token` rotation; if Zoom revokes mid-session the user sees a raw error toast.

9. **Recommended next features (prioritized)**
   1. Wire Lovable AI to draft week lessons and summarize tracking logs for mentors.
   2. Add Supabase realtime to `chat_messages` for live messaging + unread counts in sidebar.
   3. Mentee progress dashboard tying `weekly_progress` + `workbook_entries` + `tracking_logs` into one parent/mentor view.
   4. Calendar invites (.ics) and email reminders for upcoming `sessions` using existing email pipeline.
   5. Admin email-queue/DLQ inspector page.
   6. Expand Flow curriculum to the full 24-week arc.
   7. Optional Stripe/Paddle hook-up for `DonateModal`.

10. **How to run / deploy** — `bun install`, `bun run dev`, environment variables already provisioned by Lovable Cloud; published URL noted.

## Notes

- Markdown only, no code execution required.
- Will not modify any feature code in this step.
