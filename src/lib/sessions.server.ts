/**
 * Server-only session scheduling helpers: confirmation emails with calendar
 * deep links after a Zoom meeting is created.
 */

import { buildCalendarLinks } from "@/lib/calendar-links";
import type { EnsuredZoomMeeting } from "@/lib/zoom.server";

const PROGRAM_LABEL: Record<string, string> = {
  vanguard: "Vanguard Brotherhood",
  flow: "Flow Collective",
};

const DISPLAY_TIMEZONE = "Asia/Manila";
const TIMEZONE_LABEL = "Asia/Manila (PHT)";

export function formatSessionWhen(startsAt: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toISOString();
  }
}

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  program: string;
  starts_at: string;
  ends_at: string;
  mentor_id: string | null;
  participant_id: string | null;
};

type Recipient = { userId: string; role: "mentor" | "mentee" };

export async function sendSessionScheduledNotifications(
  session: SessionRow,
  zoom: EnsuredZoomMeeting,
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const recipients: Recipient[] = [];
  if (session.mentor_id) recipients.push({ userId: session.mentor_id, role: "mentor" });
  if (session.participant_id && session.participant_id !== session.mentor_id) {
    recipients.push({ userId: session.participant_id, role: "mentee" });
  }
  if (recipients.length === 0) return { sent: 0, skipped: 0, errors: ["No recipients"] };

  const { data: mentorProfile } = session.mentor_id
    ? await supabaseAdmin.from("profiles").select("full_name").eq("id", session.mentor_id).maybeSingle()
    : { data: null as { full_name: string | null } | null };
  const { data: participantProfile } = session.participant_id
    ? await supabaseAdmin.from("profiles").select("full_name").eq("id", session.participant_id).maybeSingle()
    : { data: null as { full_name: string | null } | null };

  const mentorName = mentorProfile?.full_name || "Your Mentor";
  const participantName = participantProfile?.full_name || "Participant";
  const whenLabel = formatSessionWhen(session.starts_at);
  const programLabel = PROGRAM_LABEL[session.program] ?? session.program;

  const calendarDescription =
    `${session.description ? session.description + "\n\n" : ""}` +
    `Join Zoom: ${zoom.zoom_url}` +
    (zoom.zoom_meeting_id ? `\nMeeting ID: ${zoom.zoom_meeting_id}` : "") +
    (zoom.zoom_passcode ? `\nPasscode: ${zoom.zoom_passcode}` : "");

  const calLinks = buildCalendarLinks({
    title: `${programLabel}: ${session.title}`,
    description: calendarDescription,
    location: zoom.zoom_url,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
  });

  const { TEMPLATES } = await import("@/lib/email-templates/registry");
  const template = TEMPLATES["session-scheduled"];
  if (!template) return { sent: 0, skipped: recipients.length, errors: ["Template missing"] };

  const { render } = await import("@react-email/components");
  const React = await import("react");
  const { sendBrandedEmail } = await import("@/lib/email-sender.server");
  const { getResendFrom } = await import("@/lib/config.server");

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { userId, role } of recipients) {
    const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr || !userRes?.user?.email) {
      skipped++;
      continue;
    }
    const recipientEmail = userRes.user.email.toLowerCase();

    const { data: supp } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipientEmail)
      .maybeSingle();
    if (supp) {
      skipped++;
      continue;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const recipientName = profile?.full_name || (role === "mentor" ? "Mentor" : "Friend");

    const templateData = {
      recipientName,
      recipientRole: role,
      mentorName,
      participantName,
      programLabel,
      sessionTitle: session.title,
      sessionNotes: session.description ?? undefined,
      whenLabel,
      timezoneLabel: TIMEZONE_LABEL,
      joinUrl: zoom.zoom_url,
      meetingId: zoom.zoom_meeting_id ?? undefined,
      passcode: zoom.zoom_passcode ?? undefined,
      startUrl: role === "mentor" ? (zoom.zoom_start_url ?? undefined) : undefined,
      googleCalUrl: calLinks.google,
      outlookCalUrl: calLinks.outlook,
      yahooCalUrl: calLinks.yahoo,
    };

    const messageId = `session-scheduled-${session.id}-${userId}`;
    const element = React.createElement(template.component, templateData);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(templateData) : template.subject;

    const sendRes = await sendBrandedEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      messageId,
      from: getResendFrom(),
      label: "session-scheduled",
    });

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "session-scheduled",
      recipient_email: recipientEmail,
      status: sendRes.ok ? "sent" : "failed",
      error_message: sendRes.ok ? null : sendRes.error,
    });

    if (sendRes.ok) sent++;
    else {
      skipped++;
      errors.push(`${recipientEmail}: ${sendRes.error}`);
    }
  }

  return { sent, skipped, errors };
}
