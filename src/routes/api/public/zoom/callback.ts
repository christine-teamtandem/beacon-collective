import { createFileRoute } from "@tanstack/react-router";

const ZOOM_TOKEN = "https://zoom.us/oauth/token";

/** Redirect back to the calendar with a short, human-readable reason. */
function backToCalendar(reason: string) {
  const params = new URLSearchParams({ zoom: "error", reason });
  return new Response(null, {
    status: 302,
    headers: { Location: `/calendar?${params.toString()}` },
  });
}

export const Route = createFileRoute("/api/public/zoom/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        if (errorParam) {
          return backToCalendar(url.searchParams.get("error_description") || errorParam);
        }
        if (!code || !state) {
          return backToCalendar("Missing authorization code from Zoom.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getZoomCredentials, getZoomRedirectUri } = await import("@/lib/config.server");

        const { data: stateRow, error: stErr } = await supabaseAdmin
          .from("zoom_oauth_states")
          .select("user_id, created_at")
          .eq("state", state)
          .maybeSingle();
        if (stErr || !stateRow) return backToCalendar("Invalid or already-used sign-in state. Please try connecting again.");

        // Reject states older than 15 min
        if (Date.now() - new Date(stateRow.created_at).getTime() > 15 * 60_000) {
          await supabaseAdmin.from("zoom_oauth_states").delete().eq("state", state);
          return backToCalendar("Sign-in window expired. Please click Connect Zoom again.");
        }
        await supabaseAdmin.from("zoom_oauth_states").delete().eq("state", state);

        const { clientId, clientSecret } = getZoomCredentials();
        if (!clientId || !clientSecret) {
          return backToCalendar("Zoom is not configured (missing client ID or secret).");
        }

        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenRes = await fetch(ZOOM_TOKEN, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: getZoomRedirectUri(),
          }),
        });
        if (!tokenRes.ok) {
          const t = await tokenRes.text();
          console.error("Zoom token exchange failed", t);
          let reason = "Token exchange failed.";
          try {
            const j = JSON.parse(t) as { reason?: string; error?: string };
            if (j.reason === "Invalid client_id or client_secret" || j.error === "invalid_client") {
              reason = "Invalid Zoom client ID or secret — check the values in Lovable settings.";
            } else if (/redirect/i.test(t)) {
              reason = `Redirect URI mismatch. Register exactly: ${getZoomRedirectUri()} in your Zoom app.`;
            } else if (j.reason) {
              reason = j.reason;
            }
          } catch { /* keep default */ }
          return backToCalendar(reason);
        }
        const tok = await tokenRes.json();

        // Get Zoom user info
        let zoomEmail: string | null = null;
        let zoomUserId: string | null = null;
        try {
          const meRes = await fetch("https://api.zoom.us/v2/users/me", {
            headers: { Authorization: `Bearer ${tok.access_token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            zoomEmail = me.email ?? null;
            zoomUserId = me.id ?? null;
          }
        } catch {}

        const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
        const { error: upErr } = await supabaseAdmin
          .from("zoom_connections")
          .upsert({
            user_id: stateRow.user_id,
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: expiresAt,
            scope: tok.scope ?? null,
            zoom_email: zoomEmail,
            zoom_user_id: zoomUserId,
          }, { onConflict: "user_id" });
        if (upErr) {
          console.error("zoom_connections upsert failed", upErr);
          return backToCalendar("Connected to Zoom, but failed to save the connection. Please try again.");
        }

        return new Response(null, { status: 302, headers: { Location: "/calendar?zoom=connected" } });
      },
    },
  },
});
