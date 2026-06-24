/**
 * Build "Add to Calendar" deep links for Google, Outlook (Office 365),
 * and Yahoo. All times are emitted as UTC.
 */

export interface CalendarEventInput {
  title: string;
  description: string;
  location: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
}

function toUtcCompact(iso: string): string {
  // 20250629T110000Z  (Google / Yahoo format)
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function toIsoSeconds(iso: string): string {
  // 2025-06-29T11:00:00Z  (Outlook format)
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface CalendarLinks {
  google: string;
  outlook: string;
  yahoo: string;
}

export function buildCalendarLinks(e: CalendarEventInput): CalendarLinks {
  const startCompact = toUtcCompact(e.startsAt);
  const endCompact = toUtcCompact(e.endsAt);

  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${startCompact}/${endCompact}`,
    details: e.description,
    location: e.location,
  }).toString()}`;

  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    body: e.description,
    location: e.location,
    startdt: toIsoSeconds(e.startsAt),
    enddt: toIsoSeconds(e.endsAt),
  }).toString()}`;

  const yahoo = `https://calendar.yahoo.com/?${new URLSearchParams({
    v: "60",
    view: "d",
    type: "20",
    title: e.title,
    st: startCompact,
    et: endCompact,
    desc: e.description,
    in_loc: e.location,
  }).toString()}`;

  return { google, outlook, yahoo };
}
