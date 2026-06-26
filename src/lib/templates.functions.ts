import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Vision-capable model on the Lovable gateway.
const VISION_MODEL = "google/gemini-3-flash-preview";
const TEXT_MODEL = "google/gemini-3-flash-preview";

function getAiKey(): string {
  const raw = process.env.LOVABLE_API_KEY ?? "";
  return raw.trim().replace(/^['"`]+|['"`]+$/g, "");
}

async function callGateway(body: unknown): Promise<string> {
  const apiKey = getAiKey();
  if (!apiKey) throw new Error("AI unavailable — LOVABLE_API_KEY not set.");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI is busy. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Contact your administrator.");
    const txt = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${txt.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("AI returned an empty response.");
  return out;
}

/** Strip ``` fences and any leading prose so we keep clean HTML only. */
function extractHtml(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const idx = s.search(/<!doctype|<html|<table|<div|<body/i);
  if (idx > 0) s = s.slice(idx);
  return s.trim();
}

const BRAND_SYSTEM = `You are an expert HTML email designer for "${BRAND_NAME}", a premium youth mentorship brand. Tagline: "${BRAND_TAGLINE}"
Produce production-ready, email-client-safe HTML:
- Use table-based layout with inline CSS only (no <style> blocks, no external CSS, no <script>).
- Mobile-responsive with max-width 600px centered container.
- Luxury dark brand palette: background #0a0a0a, card #141414, gold accent #C9A84C, crimson #8B0000, off-white text #E8E4DD, serif (Georgia) headings.
- Include a header, body content area, a clear gold CTA button, and a footer with "${BRAND_NAME}" and the tagline.
- Use {{first_name}} as a merge placeholder where a greeting belongs.
Return ONLY the HTML document — no markdown, no commentary.`;

// ── CRUD ────────────────────────────────────────────────────────────────────

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("email_templates")
      .select("id, name, description, subject, html, blocks, thumbnail_url, created_by, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { templates: data ?? [] };
  });

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().max(500).optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
  html: z.string().max(200_000).default(""),
  blocks: z.any().optional().nullable(),
  thumbnail_url: z.string().url().max(2000).optional().nullable(),
});

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("email_templates")
        .update({
          name: data.name,
          description: data.description ?? null,
          subject: data.subject ?? null,
          html: data.html,
          blocks: data.blocks ?? null,
          thumbnail_url: data.thumbnail_url ?? null,
        })
        .eq("id", data.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { template: row };
    }
    const { data: row, error } = await context.supabase
      .from("email_templates")
      .insert({
        name: data.name,
        description: data.description ?? null,
        subject: data.subject ?? null,
        html: data.html,
        blocks: data.blocks ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { template: row };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("email_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── AI generation ─────────────────────────────────────────────────────────

const ImageInput = z.object({
  // data URL: "data:image/png;base64,...."
  imageDataUrl: z.string().min(1).max(8_000_000),
  notes: z.string().max(1000).optional(),
});

export const generateTemplateFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const userText =
      "Recreate this design reference as an HTML email that matches the brand guidelines." +
      (data.notes ? `\n\nAdditional notes: ${data.notes}` : "");
    const html = extractHtml(
      await callGateway({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: BRAND_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    );
    return { html };
  });

const PromptInput = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export const generateTemplateFromPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PromptInput.parse(d))
  .handler(async ({ data }) => {
    const html = extractHtml(
      await callGateway({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: BRAND_SYSTEM },
          { role: "user", content: `Create an HTML email for: ${data.prompt}` },
        ],
      }),
    );
    return { html };
  });

const RewriteTextInput = z.object({
  text: z.string().min(1).max(8000),
  instruction: z.string().trim().min(1).max(2000),
});

/** Rewrite a single block's copy. Returns plain text (no HTML), for block-level edits. */
export const rewriteText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RewriteTextInput.parse(d))
  .handler(async ({ data }) => {
    const out = await callGateway({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are an expert email copywriter for ${BRAND_NAME} (warm, purposeful, elevated). Tagline: "${BRAND_TAGLINE}" Rewrite the given text per the instruction. Keep {{first_name}} placeholders intact. Return ONLY the rewritten plain text — no quotes, no markdown, no commentary.`,
        },
        { role: "user", content: `Text:\n${data.text}\n\nInstruction: ${data.instruction}` },
      ],
    });
    return { text: out.replace(/^["'\s]+|["'\s]+$/g, "") };
  });

const RewriteInput = z.object({
  html: z.string().min(1).max(200_000),
  instruction: z.string().trim().min(1).max(2000),
});

export const rewriteTemplateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RewriteInput.parse(d))
  .handler(async ({ data }) => {
    const html = extractHtml(
      await callGateway({
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              BRAND_SYSTEM +
              "\n\nYou are EDITING an existing email. Preserve the overall layout and structure; only change content/styling as instructed. Return the full updated HTML document.",
          },
          {
            role: "user",
            content: `Current HTML email:\n\n${data.html}\n\n---\nApply this change: ${data.instruction}`,
          },
        ],
      }),
    );
    return { html };
  });
