
## Goal

Send a branded weekly Zoom check-in email to every mentee (and a mentor variant with the host start URL) for sessions happening in the upcoming week. Delivery must complete every Saturday morning before 12:00 noon, using the existing `pgmq` + `process-email-queue` pipeline.

## 1. Email template

New file: `src/lib/email-templates/weekly-zoom-checkin.tsx`

- React Email component, deep crimson + gold on light card / black text, matching the existing premium tone (no Lorem Ipsum, English copy).
- Props (all passed via `templateData`):
  - `recipientName`, `recipientRole` (`"mentee" | "mentor"`)
  - `mentorName`, `menteeName` (mentee variant shows mentor; mentor variant shows mentee/cohort)
  - `programLabel` (`Vanguard Brotherhood` / `Flow Collective`)
  - `sessionTitle`, `startsAtIso`, `endsAtIso`, `timezoneLabel`
  - `joinUrl`, `meetingId`, `passcode?`, `startUrl?` (mentor-only)
- Renders date/time formatted server-side (passed in pre-formatted) plus a prominent "Join Zoom" CTA. Mentor variant adds a "Start meeting (host)" secondary CTA and the passcode block.
- Subject: `Weekly check-in: {sessionTitle} — {weekdayDate}`.
- Register in `src/lib/email-templates/registry.ts` under key `weekly-zoom-checkin`.

## 2. Schema additions (migration)

- Add `zoom_passcode text` to `public.sessions` so the template can show it (Zoom create call already returns it — we'll persist it going forward; existing rows simply render without passcode).
- Update `src/lib/zoom.functions.ts` (`createZoomMeetingForSession`) to store `password` from the Zoom API response into `zoom_passcode`.
- Add idempotency table `public.weekly_checkin_sends (session_id uuid, user_id uuid, sent_for_week date, primary key (session_id, user_id, sent_for_week))` with grants + RLS (service role only) so re-runs never double-send.

## 3. Server route that builds + enqueues the batch

New public hook: `src/routes/api/public/hooks/weekly-zoom-checkin.ts` (POST).

- Auth: require `apikey` header equal to the project anon key (canonical cron pattern); reject otherwise.
- Uses `supabaseAdmin` (service role) inside the handler.
- Query:
  - Select `sessions` where `starts_at` is between `now()` and `now() + interval '7 days'` and `zoom_url is not null`.
  - For each session resolve recipients:
    - Mentor → `profiles` row for `mentor_id` (+ email via `auth.admin.getUserById`).
    - Mentees → for direct sessions (no `cohort`) use `mentor_assignments` where `mentor_id = session.mentor_id`; for program/cohort sessions use all `profiles` with matching `program` (and `cohort` when set) and role `mentee` via `user_roles`.
  - Skip pairs already present in `weekly_checkin_sends` for the current ISO week.
- For each recipient:
  1. Pre-render with `render()` from `@react-email/components` against `weekly-zoom-checkin`.
  2. Insert a `pending` row into `email_send_log` (message_id = uuid).
  3. Call `supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: { message_id, template_name, recipient_email, subject, html, from, ... } })` using the exact payload shape the existing `/lovable/email/queue/process` worker consumes (mirror what `/lovable/email/transactional/send` enqueues).
  4. Insert into `weekly_checkin_sends`.
- Returns `{ queued, skipped, errors }` JSON for observability.

This reuses the existing transactional queue, suppression checks, retries, and DLQ logic — no new sender code.

## 4. Saturday-morning schedule (pg_cron)

Applied via `supabase--insert` (not a migration — contains project URL + anon key):

```sql
select cron.schedule(
  'weekly-zoom-checkin-enqueue',
  '0 1 * * 6',  -- Saturday 01:00 UTC = 09:00 Asia/Manila, well before noon
  $$
  select net.http_post(
    url := 'https://project--2963ad52-8cbb-43f1-b67a-1b16a33439a8.lovable.app/api/public/hooks/weekly-zoom-checkin',
    headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

The existing `process-email-queue` cron already drains `transactional_emails` every 5 seconds, so the whole batch finishes within minutes — comfortably before 12:00 noon. If a different timezone is desired we can adjust the cron expression.

## 5. Admin trigger (optional but cheap)

Add a "Send weekly Zoom check-ins now" button on `/admin` that hits the same hook with the anon key (admin-only UI), so admins can run/re-run the batch on demand without waiting for Saturday.

## Technical notes

- All times rendered into the email are computed server-side using `date-fns` `format` with `Asia/Manila` (configurable constant) so the email shows the user-facing local time, while DB stays UTC.
- Cohort detection: `cohort is null` ⇒ direct pair; otherwise treat as program/cohort group session.
- Idempotency: `(session_id, recipient_user_id, sent_for_week)` uniqueness + suppression list check inside `process-email-queue` already prevents duplicate sends.
- No file attachments, no marketing copy — strictly transactional weekly notice.
- The hook is on `/api/public/*` so the published worker bypasses auth at the edge; security comes from the `apikey` check inside the handler.

## Deliverables checklist

1. `src/lib/email-templates/weekly-zoom-checkin.tsx` + registry entry.
2. Migration: add `sessions.zoom_passcode`, create `weekly_checkin_sends` table with grants/RLS.
3. Update `zoom.functions.ts` to persist `password` on meeting create.
4. New route `src/routes/api/public/hooks/weekly-zoom-checkin.ts`.
5. `cron.schedule` insert for Saturday 01:00 UTC.
6. Admin "Run now" button on `/admin`.
