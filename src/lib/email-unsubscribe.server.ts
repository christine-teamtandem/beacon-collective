import type { SupabaseClient } from "@supabase/supabase-js";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** One token per email — required by the Lovable transactional email API. */
export async function getOrCreateUnsubscribeToken(
  supabase: SupabaseClient,
  email: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return { ok: false, error: "Invalid recipient email" };

  const { data: existingToken, error: tokenLookupError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (tokenLookupError) {
    return { ok: false, error: "Failed to look up unsubscribe token" };
  }

  if (existingToken?.used_at) {
    return { ok: false, error: "Recipient has unsubscribed" };
  }

  if (existingToken?.token) {
    return { ok: true, token: existingToken.token };
  }

  const newToken = generateToken();
  const { error: tokenError } = await supabase.from("email_unsubscribe_tokens").upsert(
    { token: newToken, email: normalizedEmail },
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (tokenError) {
    return { ok: false, error: "Failed to create unsubscribe token" };
  }

  const { data: storedToken, error: reReadError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (reReadError || !storedToken?.token) {
    return { ok: false, error: "Failed to confirm unsubscribe token storage" };
  }

  return { ok: true, token: storedToken.token };
}
