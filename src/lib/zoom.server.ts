/**
 * Server-only Zoom helpers shared between createServerFn handlers and
 * scheduled hooks. Never import this from client code — *.server.* files
 * are blocked from the client bundle.
 */

const ZOOM_TOKEN = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";

type ZoomConnection = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  zoom_email: string | null;
  zoom_user_id: string | null;
};

/**
 * Returns a valid (auto-refreshed if needed) Zoom connection for a user,
 * or `null` if the user has not connected Zoom.
 */
export async function getValidZoomConnection(userId: string): Promise<ZoomConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn } = await supabaseAdmin
    .from("zoom_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conn) return null;

  // Still valid (with 60s safety window)
  if (new Date(conn.expires_at).getTime() - 60_000 > Date.now()) {
    return conn as ZoomConnection;
  }

  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(ZOOM_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) {
    console.error("Zoom token refresh failed", await res.text());
    return null;
  }
  const tok = await res.json();
  const updated = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? conn.refresh_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    scope: tok.scope ?? conn.scope,
  };
  await supabaseAdmin.from("zoom_connections").update(updated).eq("user_id", userId);
  return { ...conn, ...updated } as ZoomConnection;
}

export interface EnsuredZoomMeeting {
  zoom_url: string;
  zoom_meeting_id: string;
  zoom_start_url: string | null;
  zoom_passcode: string | null;
}

/**
 * Ensures a Zoom meeting exists for the given session row. If `zoom_url`
 * is already set, returns it as-is. Otherwise, creates a fresh meeting via
 * the mentor's Zoom connection (refreshing the token if needed) and
 * persists join/start/meeting_id/passcode on the session row.
 */
export async function ensureZoomMeetingForSession(session: {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  mentor_id: string;
  zoom_url: string | null;
  zoom_meeting_id: string | null;
  zoom_start_url: string | null;
  zoom_passcode: string | null;
}): Promise<EnsuredZoomMeeting | null> {
  if (session.zoom_url && session.zoom_meeting_id) {
    return {
      zoom_url: session.zoom_url,
      zoom_meeting_id: session.zoom_meeting_id,
      zoom_start_url: session.zoom_start_url,
      zoom_passcode: session.zoom_passcode,
    };
  }
  if (!session.mentor_id) return null;

  const conn = await getValidZoomConnection(session.mentor_id);
  if (!conn) return null;

  const duration = Math.max(
    15,
    Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000),
  );

  const res = await fetch(`${ZOOM_API}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: session.title,
      type: 2,
      start_time: new Date(session.starts_at).toISOString(),
      duration,
      timezone: "UTC",
      agenda: session.description ?? undefined,
      settings: { join_before_host: false, waiting_room: true, mute_upon_entry: true },
    }),
  });
  if (!res.ok) {
    console.error("Zoom meeting create failed", await res.text());
    return null;
  }
  const meeting = await res.json();
  const persisted: EnsuredZoomMeeting = {
    zoom_url: meeting.join_url,
    zoom_meeting_id: String(meeting.id),
    zoom_start_url: meeting.start_url ?? null,
    zoom_passcode: meeting.password ?? null,
  };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("sessions").update(persisted).eq("id", session.id);
  return persisted;
}
