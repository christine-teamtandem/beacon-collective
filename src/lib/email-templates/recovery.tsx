import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandLayout, button, eyebrow, h1, notice, text } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <BrandLayout preview={`Reset your password for ${siteName}`}>
    <Text style={eyebrow}>Security</Text>
    <Text style={h1}>Reset your password</Text>
    <Text style={text}>
      We received a request to reset your password for {siteName}. Choose a new
      password by selecting the button below.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Reset Password
    </Button>
    <Text style={notice}>
      This link expires shortly for your security. If you didn't request a
      reset, ignore this message — your password will remain unchanged.
    </Text>
  </BrandLayout>
)

export default RecoveryEmail
