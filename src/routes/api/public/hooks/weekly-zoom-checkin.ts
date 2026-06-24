import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { buildCalendarLinks } from '@/lib/calendar-links'

const SITE_NAME = 'Freebleeders Mentorship Hub'
const SENDER_DOMAIN = 'notify.mentorship.freebleeders.org'
const FROM_DOMAIN = 'mentorship.freebleeders.org'
const DISPLAY_TIMEZONE = 'Asia/Manila'
const TIMEZONE_LABEL = 'Asia/Manila (PHT)'

const PROGRAM_LABEL: Record<string, string> = {
  vanguard: 'Vanguard Brotherhood',
  flow: 'Flow Collective',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function isoWeekStart(d: Date): string {
  // Saturday "sent_for_week" anchor — use the date of the Saturday run (UTC).
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const diff = (day - 6 + 7) % 7 // days since Saturday
  const sat = new Date(d)
  sat.setUTCDate(d.getUTCDate() - diff)
  return sat.toISOString().slice(0, 10)
}

function formatWhen(startsAt: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    }).format(new Date(startsAt))
  } catch {
    return new Date(startsAt).toISOString()
  }
}

export const Route = createFileRoute('/api/public/hooks/weekly-zoom-checkin')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const expectedKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

        if (!supabaseUrl || !serviceKey || !expectedKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const apikey = request.headers.get('apikey') || request.headers.get('x-api-key')
        if (!apikey || apikey !== expectedKey) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        const now = new Date()
        const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const weekKey = isoWeekStart(now)

        const { data: sessions, error: sErr } = await supabase
          .from('sessions')
          .select('id, program, cohort, mentor_id, title, description, starts_at, ends_at, zoom_url, zoom_meeting_id, zoom_passcode, zoom_start_url')
          .gte('starts_at', now.toISOString())
          .lte('starts_at', horizon.toISOString())

        if (sErr) {
          console.error('weekly-zoom-checkin: sessions fetch failed', sErr)
          return Response.json({ error: sErr.message }, { status: 500 })
        }

        const template = TEMPLATES['weekly-zoom-checkin']
        if (!template) return Response.json({ error: 'Template missing' }, { status: 500 })

        let queued = 0
        let skipped = 0
        const errors: string[] = []

        for (const s of sessions ?? []) {
          // Collect recipient user_ids: mentor + assigned mentees
          const recipients = new Map<string, 'mentor' | 'mentee'>()
          if (s.mentor_id) recipients.set(s.mentor_id, 'mentor')

          if (!s.cohort && s.mentor_id) {
            const { data: assigns } = await supabase
              .from('mentor_assignments')
              .select('mentee_id')
              .eq('mentor_id', s.mentor_id)
            for (const a of assigns ?? []) {
              if (!recipients.has(a.mentee_id)) recipients.set(a.mentee_id, 'mentee')
            }
          } else if (s.program) {
            const { data: mentees } = await supabase
              .from('profiles')
              .select('id')
              .eq('program', s.program)
            // filter to mentees via user_roles
            const ids = (mentees ?? []).map((m) => m.id)
            if (ids.length) {
              const { data: roles } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('user_id', ids)
                .eq('role', 'mentee')
              for (const r of roles ?? []) {
                if (!recipients.has(r.user_id)) recipients.set(r.user_id, 'mentee')
              }
            }
          }

          // Mentor profile for display name
          const { data: mentorProfile } = s.mentor_id
            ? await supabase.from('profiles').select('full_name').eq('id', s.mentor_id).maybeSingle()
            : { data: null as { full_name: string | null } | null }
          const mentorName = mentorProfile?.full_name || 'Your Mentor'

          for (const [userId, role] of recipients) {
            // Idempotency check
            const { data: already } = await supabase
              .from('weekly_checkin_sends')
              .select('session_id')
              .eq('session_id', s.id)
              .eq('user_id', userId)
              .eq('sent_for_week', weekKey)
              .maybeSingle()
            if (already) { skipped++; continue }

            // Resolve email + display name
            const { data: userRes, error: uErr } = await supabase.auth.admin.getUserById(userId)
            if (uErr || !userRes?.user?.email) { skipped++; continue }
            const recipientEmail = userRes.user.email.toLowerCase()

            // Suppression
            const { data: supp } = await supabase
              .from('suppressed_emails').select('id').eq('email', recipientEmail).maybeSingle()
            if (supp) { skipped++; continue }

            const { data: profile } = await supabase
              .from('profiles').select('full_name').eq('id', userId).maybeSingle()
            const recipientName = profile?.full_name || (role === 'mentor' ? 'Mentor' : 'Friend')

            // Unsubscribe token (upsert; ignore conflicts then re-read)
            let unsubscribeToken: string | null = null
            const newToken = generateToken()
            const { error: insErr } = await supabase
              .from('email_unsubscribe_tokens')
              .insert({ email: recipientEmail, token: newToken })
            if (insErr) {
              const { data: existing } = await supabase
                .from('email_unsubscribe_tokens').select('token').eq('email', recipientEmail).maybeSingle()
              unsubscribeToken = existing?.token ?? null
            } else {
              unsubscribeToken = newToken
            }
            if (!unsubscribeToken) { skipped++; continue }

            const templateData = {
              recipientName,
              recipientRole: role,
              mentorName,
              menteeName: role === 'mentor' ? recipientName : undefined,
              programLabel: s.program ? PROGRAM_LABEL[s.program] : undefined,
              sessionTitle: s.title,
              whenLabel: formatWhen(s.starts_at),
              timezoneLabel: TIMEZONE_LABEL,
              joinUrl: s.zoom_url ?? undefined,
              meetingId: s.zoom_meeting_id ?? undefined,
              passcode: s.zoom_passcode ?? undefined,
              startUrl: role === 'mentor' ? (s.zoom_start_url ?? undefined) : undefined,
            }

            const element = React.createElement(template.component, templateData)
            const html = await render(element)
            const text = await render(element, { plainText: true })
            const subject =
              typeof template.subject === 'function'
                ? template.subject(templateData)
                : template.subject

            const messageId = crypto.randomUUID()
            const idempotencyKey = `weekly-checkin-${s.id}-${userId}-${weekKey}`

            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'weekly-zoom-checkin',
              recipient_email: recipientEmail,
              status: 'pending',
            })

            const { error: enqErr } = await supabase.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to: recipientEmail,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: 'weekly-zoom-checkin',
                idempotency_key: idempotencyKey,
                unsubscribe_token: unsubscribeToken,
                queued_at: new Date().toISOString(),
              },
            })

            if (enqErr) {
              errors.push(`${s.id}/${userId}: ${enqErr.message}`)
              await supabase.from('email_send_log').insert({
                message_id: messageId,
                template_name: 'weekly-zoom-checkin',
                recipient_email: recipientEmail,
                status: 'failed',
                error_message: enqErr.message,
              })
              continue
            }

            await supabase.from('weekly_checkin_sends').insert({
              session_id: s.id, user_id: userId, sent_for_week: weekKey,
            })
            queued++
          }
        }

        return Response.json({
          ok: true,
          sessions: sessions?.length ?? 0,
          queued,
          skipped,
          errors: errors.slice(0, 20),
        })
      },
    },
  },
})
