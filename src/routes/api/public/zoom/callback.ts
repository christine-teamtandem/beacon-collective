import { createFileRoute, redirect } from "@tanstack/react-router";

const ZOOM_TOKEN = "https://zoom.us/oauth/token";

function siteUrl() {
  return process.env.PUBLIC_SITE_URL || "https://mentorship.freebleeders.org";
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
          throw redirect({ to: "/calendar", search: { zoom: "error" } as any });
        }
        if (!code || !state) {
          return new Response("Missing code/state", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: stateRow, error: stErr } = await supabaseAdmin
          .from("zoom_oauth_states")
          .select("user_id, created_at")
          .eq("state", state)
          .maybeSingle();
        if (stErr || !stateRow) return new Response("Invalid state", { status: 400 });

        // Reject states older than 15 min
        if (Date.now() - new Date(stateRow.created_at).getTime() > 15 * 60_000) {
          return new Response("State expired", { status: 400 });
        }
        await supabaseAdmin.from("zoom_oauth_states").delete().eq("state", state);

        const clientId = process.env.ZOOM_CLIENT_ID;
        const clientSecret = process.env.ZOOM_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return new Response("Zoom not configured", { status: 500 });
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
            redirect_uri: `${siteUrl()}/api/public/zoom/callback`,
          }),
        });
        if (!tokenRes.ok) {
          const t = await tokenRes.text();
          console.error("Zoom token exchange failed", t);
          return new Response("Token exchange failed", { status: 500 });
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
          return new Response("Failed to store connection", { status: 500 });
        }

        return new Response(null, { status: 302, headers: { Location: "/calendar?zoom=connected" } });
      },
    },
  },
});
