import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { BRAND_FROM_EMAIL } from '@/lib/brand'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const sendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(998),
  html: z.string().optional(),
  text: z.string().optional(),
  from: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
}).refine((d) => d.html || d.text, { message: 'html or text is required' })

export type SendResendEmailInput = z.infer<typeof sendSchema>

/**
 * Send an email via Resend through the Lovable connector gateway.
 * Requires an authenticated caller. Admins are allowed any `from`;
 * non-admins fall back to the default sender.
 */
export const sendResendEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }) => {
    const { sanitizeEnv, getResendApiKey } = await import('@/lib/config.server')
    const lovableKey = sanitizeEnv(process.env.LOVABLE_API_KEY)
    const resendKey = getResendApiKey()
    if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured')
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

<<<<<<< HEAD
    const from = data.from ?? BRAND_FROM_EMAIL
=======
    const from = data.from ?? 'Free Bleeders Mentorship <onboarding@resend.dev>'
>>>>>>> 53603d23bbc0580446ee745f92e99410419ad806

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': resendKey,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
        html: data.html,
        text: data.text,
        reply_to: data.replyTo,
        cc: data.cc,
        bcc: data.bcc,
      }),
    })

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message =
        (body as { message?: string; error?: string })?.message ??
        (body as { error?: string })?.error ??
        `Resend send failed (${response.status})`
      throw new Error(message)
    }

    return { success: true, id: (body as { id?: string })?.id ?? null }
  })
