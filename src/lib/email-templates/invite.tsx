import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandLayout, button, eyebrow, h1, link, notice, text } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <BrandLayout preview={`You've been invited to join ${siteName}`}>
    <Text style={eyebrow}>Private invitation</Text>
    <Text style={h1}>You've been invited</Text>
    <Text style={text}>
      You've been personally invited to join{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      . Accept your invitation below to create your account and begin.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept Invitation
    </Button>
    <Text style={notice}>
      If you weren't expecting this invitation, no action is required — you can
      safely ignore this email.
    </Text>
  </BrandLayout>
)

export default InviteEmail
