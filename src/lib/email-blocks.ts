/**
 * Email block model + email-safe HTML renderer.
 */

export type EmailBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; src: string; alt: string; href?: string }
  | { id: string; type: "button"; text: string; href: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number }
  | { id: string; type: "columns2"; left: string; right: string }
  | { id: string; type: "columns3"; col1: string; col2: string; col3: string };

export type BlockType = EmailBlock["type"];

export type EmailHeader = {
  headline: string;
  subheadline: string;
  intro: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroLink: string;
};

export const DEFAULT_EMAIL_HEADER: EmailHeader = {
  headline: "",
  subheadline: "",
  intro: "",
  heroImageUrl: "",
  heroImageAlt: "",
  heroLink: "",
};

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
    case "columns2":
      return {
        id: newBlockId(),
        type,
        left: "Left column content",
        right: "Right column content",
      };
    case "columns3":
      return {
        id: newBlockId(),
        type,
        col1: "Column one",
        col2: "Column two",
        col3: "Column three",
      };
  }
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
  columns2: "Two columns",
  columns3: "Three columns",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function richText(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

function renderHeroImage(header: EmailHeader): string {
  if (!header.heroImageUrl) return "";
  const img = `<img src="${esc(header.heroImageUrl)}" alt="${esc(header.heroImageAlt || "Hero")}" width="100%" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px;" />`;
  const inner = header.heroLink
    ? `<a href="${esc(header.heroLink)}" target="_blank">${img}</a>`
    : img;
  return `<tr><td style="padding:12px 0 8px;text-align:center;">${inner}</td></tr>`;
}

function renderHeaderRows(header: EmailHeader): string {
  const rows: string[] = [];
  if (header.headline.trim()) {
    rows.push(
      `<tr><td style="padding:4px 0 8px;font-family:${BRAND.serif};color:${BRAND.text};font-size:28px;line-height:1.2;font-weight:700;">${richText(header.headline)}</td></tr>`,
    );
  }
  if (header.subheadline.trim()) {
    rows.push(
      `<tr><td style="padding:0 0 8px;font-family:${BRAND.serif};color:${BRAND.muted};font-size:16px;line-height:1.4;font-style:italic;">${richText(header.subheadline)}</td></tr>`,
    );
  }
  if (header.intro.trim()) {
    rows.push(
      `<tr><td style="padding:0 0 12px;font-family:${BRAND.sans};color:${BRAND.text};font-size:15px;line-height:1.65;">${richText(header.intro)}</td></tr>`,
    );
  }
  const hero = renderHeroImage(header);
  if (hero) rows.push(hero);
  if (rows.length > 0) {
    rows.push(
      `<tr><td style="padding:8px 0 4px;"><div style="height:1px;background:#262626;width:100%;"></div></td></tr>`,
    );
  }
  return rows.join("\n");
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
    case "columns2":
      return `<tr><td style="padding:8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" valign="top" style="padding-right:10px;font-family:${BRAND.sans};color:${BRAND.text};font-size:15px;line-height:1.6;">${richText(b.left)}</td>
            <td width="50%" valign="top" style="padding-left:10px;font-family:${BRAND.sans};color:${BRAND.text};font-size:15px;line-height:1.6;">${richText(b.right)}</td>
          </tr>
        </table>
      </td></tr>`;
    case "columns3":
      return `<tr><td style="padding:8px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" valign="top" style="padding-right:8px;font-family:${BRAND.sans};color:${BRAND.text};font-size:14px;line-height:1.55;">${richText(b.col1)}</td>
            <td width="34%" valign="top" style="padding:0 4px;font-family:${BRAND.sans};color:${BRAND.text};font-size:14px;line-height:1.55;">${richText(b.col2)}</td>
            <td width="33%" valign="top" style="padding-left:8px;font-family:${BRAND.sans};color:${BRAND.text};font-size:14px;line-height:1.55;">${richText(b.col3)}</td>
          </tr>
        </table>
      </td></tr>`;
  }
}

export function renderBlocksToHtml(
  blocks: EmailBlock[],
  header: EmailHeader = DEFAULT_EMAIL_HEADER,
): string {
  const headerRows = renderHeaderRows(header);
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
${headerRows}${rows}
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #262626;font-family:${BRAND.sans};color:${BRAND.muted};font-size:12px;text-align:center;">
          Free Bleeders Mentorship<br/>
          <span style="color:#6b6760;">You are receiving this because you are part of our mentorship community.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
