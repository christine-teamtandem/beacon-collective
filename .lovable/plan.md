Malaki ang scope, kaya hahatiin ko sa **2 rounds** para malinis ang build at madaling i-review. Round 1 ngayon, Round 2 sa susunod na message.

## Round 1 — Foundations (gagawin ko ngayon)

### A. Program separation (Vanguard vs Flow — hindi na magsasama)
- Bawat program may sariling route tree at sidebar: `/vanguard/...` at `/flow/...`
- Hindi makikita ng Vanguard mentee ang Flow content (at vice versa) — enforced sa server + RLS
- Bawat program may sariling accent color: **Vanguard = gold**, **Flow = rose**
- Bawat user na naka-assign sa isang program ay auto-redirect sa kanyang program hub

### B. Admin assignment & monitoring (Admin-only)
- Bagong `/admin` area (admin role lang ang makakapasok)
- **Students page**: lahat ng mentees — search, filter by program/status, **assign to Vanguard/Flow**, assign to mentor, edit profile, deactivate
- **Mentor assignment**: i-link ang mentee sa mentor
- **Per-student monitor**: view ng workbook entries, weekly progress, tracking logs ng kahit sinong student
- Mentees sign up walang program (defaults to "unassigned"); admin ang nag-aassign

### C. New sidebar dashboard UI (360Learning / E-learning vibe)
- Iiwan ang dating top-nav `AppHeader`. Bagong **persistent sidebar** (shadcn `sidebar`) + clean white/navy palette w/ program accent
- Sidebar items (mentee): Dashboard, My Workbook, Curriculum, Resources, Calendar, Announcements, Messages, Profile
- Sidebar items (mentor): Dashboard, My Mentees, Curriculum, Resources, Calendar, Announcements, Messages, Profile
- Sidebar items (admin): Dashboard, Students, Mentors, Programs, Resources, Announcements, Reports
- Role-based main dashboard view:
  - **Mentee**: stat cards (current week, workbook progress, sessions attended, hours), active workbook card, upcoming session, recent announcements
  - **Mentor**: stat cards (total mentees, pending reviews, this week's sessions), mentee list with engagement indicators
  - **Admin**: stat cards (total students, mentors, active programs, weekly engagement), recent assignments
- Collapsible sidebar, mobile-responsive (drawer on mobile)

### D. Resource library (upload/download)
- Lovable Cloud Storage bucket per program (`resources-vanguard`, `resources-flow`) — private
- Mentors/admins can upload PDFs, workbooks, links (tagged by week)
- Mentees see only their program's resources
- Download with signed URLs

## Round 2 — Communication (next message, after Round 1 lands)
- Integrated calendar (sessions w/ Zoom link field, ICS export)
- Announcements feed (program-scoped, mentor/admin post)
- Realtime 1:1 mentor↔mentee chat + cohort group chat (Supabase Realtime)

Splitting it para hindi sumabog ang build at madali mong i-test bawat layer.

---

## Technical sketch (for the curious)

**New tables (Round 1):**
- `resources` (id, program, week, title, description, file_path, uploaded_by, created_at)
- Extend `profiles.program` enum already exists; add `status` ('active'|'pending'|'inactive')
- `mentor_assignments` already exists — reuse for mentor↔mentee linkage

**Routing:**
```text
src/routes/
  _authenticated/
    route.tsx                  (existing gate)
    dashboard.tsx              (router → /vanguard or /flow based on assignment; unassigned → waiting page)
    vanguard/
      route.tsx                (program guard + gold sidebar shell)
      index.tsx                (program dashboard)
      workbook.tsx, curriculum.tsx, curriculum.$week.tsx,
      resources.tsx, profile.tsx
    flow/
      (same as vanguard, rose accent)
    admin/
      route.tsx                (admin role guard + admin sidebar)
      index.tsx                (admin dashboard)
      students.tsx, students.$id.tsx,
      mentors.tsx, resources.tsx
```

**Sidebar:** new `components/AppSidebar.tsx` driven by role + program; `SidebarProvider` wraps `_authenticated/route.tsx`. Old `AppHeader` keeps trigger + user menu.

**Storage:** two private buckets via `storage_create_bucket`; RLS on `storage.objects` scoped by `(bucket_id, profiles.program)`; signed-URL download via a `createServerFn`.

**Server functions:** `listStudents`, `assignProgram`, `assignMentor`, `getStudentDetail`, `listResources`, `uploadResource`, `getResourceDownloadUrl` — all with `requireSupabaseAuth` + role/program checks.

**Migrations needed (Round 1):** add `profiles.status`, create `resources` table + GRANTs + RLS, ensure `program_type` enum has both values, helper function `get_user_program(uuid)`. Two private storage buckets created via tool (not SQL).

Confirm para mag-proceed ako sa Round 1, or sabihin kung anong iaadjust.