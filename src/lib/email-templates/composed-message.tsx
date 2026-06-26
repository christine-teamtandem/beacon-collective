import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { BRAND_EMAIL_HEADER, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

interface Props {
  senderName?: string
  senderRole?: string
  subject?: string
  body?: string
}

const ComposedMessage = ({ senderName, senderRole, subject, body }: Props) => {
  const paragraphs = (body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject || `A message from ${BRAND_NAME}`}</Preview>
      <Body style={main}>
        <Container style={outer}>

          {/* ── Brand header bar ─────────────────────────────── */}
          <Section style={headerBar}>
            <Text style={headerMarkText}>
              <span style={headerMarkAccent}>FREE BLEEDERS</span>
              &nbsp;&nbsp;|&nbsp;&nbsp;MENTORSHIP
            </Text>
          </Section>

          {/* ── Main dark card ────────────────────────────────── */}
          <Container style={card}>

            {/* Crimson section banner */}
            <Section style={crimsonBanner}>
              <Text style={crimsonBannerText}>MESSAGE FROM THE HUB</Text>
            </Section>

            {/* Subject heading */}
            <Heading style={h1}>{subject || 'A message for you'}</Heading>

            {/* Body paragraphs */}
            <Section style={bodySection}>
              {paragraphs.length === 0 ? (
                <Text style={bodyText}>{body || ''}</Text>
              ) : (
                paragraphs.map((p, i) => (
                  <Text key={i} style={bodyText}>{p}</Text>
                ))
              )}
            </Section>

            <Hr style={divider} />

            {/* Attribution */}
            <Text style={attribution}>
              Sent by{' '}
              <strong style={attributionName}>{senderName || 'A member'}</strong>
              {senderRole ? (
                <span style={attributionRole}>{` (${senderRole})`}</span>
              ) : null}
              {' '}through {BRAND_NAME}.
            </Text>

          </Container>

          {/* ── Footer ───────────────────────────────────────── */}
          <Section style={footerSection}>
            <Text style={footerBrand}>{BRAND_NAME}</Text>
            <Text style={footerSub}>{BRAND_TAGLINE}</Text>
            <Text style={footerLinks}>
              <Link href="mailto:support@mentorship.freebleeders.org" style={footerLink}>
                Contact Support
              </Link>
              &nbsp;&nbsp;&middot;&nbsp;&nbsp;
              <Link href="https://mentorship.freebleeders.org" style={footerLink}>
                Visit Platform
              </Link>
              &nbsp;&nbsp;&middot;&nbsp;&nbsp;
              <Link href="https://mentorship.freebleeders.org/unsubscribe" style={footerLinkMuted}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerSub}>
              You received this because you are a member of {BRAND_NAME}.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ComposedMessage,
  subject: (data: Record<string, any>) =>
    data.subject || `Message from ${BRAND_NAME}`,
  displayName: 'Hub composed message',
  previewData: {
    senderName: 'Tracy Hamler',
    senderRole: 'admin',
    subject: `Welcome to ${BRAND_NAME}`,
    body: `Hi,\n\nThis is a sample message sent from the hub.\n\n${BRAND_TAGLINE}\n\nWith intention,\nThe Free Bleeders Team`,
  },
} satisfies TemplateEntry

export default ComposedMessage

// ─── Inline styles ────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  margin: 0,
  padding: '32px 12px',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const outer: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
}

const headerBar: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  padding: '20px 28px',
  borderRadius: '8px 8px 0 0',
  borderBottom: '2px solid #C9A84C',
  textAlign: 'center' as const,
}

const headerMarkText: React.CSSProperties = {
  margin: 0,
  color: '#E8C77A',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.24em',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const headerMarkAccent: React.CSSProperties = {
  color: '#C9A84C',
}

const card: React.CSSProperties = {
  backgroundColor: '#141414',
  border: '1px solid #C9A84C',
  borderTop: 'none',
  padding: '36px 36px 28px',
}

const crimsonBanner: React.CSSProperties = {
  backgroundColor: '#8B0000',
  padding: '9px 16px',
  margin: '0 0 28px',
  borderRadius: '3px',
  textAlign: 'center' as const,
}

const crimsonBannerText: React.CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const h1: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#E8E4DD',
  margin: '0 0 22px',
  letterSpacing: '-0.01em',
  lineHeight: '1.3',
  fontFamily: "'Georgia', 'Times New Roman', serif",
}

const bodySection: React.CSSProperties = {
  margin: '0 0 24px',
}

const bodyText: React.CSSProperties = {
  fontSize: '15px',
  color: '#E8E4DD',
  lineHeight: '1.72',
  margin: '0 0 16px',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  whiteSpace: 'pre-wrap' as const,
}

const divider: React.CSSProperties = {
  borderTop: '1px solid #2a2a2a',
  borderColor: '#2a2a2a',
  margin: '24px 0 18px',
}

const attribution: React.CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  margin: 0,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const attributionName: React.CSSProperties = {
  color: '#C9A84C',
}

const attributionRole: React.CSSProperties = {
  color: '#8B0000',
}

const footerSection: React.CSSProperties = {
  backgroundColor: '#0d0d0d',
  padding: '20px 28px',
  borderRadius: '0 0 8px 8px',
  borderTop: '1px solid #1f1f1f',
  textAlign: 'center' as const,
}

const footerBrand: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#C9A84C',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const footerLinks: React.CSSProperties = {
  fontSize: '11px',
  color: '#666666',
  margin: '0 0 8px',
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const footerLink: React.CSSProperties = {
  color: '#8B0000',
  textDecoration: 'none',
  fontWeight: 600,
}

const footerLinkMuted: React.CSSProperties = {
  color: '#555555',
  textDecoration: 'none',
}

const footerSub: React.CSSProperties = {
  fontSize: '10px',
  color: '#444444',
  margin: 0,
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}
