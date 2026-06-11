import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

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
      <Preview>{subject || 'New message from freebleeders mentorship hub'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>FREEBLEEDERS</Text>
          <Heading style={h1}>{subject || 'A message for you'}</Heading>
          <Section>
            {paragraphs.length === 0 ? (
              <Text style={text}>{body || ''}</Text>
            ) : paragraphs.map((p, i) => (
              <Text key={i} style={text}>{p}</Text>
            ))}
          </Section>
          <Hr style={hr} />
          <Text style={meta}>
            <strong>{senderName || 'A member'}</strong>
            {senderRole ? ` (${senderRole})` : ''} sent this message through the
            freebleeders mentorship hub.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ComposedMessage,
  subject: (data: Record<string, any>) => data.subject || 'Message from freebleeders mentorship hub',
  displayName: 'Hub composed message',
  previewData: {
    senderName: 'Tracy Hamler',
    senderRole: 'admin',
    subject: 'Welcome to our mentorship hub',
    body: 'Hi,\n\nThis is a sample message sent from the hub.\n\nThanks!',
  },
} satisfies TemplateEntry

export default ComposedMessage

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 28px', maxWidth: '600px' }
const brand = { fontSize: '11px', color: '#a16207', letterSpacing: '0.18em', textTransform: 'uppercase' as const, margin: '0 0 8px', fontWeight: 700 as const }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0b0b0b', margin: '0 0 18px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#27272a', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const hr = { borderTop: '1px solid #e5e7eb', margin: '24px 0 14px' }
const meta = { fontSize: '12px', color: '#71717a', margin: 0 }
