import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DraftInput = z.object({
  programName: z.string().min(1),
  weekNumber: z.number().int().min(1).max(52),
  weekTitle: z.string().min(1),
  weekFocus: z.string().default(""),
  menteeName: z.string().default("the mentee"),
});

export const draftWorkbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DraftInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable.");

    const systemPrompt = `You are a senior mentorship coach helping mentors prepare an exceptional weekly 1:1 session with a young mentee. Output a polished, structured workbook draft in markdown with these sections: "Pre-session prep", "Session focus", "Discussion prompts" (4 thoughtful, open-ended questions), "Suggested exercises" (1-2 practical activities), "Action items for mentee", and "Mentor observations" (leave blank lines for the mentor to fill). Keep tone warm, professional, premium. No preamble.`;

    const userPrompt = `Program: ${data.programName}
Week ${data.weekNumber}: ${data.weekTitle}
Focus: ${data.weekFocus}
Mentee: ${data.menteeName}

Draft this week's coaching workbook entry.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("AI is busy. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      const txt = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}). ${txt.slice(0, 160)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const draft = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!draft) throw new Error("AI returned an empty draft.");
    return { draft };
  });
