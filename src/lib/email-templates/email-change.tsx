import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandLayout, button, eyebrow, h1, link, notice, text } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandLayout preview={`Confirm your email change for ${siteName}`}>
    <Text style={eyebrow}>Account update</Text>
    <Text style={h1}>Confirm your email change</Text>
    <Text style={text}>
      You requested to change the email on your {siteName} account from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
    <Text style={text}>Confirm this change by clicking below:</Text>
    <Button style={button} href={confirmationUrl}>
      Confirm Email Change
    </Button>
    <Text style={notice}>
      If you didn't request this change, please secure your account immediately
      by resetting your password.
    </Text>
  </BrandLayout>
)

export default EmailChangeEmail
