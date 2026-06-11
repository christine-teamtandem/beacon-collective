import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  recipient?: string
  triggeredBy?: string
}

const TestEmail = ({ recipient, triggeredBy }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Email pipeline test — freebleeders mentorship hub</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your email pipeline is working ✅</Heading>
        <Text style={text}>
          This is a test email from <strong>freebleeders mentorship hub</strong>.
          If you received it, sending from <code>notify.mentorship.freebleeders.org</code> is live.
        </Text>
        <Section style={panel}>
          <Text style={meta}><strong>Recipient:</strong> {recipient || '—'}</Text>
          <Text style={meta}><strong>Triggered by:</strong> {triggeredBy || 'system'}</Text>
          <Text style={meta}><strong>Time:</strong> {new Date().toUTCString()}</Text>
        </Section>
        <Text style={footer}>
          Sent automatically by the admin hub diagnostics.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: '[Test] freebleeders mentorship hub email pipeline',
  displayName: 'Pipeline test',
  previewData: { recipient: 'admin@example.test', triggeredBy: 'admin@example.test' },
} satisfies TemplateEntry

export default TestEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#0b0b0b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.55', margin: '0 0 20px' }
const panel = { background: '#f6f6f8', borderRadius: '10px', padding: '14px 16px', margin: '0 0 24px' }
const meta = { fontSize: '13px', color: '#27272a', margin: '4px 0' }
const footer = { fontSize: '12px', color: '#71717a', margin: '20px 0 0' }
