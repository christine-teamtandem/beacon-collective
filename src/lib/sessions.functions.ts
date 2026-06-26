import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSessionInput = z.object({
  program: z.enum(["vanguard", "flow"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  cohort: z.string().trim().max(80).optional(),
  participant_id: z.string().uuid().optional(),
});

export const createScheduledSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    const start = new Date(data.starts_at);
    const end = new Date(data.ends_at);
    if (end <= start) throw new Error("End time must be after start time.");

    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    const { data: isMentor } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "mentor",
    });
    if (!isAdmin && !isMentor) throw new Error("Only mentors and admins can schedule sessions.");

    if (!isAdmin) {
      const { data: myProgram } = await context.supabase.rpc("get_user_program", {
        _user_id: context.userId,
      });
      if (myProgram !== data.program) {
        throw new Error("You can only schedule sessions for your assigned program.");
      }
    }

    if (data.program === "vanguard" && !data.participant_id) {
      throw new Error("Select a participant for Vanguard Brotherhood sessions.");
    }

    const mentorId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.participant_id) {
      const { data: participant } = await supabaseAdmin
        .from("profiles")
        .select("id, program")
        .eq("id", data.participant_id)
        .maybeSingle();
      if (!participant) throw new Error("Participant not found.");
      if (participant.program !== data.program) {
        throw new Error("Participant must belong to the same program.");
      }

      if (!isAdmin) {
        const { data: pairing } = await supabaseAdmin
          .from("mentor_assignments")
          .select("id")
          .eq("mentor_id", mentorId)
          .eq("mentee_id", data.participant_id)
          .maybeSingle();
        if (!pairing) throw new Error("Participant is not assigned to you.");
      }
    }

    const { data: session, error: insertErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        program: data.program,
        mentor_id: mentorId,
        created_by: context.userId,
        participant_id: data.participant_id ?? null,
        title: data.title,
        description: data.description || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        cohort: data.cohort || null,
      })
      .select("*")
      .single();

    if (insertErr || !session) throw new Error(insertErr?.message || "Failed to create session.");

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
      await supabaseAdmin.from("sessions").delete().eq("id", session.id);
      throw new Error(
        "Could not create Zoom meeting. Connect Zoom on the Calendar page (requires meeting:write scope), then try again.",
      );
    }

    const { sendSessionScheduledNotifications } = await import("@/lib/sessions.server");
    const notify = await sendSessionScheduledNotifications(session, zoom, supabaseAdmin);

    return {
      session: {
        ...session,
        zoom_url: zoom.zoom_url,
        zoom_meeting_id: zoom.zoom_meeting_id,
        zoom_passcode: zoom.zoom_passcode,
      },
      zoomCreated: true,
      emailsSent: notify.sent,
      emailErrors: notify.errors,
    };
  });

export const listSessionParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    const { data: program } = await context.supabase.rpc("get_user_program", {
      _user_id: context.userId,
    });

    let menteeIds: string[] = [];
    if (isAdmin) {
      const { data: mentees } = await context.supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "mentee");
      menteeIds = (mentees ?? []).map((m) => m.user_id);
    } else {
      const { data: assigns } = await context.supabase
        .from("mentor_assignments")
        .select("mentee_id")
        .eq("mentor_id", context.userId);
      menteeIds = (assigns ?? []).map((a) => a.mentee_id);
    }

    if (menteeIds.length === 0) return { participants: [] as { id: string; full_name: string | null }[] };

    let query = context.supabase
      .from("profiles")
      .select("id, full_name, program")
      .in("id", menteeIds)
      .order("full_name", { ascending: true });
    if (program && !isAdmin) query = query.eq("program", program);

    const { data: profiles, error } = await query;
    if (error) throw new Error(error.message);

    return {
      participants: (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name })),
    };
  });
