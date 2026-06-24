import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Link,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
  recipientRole?: 'mentee' | 'mentor'
  mentorName?: string
  menteeName?: string
  programLabel?: string
  sessionTitle?: string
  whenLabel?: string
  timezoneLabel?: string
  joinUrl?: string
  meetingId?: string
  passcode?: string
  startUrl?: string
  googleCalUrl?: string
  outlookCalUrl?: string
  yahooCalUrl?: string
}

const WeeklyZoomCheckIn = ({
  recipientName, recipientRole = 'mentee', mentorName, menteeName, programLabel,
  sessionTitle = 'Weekly Mentorship Check-in', whenLabel, timezoneLabel,
  joinUrl, meetingId, passcode, startUrl,
}: Props) => {
  const isMentor = recipientRole === 'mentor'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your weekly check-in${whenLabel ? ` — ${whenLabel}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>FREEBLEEDERS · MENTORSHIP</Text>
          <Heading style={h1}>{sessionTitle}</Heading>
          {programLabel && <Text style={pill}>{programLabel}</Text>}

          <Text style={greeting}>
            {recipientName ? `Hello ${recipientName},` : 'Hello,'}
          </Text>
          <Text style={text}>
            {isMentor
              ? `This is your weekly reminder for the upcoming check-in${menteeName ? ` with ${menteeName}` : ''}. Please review the session details below and start the meeting a few minutes early.`
              : `This is your weekly reminder for your upcoming mentorship check-in${mentorName ? ` with ${mentorName}` : ''}. Please join on time and prepared.`}
          </Text>

          <Section style={panel}>
            <Text style={panelLabel}>When</Text>
            <Text style={panelValue}>{whenLabel || 'See your calendar'}</Text>
            {timezoneLabel && <Text style={panelMeta}>{timezoneLabel}</Text>}
          </Section>

          {joinUrl && (
            <Section style={ctaWrap}>
              <Button href={joinUrl} style={primaryBtn}>Join Zoom Meeting</Button>
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

          {isMentor && startUrl && (
            <>
              <Hr style={hr} />
              <Text style={hostHeading}>Host controls</Text>
              <Text style={text}>
                Use the host start link below to open the meeting with host privileges.
              </Text>
              <Section style={ctaWrap}>
                <Button href={startUrl} style={secondaryBtn}>Start Meeting (Host)</Button>
              </Section>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Sent from the freebleeders mentorship hub. If this session no longer
            applies to you, please contact your program lead.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyZoomCheckIn,
  subject: (d: Record<string, any>) =>
    `Weekly check-in: ${d.sessionTitle || 'Mentorship session'}${d.whenLabel ? ` — ${d.whenLabel}` : ''}`,
  displayName: 'Weekly Zoom check-in',
  previewData: {
    recipientName: 'Marcus',
    recipientRole: 'mentee',
    mentorName: 'Coach Anthony',
    programLabel: 'Vanguard Brotherhood',
    sessionTitle: 'Week 6 — Discipline & Direction',
    whenLabel: 'Monday, Jun 29 · 7:00 PM',
    timezoneLabel: 'Asia/Manila (PHT)',
    joinUrl: 'https://zoom.us/j/1234567890',
    meetingId: '123 456 7890',
    passcode: '482915',
  },
} satisfies TemplateEntry

export default WeeklyZoomCheckIn

// Black + deep crimson + gold sophisticated palette
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = {
  padding: '32px 28px', maxWidth: '600px', margin: '0 auto',
  backgroundColor: '#0b0b0b', borderRadius: '14px', color: '#f5f5f4',
}
const brand = {
  fontSize: '10px', color: '#c9a14a', letterSpacing: '0.28em',
  textTransform: 'uppercase' as const, margin: '0 0 14px', fontWeight: 700 as const,
}
const h1 = {
  fontSize: '26px', fontWeight: 700 as const, color: '#f5f5f4',
  margin: '0 0 10px', lineHeight: '1.25',
}
const pill = {
  display: 'inline-block', fontSize: '11px', fontWeight: 600 as const,
  color: '#0b0b0b', backgroundColor: '#c9a14a', padding: '4px 10px',
  borderRadius: '999px', margin: '0 0 20px', letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}
const greeting = { fontSize: '15px', color: '#f5f5f4', margin: '4px 0 8px', fontWeight: 600 as const }
const text = { fontSize: '14px', color: '#d6d3d1', lineHeight: '1.65', margin: '0 0 16px' }
const panel = {
  backgroundColor: '#141414', border: '1px solid #2a2a2a',
  borderLeft: '3px solid #8b0a1a', borderRadius: '10px',
  padding: '14px 18px', margin: '18px 0',
}
const panelLabel = {
  fontSize: '10px', color: '#c9a14a', letterSpacing: '0.18em',
  textTransform: 'uppercase' as const, margin: '0 0 6px', fontWeight: 700 as const,
}
const panelValue = { fontSize: '17px', color: '#f5f5f4', margin: 0, fontWeight: 600 as const }
const panelMeta = { fontSize: '12px', color: '#a8a29e', margin: '4px 0 0' }
const ctaWrap = { textAlign: 'center' as const, margin: '22px 0' }
const primaryBtn = {
  backgroundColor: '#8b0a1a', color: '#ffffff', padding: '13px 28px',
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
const detailRow = { fontSize: '13px', color: '#d6d3d1', margin: '6px 0', lineHeight: '1.5', wordBreak: 'break-all' as const }
const detailKey = { color: '#c9a14a', fontWeight: 600 as const }
const detailVal = { color: '#f5f5f4', fontWeight: 600 as const }
const linkStyle = { color: '#c9a14a', textDecoration: 'underline' }
const hostHeading = {
  fontSize: '11px', color: '#c9a14a', letterSpacing: '0.2em',
  textTransform: 'uppercase' as const, margin: '8px 0 8px', fontWeight: 700 as const,
}
const hr = { borderTop: '1px solid #2a2a2a', margin: '24px 0 14px' }
const footer = { fontSize: '11px', color: '#78716c', margin: 0, lineHeight: '1.6' }
