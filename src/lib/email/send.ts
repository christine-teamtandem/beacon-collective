import { supabase } from '@/integrations/supabase/client'

export interface SendEmailInput {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/**
 * Client-side helper to enqueue a transactional email.
 * Forwards the user's JWT so the server can validate the caller.
 */
export async function sendTransactionalEmail(input: SendEmailInput) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not signed in')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    let msg = `Failed to send email (${res.status})`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<{ success: boolean; queued?: boolean; reason?: string }>
}
