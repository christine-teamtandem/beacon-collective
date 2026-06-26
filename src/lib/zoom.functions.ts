import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ZOOM_AUTH = "https://zoom.us/oauth/authorize";

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
      scope: "meeting:write user:read:email user:read:user",
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

    // Use the session mentor's Zoom connection (same path as the weekly check-in hook).
    const { ensureZoomMeetingForSession } = await import("@/lib/zoom.server");
    const zoom = await ensureZoomMeetingForSession({
      id: session.id,
      title: session.title,
      description: session.description,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      mentor_id: session.mentor_id ?? "",
      zoom_url: session.zoom_url,
      zoom_meeting_id: session.zoom_meeting_id,
      zoom_start_url: session.zoom_start_url,
      zoom_passcode: session.zoom_passcode,
    });
    if (!zoom) {
      throw new Error(
        "Could not create Zoom meeting — the session mentor must connect Zoom first (Calendar → Connect Zoom).",
      );
    }

    return { ok: true, joinUrl: zoom.zoom_url, meetingId: zoom.zoom_meeting_id };
  });
