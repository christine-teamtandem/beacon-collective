import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Link,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND_EMAIL_MARK, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

interface Props {
  recipientName?: string
  recipientRole?: 'mentee' | 'mentor'
  mentorName?: string
  participantName?: string
  programLabel?: string
  sessionTitle?: string
  whenLabel?: string
  timezoneLabel?: string
  sessionNotes?: string
  joinUrl?: string
  meetingId?: string
  passcode?: string
  startUrl?: string
  googleCalUrl?: string
  outlookCalUrl?: string
  yahooCalUrl?: string
}

const SessionScheduledEmail = ({
  recipientName, recipientRole = 'mentee', mentorName, participantName, programLabel,
  sessionTitle = 'Mentorship session', whenLabel, timezoneLabel, sessionNotes,
  joinUrl, meetingId, passcode, startUrl,
  googleCalUrl, outlookCalUrl, yahooCalUrl,
}: Props) => {
  const isMentor = recipientRole === 'mentor'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Session scheduled${whenLabel ? ` — ${whenLabel}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>{BRAND_EMAIL_MARK}</Text>
          <Heading style={h1}>{sessionTitle}</Heading>
          {programLabel && <Text style={pill}>{programLabel}</Text>}

          <Text style={greeting}>
            {recipientName ? `Hello ${recipientName},` : 'Hello,'}
          </Text>
          <Text style={text}>
            {isMentor
              ? `Your Vanguard Brotherhood session${participantName ? ` with ${participantName}` : ''} is confirmed. A Zoom room has been created and calendar links are below.`
              : `Your mentorship session${mentorName ? ` with ${mentorName}` : ''} is confirmed. Tap the gold button below to join on Zoom when it's time.`}
          </Text>

          <Section style={panel}>
            <Text style={panelLabel}>When</Text>
            <Text style={panelValue}>{whenLabel || 'See your calendar'}</Text>
            {timezoneLabel && <Text style={panelMeta}>{timezoneLabel}</Text>}
          </Section>

          {sessionNotes && (
            <Section style={detailBlock}>
              <Text style={panelLabel}>Session notes</Text>
              <Text style={detailRow}>{sessionNotes}</Text>
            </Section>
          )}

          {joinUrl && !isMentor && (
            <Section style={ctaWrap}>
              <Button href={joinUrl} style={goldBtn}>Easy Click — Join Zoom</Button>
            </Section>
          )}

          {joinUrl && isMentor && (
            <Section style={ctaWrap}>
              <Button href={joinUrl} style={primaryBtn}>Join as participant</Button>
            </Section>
          )}

          <Section style={detailBlock}>
            {meetingId && (
              <Text style={detailRow}>
                <span style={detailKey}>Meeting ID:&nbsp;</span>
                <span style={detailVal}>{meetingId}</span>
              </Text>
            )}
            {passcode && (
              <Text style={detailRow}>
                <span style={detailKey}>Passcode:&nbsp;</span>
                <span style={detailVal}>{passcode}</span>
              </Text>
            )}
            {joinUrl && (
              <Text style={detailRow}>
                <span style={detailKey}>Join URL:&nbsp;</span>
                <Link href={joinUrl} style={linkStyle}>{joinUrl}</Link>
              </Text>
            )}
          </Section>

          {(googleCalUrl || outlookCalUrl || yahooCalUrl) && (
            <Section style={calWrap}>
              <Text style={calLabel}>Add to your calendar</Text>
              <Text style={calRow}>
                {googleCalUrl && <Link href={googleCalUrl} style={calLink}>Google</Link>}
                {googleCalUrl && outlookCalUrl && <span style={calSep}>·</span>}
                {outlookCalUrl && <Link href={outlookCalUrl} style={calLink}>Outlook</Link>}
                {(googleCalUrl || outlookCalUrl) && yahooCalUrl && <span style={calSep}>·</span>}
                {yahooCalUrl && <Link href={yahooCalUrl} style={calLink}>Yahoo</Link>}
              </Text>
            </Section>
          )}

          {isMentor && startUrl && (
            <>
              <Hr style={hr} />
              <Text style={hostHeading}>Host controls</Text>
              <Section style={ctaWrap}>
                <Button href={startUrl} style={secondaryBtn}>Start Meeting (Host)</Button>
              </Section>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Sent from {BRAND_NAME}. {BRAND_TAGLINE} Questions? Contact your program lead.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SessionScheduledEmail,
  subject: (d: Record<string, any>) =>
    `Session confirmed: ${d.sessionTitle || 'Mentorship session'}${d.whenLabel ? ` — ${d.whenLabel}` : ''}`,
  displayName: 'Session scheduled confirmation',
  previewData: {
    recipientName: 'Marcus',
    recipientRole: 'mentee',
    mentorName: 'Coach Anthony',
    programLabel: 'Vanguard Brotherhood',
    sessionTitle: 'Week 6 — Discipline & Direction',
    whenLabel: 'Monday, Jun 29 · 7:00 PM',
    timezoneLabel: 'Asia/Manila (PHT)',
    joinUrl: 'https://zoom.us/j/1234567890',
    meetingId: '1234567890',
    passcode: '482915',
    googleCalUrl: 'https://calendar.google.com/calendar/render',
    outlookCalUrl: 'https://outlook.live.com/calendar/0/deeplink/compose',
  },
} satisfies TemplateEntry

export default SessionScheduledEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = {
  padding: '32px 28px', maxWidth: '600px', margin: '0 auto',
  backgroundColor: '#0b0b0b', borderRadius: '14px', color: '#f5f5f4',
  border: '1px solid #C9A84C',
}
const brand = {
  fontSize: '10px', color: '#c9a14a', letterSpacing: '0.28em',
  textTransform: 'uppercase' as const, margin: '0 0 14px', fontWeight: 700 as const,
}
const h1 = {
  fontSize: '26px', fontWeight: 700 as const, color: '#f5f5f4',
  margin: '0 0 10px', lineHeight: '1.25', fontFamily: 'Georgia, serif',
}
const pill = {
  display: 'inline-block', fontSize: '11px', fontWeight: 600 as const,
  color: '#0b0b0b', backgroundColor: '#c9a14a', padding: '4px 10px',
  borderRadius: '999px', margin: '0 0 20px', letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}
const greeting = { fontSize: '15px', color: '#f5f5f4', margin: '4px 0 8px', fontWeight: 600 as const }
const text = { fontSize: '14px', color: '#E8E4DD', lineHeight: '1.65', margin: '0 0 16px' }
const panel = {
  backgroundColor: '#141414', border: '1px solid #2a2a2a',
  borderLeft: '3px solid #8B0000', borderRadius: '10px',
  padding: '14px 18px', margin: '18px 0',
}
const panelLabel = {
  fontSize: '10px', color: '#c9a14a', letterSpacing: '0.18em',
  textTransform: 'uppercase' as const, margin: '0 0 6px', fontWeight: 700 as const,
}
const panelValue = { fontSize: '17px', color: '#f5f5f4', margin: 0, fontWeight: 600 as const }
const panelMeta = { fontSize: '12px', color: '#a8a29e', margin: '4px 0 0' }
const ctaWrap = { textAlign: 'center' as const, margin: '22px 0' }
const goldBtn = {
  backgroundColor: '#C9A84C', color: '#0a0a0a', padding: '14px 32px',
  borderRadius: '8px', fontWeight: 700 as const, fontSize: '15px',
  textDecoration: 'none', display: 'inline-block',
}
const primaryBtn = {
  backgroundColor: '#8B0000', color: '#ffffff', padding: '13px 28px',
  borderRadius: '8px', fontWeight: 600 as const, fontSize: '15px',
  textDecoration: 'none', display: 'inline-block',
}
const secondaryBtn = {
  backgroundColor: 'transparent', color: '#c9a14a',
  border: '1px solid #c9a14a', padding: '11px 24px', borderRadius: '8px',
  fontWeight: 600 as const, fontSize: '14px', textDecoration: 'none',
  display: 'inline-block',
}
const detailBlock = {
  backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a',
  borderRadius: '10px', padding: '14px 18px', margin: '6px 0 4px',
}
const detailRow = { fontSize: '13px', color: '#E8E4DD', margin: '6px 0', lineHeight: '1.5', wordBreak: 'break-all' as const }
const detailKey = { color: '#c9a14a', fontWeight: 600 as const }
const detailVal = { color: '#f5f5f4', fontWeight: 600 as const }
const linkStyle = { color: '#c9a14a', textDecoration: 'underline' }
const hostHeading = {
  fontSize: '11px', color: '#c9a14a', letterSpacing: '0.2em',
  textTransform: 'uppercase' as const, margin: '8px 0 8px', fontWeight: 700 as const,
}
const hr = { borderTop: '1px solid #2a2a2a', margin: '24px 0 14px' }
const footer = { fontSize: '11px', color: '#78716c', margin: 0, lineHeight: '1.6' }
const calWrap = { textAlign: 'center' as const, margin: '16px 0 6px' }
const calLabel = {
  fontSize: '10px', color: '#c9a14a', letterSpacing: '0.22em',
  textTransform: 'uppercase' as const, margin: '0 0 6px', fontWeight: 700 as const,
}
const calRow = { fontSize: '13px', color: '#d6d3d1', margin: 0 }
const calLink = { color: '#f5f5f4', textDecoration: 'none', fontWeight: 600 as const, padding: '0 6px' }
const calSep = { color: '#52525b' }
