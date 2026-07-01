import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

interface BrandLayoutProps {
  preview: string
  children: React.ReactNode
}

/**
 * Shared luxury brand layout for all auth emails.
 * Black / Deep Crimson / Gold visual identity.
 * Body background stays #ffffff per email infrastructure rules;
 * inner card carries the brand palette.
 */
export const BrandLayout = ({ preview, children }: BrandLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={brandBar}>
          <Text style={brandMark}>
            <span style={brandMarkAccent}>FREE BLEEDERS</span> &nbsp;|&nbsp; MENTORSHIP          </Text>
        </Section>
        <Container style={card}>{children}</Container>
        <Section>
          <Hr style={hr} />
          <Text style={footer}>
            {BRAND_NAME} &middot; {BRAND_TAGLINE}          </Text>
          <Text style={footerSub}>
            Questions? Reach us at{' '}
            <a href="mailto:support@mentorship.freebleeders.org" style={footerLink}>
              support@mentorship.freebleeders.org
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

/* ----- Shared inline styles (exported for individual templates) ----- */

export const h1: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#0a0a0a',
  margin: '0 0 8px',
  letterSpacing: '-0.01em',
  fontFamily: "'Georgia', 'Times New Roman', serif",
}

export const eyebrow: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#8B0000',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  margin: '0 0 14px',
}

export const text: React.CSSProperties = {
  fontSize: '15px',
  color: '#2a2a2a',
  lineHeight: '1.65',
  margin: '0 0 18px',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

export const link: React.CSSProperties = {
  color: '#8B0000',
  textDecoration: 'underline',
  fontWeight: 600,
}

export const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#0a0a0a',
  backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
  color: '#E8C77A',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  borderRadius: '4px',
  padding: '14px 28px',
  textDecoration: 'none',
  border: '1px solid #C9A84C',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

export const codeBox: React.CSSProperties = {
  display: 'block',
  backgroundColor: '#0a0a0a',
  color: '#E8C77A',
  border: '1px solid #C9A84C',
  borderRadius: '6px',
  padding: '20px',
  textAlign: 'center' as const,
  fontFamily: "'Courier New', monospace",
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.4em',
  margin: '0 0 24px',
}

export const notice: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
  lineHeight: '1.55',
  margin: '24px 0 0',
  padding: '14px 16px',
  backgroundColor: '#faf7f0',
  borderLeft: '3px solid #C9A84C',
  borderRadius: '2px',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

/* ----- Layout-only styles ----- */

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: 0,
  padding: '24px 12px',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const outer: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
}

const brandBar: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  padding: '18px 24px',
  borderRadius: '6px 6px 0 0',
  borderBottom: '2px solid #C9A84C',
}

const brandMark: React.CSSProperties = {
  margin: 0,
  color: '#E8C77A',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.22em',
  textAlign: 'center' as const,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
}

const brandMarkAccent: React.CSSProperties = {
  color: '#C9A84C',
}

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #ebe6dc',
  borderTop: 'none',
  padding: '36px 32px',
  borderRadius: '0 0 6px 6px',
}

const hr: React.CSSProperties = {
  borderColor: '#ebe6dc',
  margin: '28px 0 16px',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#8a8a8a',
  textAlign: 'center' as const,
  margin: '0 0 4px',
  letterSpacing: '0.04em',
}

const footerSub: React.CSSProperties = {
  fontSize: '11px',
  color: '#a8a8a8',
  textAlign: 'center' as const,
  margin: 0,
}

const footerLink: React.CSSProperties = {
  color: '#8B0000',
  textDecoration: 'none',
  fontWeight: 600,
}
