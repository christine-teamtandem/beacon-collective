
## Scope (in order)

### 1. Admin test email + hub smoke test
- Admin page section "Hub diagnostics" with two buttons:
  - **Send test email to me** — enqueues a `test-email` app email to the admin's address; surfaces the row from `email_send_log` so they can see queued → sent.
  - **Run hub smoke test** — calls a server fn that checks: profiles count, user_roles count, mentor_assignments count, pgmq queues exist, cron job present, last 5 `email_send_log` entries, last 5 `cron.job_run_details`. Returns a pass/fail card per check.
- New template: `src/lib/email-templates/test-email.tsx` (branded, "Your email pipeline is working").

### 2. Admin user management actions
On `/people` (admin view), per-user row dropdown:
- **Reset password** — sends Supabase recovery email (goes through our queue via the existing auth hook).
- **Unlock account** — clears `banned_until` via `auth.admin.updateUserById`.
- **Resend login email** — sends a magic-link email so they can sign in & change password.
- **Add mentor / Add mentee** — already exists via `CreateAccountDialog`; surface both entry buttons clearly at top of People page.

Implemented as new server fns in `src/lib/admin.functions.ts`:
`sendPasswordReset`, `unlockAccount`, `resendLoginEmail`, `sendTestEmail`, `hubSmokeTest`. All gated by `assertAdmin`.

### 3. Compose & send email from the hub
- New route `/_authenticated/compose` with a form:
  - To (multi-select recipients — filtered by sender's role)
  - Subject + body (plain text → wrapped in branded template `composed-message.tsx`)
- New server fn `sendComposedEmail` that enforces recipient rules:
  - **admin** → any mentor, mentee, or parent
  - **mentor** → assigned mentees + their parents + admins
  - **mentee** → other mentees in same program + their own parent(s) + their assigned mentor
  - **parent** → their child(ren) + child's mentor + admins
- Enqueues one email per recipient (idempotency key includes sender + timestamp + recipient).
- "Compose email" button added to sidebar + hub page.

### 4. Zoom OAuth integration
- New tables: `zoom_connections` (per-user OAuth tokens) and `zoom_meetings` (cached meeting metadata linked to `sessions.id`).
- Server route `/api/public/zoom/callback` — OAuth callback, exchanges code, stores encrypted refresh_token via `supabaseAdmin`.
- Server fns: `zoomConnect` (returns auth URL), `zoomDisconnect`, `zoomCreateMeeting(sessionId)`, `zoomRefreshToken` (helper).
- On Session create/edit: "Create Zoom meeting" button; populates `sessions.zoom_join_url`.
- Secrets needed: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` (will request once we start step 4).

## Order of implementation
I'll ship steps 1-3 in this turn (no new secrets needed). Step 4 (Zoom) needs your Zoom OAuth credentials — I'll request them right after step 3 lands.

## Confirm
Reply "go" to proceed, or tell me what to change.
