import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandLayout, button, eyebrow, h1, notice, text } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <BrandLayout preview={`Your sign-in link for ${siteName}`}>
    <Text style={eyebrow}>One-click sign in</Text>
    <Text style={h1}>Your sign-in link</Text>
    <Text style={text}>
      Use the button below to sign in to {siteName}. No password required.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Log In
    </Button>
    <Text style={notice}>
      This link will expire shortly. If you didn't request a sign-in link, you
      can safely ignore this email.
    </Text>
  </BrandLayout>
)

export default MagicLinkEmail
