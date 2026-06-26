/**
 * Email block model + email-safe HTML renderer.
 */

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export type EmailBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; alt: string; href?: string }
  | { id: string; type: "button"; text: string; href: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number };

export type BlockType = EmailBlock["type"];

// ── Brand palette ───────────────────────────────────────────────────────────
export const BRAND = {
  bg: "#0a0a0a",
  card: "#141414",
  gold: "#C9A84C",
  crimson: "#8B0000",
  text: "#E8E4DD",
  muted: "#9a958c",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

let _seq = 0;
export function newBlockId(): string {
  _seq += 1;
  return `b_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

export function makeBlock(type: BlockType): EmailBlock {
  switch (type) {
    case "heading":
      return { id: newBlockId(), type, text: "Your headline here" };
    case "text":
      return {
        id: newBlockId(),
        type,
        text: "Hi {{first_name}}, write your message here. Keep it warm and purposeful.",
      };
    case "image":
      return { id: newBlockId(), type, src: "", alt: "Image" };
    case "button":
      return { id: newBlockId(), type, text: "Learn more", href: "https://" };
    case "divider":
      return { id: newBlockId(), type };
    case "spacer":
      return { id: newBlockId(), type, size: 24 };
  }
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Allow basic line breaks in text blocks.
function richText(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

function renderBlock(b: EmailBlock): string {
  switch (b.type) {
    case "heading":
      return `<tr><td style="padding:8px 0;font-family:${BRAND.serif};color:${BRAND.text};font-size:26px;line-height:1.25;font-weight:700;">${richText(b.text)}</td></tr>`;
    case "text":
      return `<tr><td style="padding:8px 0;font-family:${BRAND.sans};color:${BRAND.text};font-size:16px;line-height:1.7;">${richText(b.text)}</td></tr>`;
    case "image": {
      if (!b.src) {
        return `<tr><td style="padding:8px 0;font-family:${BRAND.sans};color:${BRAND.muted};font-size:13px;border:1px dashed #333;text-align:center;padding:24px;">Image placeholder</td></tr>`;
      }
      const img = `<img src="${esc(b.src)}" alt="${esc(b.alt)}" width="100%" style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px;" />`;
      const inner = b.href ? `<a href="${esc(b.href)}" target="_blank">${img}</a>` : img;
      return `<tr><td style="padding:8px 0;">${inner}</td></tr>`;
    }
    case "button":
      return `<tr><td style="padding:16px 0;text-align:center;"><a href="${esc(b.href)}" target="_blank" style="display:inline-block;background:${BRAND.gold};color:#0a0a0a;font-family:${BRAND.sans};font-size:15px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:6px;">${esc(b.text)}</a></td></tr>`;
    case "divider":
      return `<tr><td style="padding:12px 0;"><div style="height:2px;background:${BRAND.crimson};width:48px;"></div></td></tr>`;
    case "spacer":
      return `<tr><td style="height:${Math.max(4, Math.min(120, b.size))}px;line-height:${Math.max(4, Math.min(120, b.size))}px;font-size:0;">&nbsp;</td></tr>`;
  }
}

export function renderBlocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map(renderBlock).join("\n");
  return `<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.gold};border-radius:12px;">
        <tr><td style="padding:36px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows}
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #262626;font-family:${BRAND.sans};color:${BRAND.muted};font-size:12px;text-align:center;">
          ${BRAND_NAME}<br/>
          <span style="color:#6b6760;">${BRAND_TAGLINE}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
