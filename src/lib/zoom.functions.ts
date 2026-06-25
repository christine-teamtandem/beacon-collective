import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ZOOM_AUTH = "https://zoom.us/oauth/authorize";
const ZOOM_TOKEN = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";

export const getZoomConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("zoom_connections")
      .select("zoom_email, zoom_user_id, expires_at, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { connection: data ?? null };
  });

/**
 * Side-effect-free setup info for the UI: the EXACT redirect URI the server
 * will send to Zoom, plus whether credentials are present. The card shows this
 * so users register the same string the server uses (prevents error 4,700).
 */
export const getZoomSetupInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getZoomCredentials, getZoomRedirectUri } = await import("@/lib/config.server");
    const { clientId, clientSecret } = getZoomCredentials();
    return {
      redirectUri: getZoomRedirectUri(),
      configured: Boolean(clientId && clientSecret),
    };
  });

export const getZoomAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getZoomCredentials, getZoomRedirectUri } = await import("@/lib/config.server");
    const { clientId, clientSecret } = getZoomCredentials();
    // Validate BOTH up front — otherwise the user authorizes on Zoom and only
    // then hits a confusing "Token exchange failed" page in the callback.
    const missing = [!clientId && "ZOOM_CLIENT_ID", !clientSecret && "ZOOM_CLIENT_SECRET"].filter(Boolean);
    if (missing.length) {
      throw new Error(`Zoom is not configured: ${missing.join(" and ")} not set.`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const state = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from("zoom_oauth_states")
      .insert({ state, user_id: context.userId });
    if (error) throw new Error(error.message);

    const redirectUri = getZoomRedirectUri();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return { url: `${ZOOM_AUTH}?${params.toString()}`, redirectUri };
  });

export const disconnectZoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("zoom_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function refreshIfNeeded(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn } = await supabaseAdmin
    .from("zoom_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conn) throw new Error("Zoom is not connected. Click Connect Zoom first.");
  if (new Date(conn.expires_at).getTime() - 60_000 > Date.now()) return conn;

  const { getZoomCredentials } = await import("@/lib/config.server");
  const { clientId, clientSecret } = getZoomCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(ZOOM_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }),
  });
  if (!res.ok) throw new Error(`Zoom refresh failed: ${await res.text()}`);
  const tok = await res.json();
  const updated = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? conn.refresh_token,
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    scope: tok.scope ?? conn.scope,
  };
  await supabaseAdmin.from("zoom_connections").update(updated).eq("user_id", userId);
  return { ...conn, ...updated };
}

const CreateInput = z.object({ sessionId: z.string().uuid() });

export const createZoomMeetingForSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sErr || !session) throw new Error("Session not found");

    // Authorization: admin OR session creator
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin && session.created_by !== context.userId) {
      throw new Error("Only the session creator or an admin can create the Zoom meeting.");
    }

    const conn = await refreshIfNeeded(context.userId);
    const duration = Math.max(15, Math.round(
      (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000
    ));

    const res = await fetch(`${ZOOM_API}/users/me/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: session.title,
        type: 2, // scheduled
        start_time: new Date(session.starts_at).toISOString(),
        duration,
        timezone: "UTC",
        agenda: session.description ?? undefined,
        settings: { join_before_host: false, waiting_room: true, mute_upon_entry: true },
      }),
    });
    if (!res.ok) throw new Error(`Zoom create failed: ${await res.text()}`);
    const meeting = await res.json();

    await supabaseAdmin
      .from("sessions")
      .update({
        zoom_url: meeting.join_url,
        zoom_meeting_id: String(meeting.id),
        zoom_start_url: meeting.start_url,
        zoom_passcode: meeting.password ?? null,
      })
      .eq("id", session.id);

    return { ok: true, joinUrl: meeting.join_url, meetingId: String(meeting.id) };
  });
