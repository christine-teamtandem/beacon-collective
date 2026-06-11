Malaking scope ulit — hahatiin sa **2 sub-rounds** para malinis ang build at madaling i-test bawat layer.

---

## Round 2A — Communication & Scheduling (gagawin ngayon)

### 1. Calendar + Zoom sessions
- New table `sessions` (program, mentor_id, cohort, title, starts_at, ends_at, zoom_url, notes, created_by)
- Mentor/admin: create/edit/delete sessions for their mentees
- Mentee: read-only calendar view of their program/cohort sessions + "Join Zoom" button when within ±15 min
- Route `/calendar` — month + agenda view (shadcn `calendar` + list)
- Dashboard widget: "Upcoming Zoom Schedule" (next 3)

### 2. Announcements Feed
- New table `announcements` (program, title, body, author_id, pinned, created_at)
- Mentor/admin posts → scoped sa program nila
- Mentee sees only their program's feed
- Route `/announcements` + dashboard "Latest Announcements" widget (top 3)
- Simple unread badge sa sidebar (compares `last_seen_announcements_at` on profile)

### 3. Realtime Chat (1:1 + group) + Presence
- Tables:
  - `chat_threads` (id, kind: 'direct'|'group', program, cohort, title)
  - `chat_thread_members` (thread_id, user_id, last_read_at)
  - `chat_messages` (thread_id, sender_id, body, created_at)
- 1:1 auto-thread between mentee ↔ assigned mentor (lookup via existing `mentor_assignments`)
- Group thread per program/cohort, auto-membership
- Mentees can ONLY see threads they belong to (RLS via thread_members)
- Realtime via `supabase_realtime` publication + `presence` channel for online/active dots
- Route `/messages` — thread list left, message pane right, presence indicator
- Mentor "Help Questions" inbox = direct threads with mentees

### 4. Realtime notifications (lightweight)
- Toast (sonner) on new announcement / new direct message / new session within next hour
- Sidebar dot counters from realtime channels

---

## Round 2B — Admin Power Tools (next message after 2A lands)

### 5. Assignment monitoring
- Admin `/admin/assignments` — table of mentor↔mentees with attendance %, workbook completion %, last activity, message volume
- Per-mentor drill-down
- Mentor view of own mentees' engagement on `/tracking`

### 6. Super Admin Impersonation / Preview Hub
- Admin-only `/admin/users` list with **"Preview Hub"** button per user
- Sets a client-side `impersonate_user_id` (sessionStorage) + server-validated context: any read uses the impersonated user's role/program (admin can re-derive on server through a `getEffectiveContext` serverFn that checks caller is admin first)
- All sidebars/dashboards re-render through the impersonated view
- Floating **"Exit Preview"** banner at top — one click clears impersonation
- **Audit log table** `admin_impersonations` (admin_id, target_user_id, started_at, ended_at)
- Security: server functions accept an optional `impersonate` arg and ONLY honor it if `has_role(caller, 'admin')`; otherwise ignored

### 7. Branding controls
- Admin `/admin/branding`: upload logo per program, accent color override (writes to CSS vars at runtime)
- Stored in `branding` table (program, logo_url, accent_hex)

### 8. Admin account creation
- Admin can create mentees/mentors via Supabase Admin API in a serverFn (uses `supabaseAdmin.auth.admin.createUser`) — sets temp password, sends invite email
- Form: email, full name, role, program, assigned mentor (if mentee)

---

## Technical sketch for 2A

**Migrations:**
- `sessions`, `announcements`, `chat_threads`, `chat_thread_members`, `chat_messages` + GRANTs + RLS
- `profiles.last_seen_announcements_at timestamptz`
- `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for chat_messages, announcements, sessions
- Trigger: when `mentor_assignments` row inserted → auto-create direct `chat_threads` + members; when profile assigned to program → auto-add to program group thread

**RLS highlights:**
- `sessions`: read where `program = get_user_program(auth.uid())` OR admin; write where mentor of that program/cohort OR admin
- `announcements`: read where `program = get_user_program(auth.uid())` OR admin; write where mentor/admin
- `chat_messages`: read where `EXISTS (select 1 from chat_thread_members where thread_id = chat_messages.thread_id and user_id = auth.uid())`; insert same + sender_id = auth.uid()
- `chat_threads`/`chat_thread_members`: similar membership-based

**ServerFns:**
- `listUpcomingSessions`, `createSession`, `updateSession`, `deleteSession`
- `listAnnouncements`, `createAnnouncement`, `markAnnouncementsRead`
- `listMyThreads`, `getThreadMessages`, `sendMessage`, `ensureDirectThread(menteeId)`

**Files:**
- `src/routes/_authenticated/calendar.tsx`, `announcements.tsx`, `messages.tsx`, `messages.$threadId.tsx`
- `src/lib/sessions.functions.ts`, `announcements.functions.ts`, `chat.functions.ts`
- `src/components/PresenceDot.tsx`, `UpcomingSessionsCard.tsx`, `AnnouncementsCard.tsx`
- Sidebar updated to add Calendar / Announcements / Messages

Confirm to proceed with **Round 2A**, then 2B sa susunod.
