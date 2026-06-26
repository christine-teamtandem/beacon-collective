import type { ComponentType } from 'react'
import { template as testEmail } from './test-email'
import { template as composedMessage } from './composed-message'
import { template as weeklyZoomCheckin } from './weekly-zoom-checkin'
import { template as sessionScheduled } from './session-scheduled'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'test-email': testEmail,
  'composed-message': composedMessage,
  'weekly-zoom-checkin': weeklyZoomCheckin,
  'session-scheduled': sessionScheduled,
}
