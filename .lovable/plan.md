
# Round 3 — Super Admin, Account Setup, Curriculum & Notifications

All copy in English. Built in two passes so each layer is testable.

---

## Pass 1 — Super Admin Portal & Account Creation

### A. Super Admin Portal (`/admin`)
New admin-only landing under sidebar group "Super Admin":
- `/admin` — overview (counts of mentees/mentors/parents per program, pending approvals, recent activity)
- `/admin/accounts` — create + manage all accounts (replaces old People for admins)
- `/admin/assignments` — mentor ↔ mentee pairings with monitoring metrics
- `/admin/curriculum` — admin-only curriculum structure editor (week titles, objectives, prompts)
- `/admin/branding` — per-program logo + accent (deferred to Round 4 if needed)

### B. Account Creation Flows
One serverFn `createAccount` (admin-only, uses `supabaseAdmin.auth.admin.createUser`) handles all roles. Admin UI at `/admin/accounts` has tabs:

1. **Admin** — email, full name → role `admin`. Temp password emailed.
2. **Mentor** — email, name, program (Vanguard/Flow), cohort → role `mentor`.
3. **Mentee** — email, name, program, optional `assigned_mentor_id`, optional `parent_id` → role `mentee`.
4. **Parent** — email, name → role `parent`. After creation, parent can log in and use a **"Add my child"** flow on their dashboard.

### C. Parent → Mentee creation (parent-side, two modes)
On the parent dashboard, **"Add a child"** button opens a dialog with two options:
- **Invite with email** — kid receives login credentials and their own account (parent_links row created).
- **Manage without email** — parent creates a child profile (random placeholder email `child-<uuid>@managed.local`, `managed_by_parent = true`); parent can switch into the child's view from their own dashboard. No login created.

ServerFn `parentCreateChild` (requires `requireSupabaseAuth` + role check `parent`).

### D. Auth page updates
Public `/auth` keeps email/password + Google sign-in only for **existing** users. New accounts must be created by admin (or parents for kids). Remove open signup; show "Contact your program admin to get an account" message under the form.

---

## Pass 2 — Dual-Hub Navigation, Curriculum Editing, Notifications

### E. Vanguard / Flow Hub Switcher
- Sidebar gets a **Hub switcher** at the top (visible only to admin). Toggle between Vanguard (gold theme) and Flow (rose theme) — sets `viewing_program` in sessionStorage, re-themes the shell, filters all lists (people, sessions, announcements, resources, curriculum) to that program.
- Dedicated public-facing routes for admins/marketing share: `/hub/vanguard` and `/hub/flow` — themed landing dashboards with program-specific stats, sessions, announcements, members.
- Non-admin users stay locked to their assigned program (no switcher shown).

### F. Curriculum Editing (mentor + admin, "all of the above")
Extend existing curriculum tables:
- New `curriculum_weeks` table: `program`, `week_number`, `title`, `objective`, `workbook_prompt`, `cohort` (nullable — null = core, set = cohort override), `updated_by`.
- New `curriculum_content` table: `week_id`, `kind` ('pdf'|'video'|'link'|'note'), `title`, `url`, `storage_path`, `cohort`, `uploaded_by`.
- RLS:
  - Admin: full read/write on `curriculum_weeks` (core rows where cohort is null) + all content.
  - Mentor: read core weeks, write cohort overrides + upload content for their cohort/program.
  - Mentee: read core + their cohort overrides.
- Routes:
  - `/admin/curriculum` — admin edits core 12 weeks (titles/objectives/prompts) per program.
  - `/curriculum/$week` already exists — extend with "Edit week" (mentor: cohort override) and "Upload content" buttons.

### G. Notifications (in-app + email)
**In-app:**
- New `notifications` table: `user_id`, `kind` ('announcement'|'message'|'session_reminder'|'curriculum_upload'), `title`, `body`, `link`, `read_at`, `created_at`.
- Realtime subscription in `AppSidebar` shows a bell icon + unread count + dropdown list.
- DB triggers populate notifications on insert into `announcements`, `chat_messages`, `curriculum_content`, and a cron job for session reminders.

**Email (via Lovable Emails):**
- Run `setup_email_infra` + `scaffold_transactional_email`.
- Templates (all English): `new-announcement`, `new-message`, `session-reminder`, `new-curriculum-content`, plus `account-invite` (used by `createAccount` to send temp password).
- A serverFn `dispatchNotification(notificationId)` is called from the notification-creating triggers via `pg_net` → `/api/public/hooks/notify`, which enqueues the matching email template for the recipient. Mentees can toggle per-channel preferences on a new `/settings/notifications` page (`notification_prefs` JSON column on profiles).
- Session reminders: pg_cron every 5 min scans `sessions` starting in 55–65 min and enqueues reminder emails + in-app notifications.

---

## Technical sketch

**Migrations (Pass 1):**
- `profiles`: add `managed_by_parent boolean`, `notification_prefs jsonb default '{"announcement":true,"message":true,"session_reminder":true,"curriculum_upload":true}'`.
- Helper RPC `is_admin(uuid)`.

**Migrations (Pass 2):**
- `curriculum_weeks`, `curriculum_content` + GRANTs + RLS.
- `notifications` table + GRANTs + RLS + realtime publication.
- Triggers on `announcements`, `chat_messages`, `curriculum_content` → insert notifications.
- pg_cron job `session-reminders` every 5 min.

**ServerFns:**
- `admin.functions.ts`: `createAccount`, `listAllAccounts`, `updateAccount`, `deleteAccount`.
- `parent.functions.ts`: `parentCreateChild`, `parentListChildren`.
- `curriculum.functions.ts`: `listWeeks`, `upsertWeek`, `uploadContent`, `listContent`.
- `notifications.functions.ts`: `listMyNotifications`, `markRead`, `updatePrefs`, `dispatchNotification`.

**Routes:**
- `src/routes/_authenticated/admin/index.tsx`, `accounts.tsx`, `assignments.tsx`, `curriculum.tsx`
- `src/routes/_authenticated/hub/vanguard.tsx`, `hub/flow.tsx`
- `src/routes/_authenticated/settings/notifications.tsx`
- `src/routes/api/public/hooks/notify.ts`

**Components:**
- `HubSwitcher.tsx` (sidebar header for admin)
- `NotificationBell.tsx` (header)
- `AddChildDialog.tsx`, `CreateAccountDialog.tsx`, `EditWeekDialog.tsx`, `UploadContentDialog.tsx`

**Sidebar updates:**
- Admins see: Hub switcher, Super Admin group (Overview, Accounts, Assignments, Curriculum), plus existing modules.
- Parents see: My Children, Announcements, Calendar.
- Mentees/Mentors: existing nav + Notifications settings.

---

Confirm and I'll start with **Pass 1** (super admin + account creation), then **Pass 2** (curriculum + dual hub + notifications + email).
