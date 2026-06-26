import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandLayout, button, eyebrow, h1, link, notice, text } from './_layout'
import { BRAND_TAGLINE } from '@/lib/brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <BrandLayout preview={`Confirm your email for ${siteName}`}>
    <Text style={eyebrow}>Welcome</Text>
    <Text style={h1}>Confirm your email</Text>
    <Text style={text}>
      {BRAND_TAGLINE}
    </Text>
    <Text style={text}>
      Thank you for joining{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      . We're honored to have you in the program.
    </Text>
    <Text style={text}>
      Please confirm the email address{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to activate your account:
    </Text>
    <Button style={button} href={confirmationUrl}>
      Verify Email
    </Button>
    <Text style={notice}>
      If you didn't create an account, you can safely ignore this email — no
      account will be created.
    </Text>
  </BrandLayout>
)

export default SignupEmail
