import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandLayout, codeBox, eyebrow, h1, notice, text } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandLayout preview="Your verification code">
    <Text style={eyebrow}>Verification required</Text>
    <Text style={h1}>Confirm reauthentication</Text>
    <Text style={text}>
      Use the verification code below to confirm your identity:
    </Text>
    <Text style={codeBox}>{token}</Text>
    <Text style={notice}>
      This code will expire shortly. If you didn't request this, you can safely
      ignore this email.
    </Text>
  </BrandLayout>
)

export default ReauthenticationEmail
