import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { pollsTable, pollOptionsTable, categoriesTable } from "@workspace/db";
import { Resvg } from "@resvg/resvg-js";
import https from "https";
import http from "http";

const router: IRouter = Router();

const GREEN = "#1f6b35";
const OPTION_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#e11d48"];

/** Converts a stored image path to a fully qualified URL the server can fetch.
 *  Stored paths like /objects/uploads/uuid are served via /api/storage/objects/... */
function resolveStorageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  // /objects/uploads/uuid → served at http://localhost:PORT/api/storage/objects/uploads/uuid
  const port = process.env.PORT ?? "8080";
  const withoutLeadingSlash = rawUrl.replace(/^\/objects\//, "");
  return `http://localhost:${port}/api/storage/objects/${withoutLeadingSlash}`;
}

// ── Fetch external image as base64 ───────────────────────────────────────────
async function fetchImageAsBase64(url: string): Promise<{ data: string; mime: string } | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { timeout: 4000 }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      const mime = (res.headers["content-type"] ?? "image/jpeg").split(";")[0].trim();
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve({ data: Buffer.concat(chunks).toString("base64"), mime }));
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

// ── Poll data fetcher ─────────────────────────────────────────────────────────
async function getPollWithOptions(slug: string) {
  const [poll] = await db
    .select({
      id: pollsTable.id,
      title: pollsTable.title,
      subtitle: pollsTable.subtitle,
      slug: pollsTable.slug,
      status: pollsTable.status,
      totalVotes: pollsTable.totalVotes,
      imageUrl: pollsTable.imageUrl,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
    })
    .from(pollsTable)
    .leftJoin(categoriesTable, eq(pollsTable.categoryId, categoriesTable.id))
    .where(eq(pollsTable.slug, slug))
    .limit(1);

  if (!poll) return null;

  const options = await db
    .select({ id: pollOptionsTable.id, label: pollOptionsTable.label, voteCount: pollOptionsTable.voteCount })
    .from(pollOptionsTable)
    .where(eq(pollOptionsTable.pollId, poll.id))
    .orderBy(pollOptionsTable.id);

  return { ...poll, options };
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + "…" : s;

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars) { if (line) lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

// ── OG image SVG (1200×630) — matches poll card design ───────────────────────
async function buildOgSvg(poll: Exclude<Awaited<ReturnType<typeof getPollWithOptions>>, null>): Promise<string> {
  const W = 1200;
  const H = 630;
  const totalVotes = poll.totalVotes ?? 0;
  const opts = poll.options.slice(0, 5);

  // Optional background image (right panel)
  let imgData: string | null = null;
  const resolvedOgImageUrl = resolveStorageUrl(poll.imageUrl);
  if (resolvedOgImageUrl) {
    const fetched = await fetchImageAsBase64(resolvedOgImageUrl);
    if (fetched) imgData = `data:${fetched.mime};base64,${fetched.data}`;
  }

  const HAS_IMG = !!imgData;
  const CARD_X = 60;
  const CARD_Y = 60;
  const CARD_W = HAS_IMG ? 680 : W - 120;
  const CARD_H = H - 120;
  const CARD_R = 16;
  const PAD = 40;

  // Category badge
  const catName = poll.categoryName ?? "Poll";
  const catColor = poll.categoryColor ?? GREEN;
  const catBgAlpha = "26"; // ~15% opacity hex
  const CAT_X = CARD_X + PAD;
  const CAT_Y = CARD_Y + PAD;
  const CAT_W = catName.length * 8 + 24;
  const CAT_H = 26;

  // Title lines
  const TITLE_MAX = HAS_IMG ? 38 : 50;
  const titleLines = wrapText(poll.title, TITLE_MAX).slice(0, 2);
  const TITLE_Y = CAT_Y + CAT_H + 20;
  const TITLE_SIZE = 30;
  const TITLE_LINE_H = 38;

  // Subtitle
  const SUBTITLE_Y = TITLE_Y + titleLines.length * TITLE_LINE_H + 6;
  const subtitleText = poll.subtitle ? trunc(poll.subtitle, HAS_IMG ? 55 : 72) : null;

  // Options
  const OPT_START_Y = SUBTITLE_Y + (subtitleText ? 30 : 8);
  const OPT_H = 52;
  const BAR_MAX_W = CARD_W - PAD * 2 - 8;
  const BAR_H = 8;
  const BAR_R = 4;

  const optionsSvg = opts.map((opt, i) => {
    const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
    const barW = Math.max(BAR_H, Math.round((pct / 100) * BAR_MAX_W));
    const y = OPT_START_Y + i * OPT_H;
    const color = OPTION_COLORS[i] ?? "#888";
    const label = trunc(opt.label, HAS_IMG ? 32 : 50);
    return `
      <g>
        <text x="${CAT_X}" y="${y + 16}" font-family="system-ui,-apple-system,sans-serif" font-size="16" fill="#374151" font-weight="500">${escXml(label)}</text>
        <text x="${CARD_X + CARD_W - PAD}" y="${y + 16}" font-family="system-ui,sans-serif" font-size="16" fill="${color}" font-weight="700" text-anchor="end">${pct}%</text>
        <rect x="${CAT_X}" y="${y + 24}" width="${BAR_MAX_W}" height="${BAR_H}" rx="${BAR_R}" fill="#e5e7eb"/>
        <rect x="${CAT_X}" y="${y + 24}" width="${barW}" height="${BAR_H}" rx="${BAR_R}" fill="${color}"/>
      </g>`;
  }).join("");

  // Footer inside card
  const FOOTER_Y = CARD_Y + CARD_H - 28;

  // Right-side image panel
  const IMG_X = CARD_X + CARD_W + 20;
  const IMG_W = W - IMG_X - CARD_X;
  const imgPanel = HAS_IMG && imgData ? `
    <defs>
      <clipPath id="imgPanelClip"><rect x="${IMG_X}" y="${CARD_Y}" width="${IMG_W}" height="${CARD_H}" rx="${CARD_R}"/></clipPath>
    </defs>
    <image href="${imgData}" x="${IMG_X}" y="${CARD_Y}" width="${IMG_W}" height="${CARD_H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgPanelClip)"/>
    <rect x="${IMG_X}" y="${CARD_Y}" width="${IMG_W}" height="${CARD_H}" rx="${CARD_R}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
  ` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="cardClip"><rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}"/></clipPath>
  </defs>

  <!-- Page background -->
  <rect width="${W}" height="${H}" fill="#f9fafb"/>

  <!-- Card shadow -->
  <rect x="${CARD_X + 2}" y="${CARD_Y + 4}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}" fill="#00000010"/>

  <!-- Card -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>

  <!-- Green left accent bar -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="4" height="${CARD_H}" rx="${CARD_R}" fill="${GREEN}" clip-path="url(#cardClip)"/>

  <!-- Category badge -->
  <rect x="${CAT_X}" y="${CAT_Y}" width="${CAT_W}" height="${CAT_H}" rx="${CAT_H / 2}" fill="${catColor}${catBgAlpha}"/>
  <text x="${CAT_X + 12}" y="${CAT_Y + 17}" font-family="system-ui,sans-serif" font-size="13" fill="${catColor}" font-weight="600">${escXml(catName)}</text>

  <!-- Status dot (live) -->
  ${poll.status === "open" ? `
  <circle cx="${CAT_X + CAT_W + 16}" cy="${CAT_Y + CAT_H / 2}" r="4" fill="${GREEN}"/>
  <text x="${CAT_X + CAT_W + 26}" y="${CAT_Y + 17}" font-family="system-ui,sans-serif" font-size="13" fill="${GREEN}" font-weight="600">Live</text>` : ""}

  <!-- Poll title -->
  ${titleLines.map((line, i) => `<text x="${CAT_X}" y="${TITLE_Y + i * TITLE_LINE_H + TITLE_SIZE - 6}" font-family="system-ui,-apple-system,sans-serif" font-size="${TITLE_SIZE}" fill="#111827" font-weight="700" letter-spacing="-0.5">${escXml(line)}</text>`).join("")}

  <!-- Subtitle -->
  ${subtitleText ? `<text x="${CAT_X}" y="${SUBTITLE_Y + 14}" font-family="system-ui,sans-serif" font-size="15" fill="#6b7280">${escXml(subtitleText)}</text>` : ""}

  <!-- Options -->
  ${optionsSvg}

  <!-- Footer separator -->
  <line x1="${CARD_X + 16}" y1="${FOOTER_Y - 16}" x2="${CARD_X + CARD_W - 16}" y2="${FOOTER_Y - 16}" stroke="#f3f4f6" stroke-width="1"/>

  <!-- Footer: vote count + branding -->
  <text x="${CAT_X}" y="${FOOTER_Y}" font-family="system-ui,sans-serif" font-size="13" fill="#9ca3af">${totalVotes.toLocaleString()} votes</text>

  <!-- DzPulse branding in footer -->
  <text x="${CARD_X + CARD_W - PAD}" y="${FOOTER_Y}" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="${GREEN}" font-weight="800" text-anchor="end">DzPulse</text>
  <text x="${CARD_X + CARD_W - PAD}" y="${FOOTER_Y + 16}" font-family="system-ui,sans-serif" font-size="11" fill="#9ca3af" text-anchor="end">dzpulse.dz</text>

  <!-- Right image panel (if present) -->
  ${imgPanel}
</svg>`;
}

// ── Instagram Story SVG (1080×1920) — tall poll card ─────────────────────────
async function buildStorySvg(poll: Exclude<Awaited<ReturnType<typeof getPollWithOptions>>, null>): Promise<string> {
  const W = 1080;
  const H = 1920;
  const totalVotes = poll.totalVotes ?? 0;
  const opts = poll.options.slice(0, 5);

  let imgData: string | null = null;
  const resolvedStoryImageUrl = resolveStorageUrl(poll.imageUrl);
  if (resolvedStoryImageUrl) {
    const fetched = await fetchImageAsBase64(resolvedStoryImageUrl);
    if (fetched) imgData = `data:${fetched.mime};base64,${fetched.data}`;
  }

  // Card layout — centered on page
  const CARD_X = 60;
  const CARD_Y = 200;
  const CARD_W = W - 120;
  const CARD_H = 1500;
  const CARD_R = 28;
  const PAD = 60;

  // Category
  const catName = poll.categoryName ?? "Poll";
  const catColor = poll.categoryColor ?? GREEN;
  const CAT_Y = CARD_Y + 60;
  const CAT_W = catName.length * 14 + 40;
  const CAT_H = 44;

  // Title
  const titleLines = wrapText(poll.title, 30).slice(0, 3);
  const TITLE_Y = CAT_Y + CAT_H + 36;
  const TITLE_SIZE = 54;
  const TITLE_LINE_H = 68;

  // Subtitle
  const SUBTITLE_Y = TITLE_Y + titleLines.length * TITLE_LINE_H + 10;
  const subtitleText = poll.subtitle ? trunc(poll.subtitle, 60) : null;

  // Options
  const OPT_START_Y = SUBTITLE_Y + (subtitleText ? 60 : 20);
  const OPT_H = 110;
  const BAR_MAX_W = CARD_W - PAD * 2;
  const BAR_H = 16;
  const BAR_R = 8;

  const optionsSvg = opts.map((opt, i) => {
    const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
    const barW = Math.max(BAR_H, Math.round((pct / 100) * BAR_MAX_W));
    const y = OPT_START_Y + i * OPT_H;
    const color = OPTION_COLORS[i] ?? "#888";
    const label = trunc(opt.label, 36);
    return `
      <g>
        <text x="${CARD_X + PAD}" y="${y + 32}" font-family="system-ui,sans-serif" font-size="30" fill="#374151" font-weight="500">${escXml(label)}</text>
        <text x="${CARD_X + CARD_W - PAD}" y="${y + 32}" font-family="system-ui,sans-serif" font-size="30" fill="${color}" font-weight="700" text-anchor="end">${pct}%</text>
        <rect x="${CARD_X + PAD}" y="${y + 46}" width="${BAR_MAX_W}" height="${BAR_H}" rx="${BAR_R}" fill="#e5e7eb"/>
        <rect x="${CARD_X + PAD}" y="${y + 46}" width="${barW}" height="${BAR_H}" rx="${BAR_R}" fill="${color}"/>
      </g>`;
  }).join("");

  // Optional top image inside card
  let imgEl = "";
  if (imgData) {
    const IMG_Y = OPT_START_Y + opts.length * OPT_H + 40;
    const IMG_H = 300;
    imgEl = `
      <defs>
        <clipPath id="coverClip"><rect x="${CARD_X + PAD}" y="${IMG_Y}" width="${CARD_W - PAD * 2}" height="${IMG_H}" rx="16"/></clipPath>
      </defs>
      <image href="${imgData}" x="${CARD_X + PAD}" y="${IMG_Y}" width="${CARD_W - PAD * 2}" height="${IMG_H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)"/>
    `;
  }

  // Footer
  const FOOTER_Y = CARD_Y + CARD_H - 60;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="cardClipStory"><rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}"/></clipPath>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#f3f4f6"/>

  <!-- DzPulse header at top (outside card) -->
  <text x="${W / 2}" y="100" font-family="system-ui,-apple-system,sans-serif" font-size="44" fill="${GREEN}" font-weight="800" text-anchor="middle">DzPulse</text>
  <text x="${W / 2}" y="148" font-family="system-ui,sans-serif" font-size="26" fill="#9ca3af" text-anchor="middle">Algerian Opinion Polls Platform · dzpulse.dz</text>

  <!-- Card shadow -->
  <rect x="${CARD_X + 3}" y="${CARD_Y + 6}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}" fill="#00000012"/>

  <!-- Card -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="${CARD_R}" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>

  <!-- Green left accent -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="8" height="${CARD_H}" rx="${CARD_R}" fill="${GREEN}" clip-path="url(#cardClipStory)"/>

  <!-- Category badge -->
  <rect x="${CARD_X + PAD}" y="${CAT_Y}" width="${CAT_W}" height="${CAT_H}" rx="${CAT_H / 2}" fill="${catColor}26"/>
  <text x="${CARD_X + PAD + 20}" y="${CAT_Y + 29}" font-family="system-ui,sans-serif" font-size="22" fill="${catColor}" font-weight="600">${escXml(catName)}</text>

  ${poll.status === "open" ? `
  <circle cx="${CARD_X + PAD + CAT_W + 24}" cy="${CAT_Y + CAT_H / 2}" r="7" fill="${GREEN}"/>
  <text x="${CARD_X + PAD + CAT_W + 40}" y="${CAT_Y + 30}" font-family="system-ui,sans-serif" font-size="22" fill="${GREEN}" font-weight="600">Live</text>` : ""}

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="${CARD_X + PAD}" y="${TITLE_Y + i * TITLE_LINE_H + TITLE_SIZE - 8}" font-family="system-ui,-apple-system,sans-serif" font-size="${TITLE_SIZE}" fill="#111827" font-weight="700" letter-spacing="-0.8">${escXml(line)}</text>`).join("")}

  <!-- Subtitle -->
  ${subtitleText ? `<text x="${CARD_X + PAD}" y="${SUBTITLE_Y + 28}" font-family="system-ui,sans-serif" font-size="28" fill="#6b7280">${escXml(subtitleText)}</text>` : ""}

  <!-- Options -->
  ${optionsSvg}

  <!-- Optional cover image -->
  ${imgEl}

  <!-- Footer separator -->
  <line x1="${CARD_X + 20}" y1="${FOOTER_Y - 28}" x2="${CARD_X + CARD_W - 20}" y2="${FOOTER_Y - 28}" stroke="#f3f4f6" stroke-width="2"/>

  <!-- Footer -->
  <text x="${CARD_X + PAD}" y="${FOOTER_Y}" font-family="system-ui,sans-serif" font-size="26" fill="#9ca3af">${totalVotes.toLocaleString()} votes</text>
  <text x="${CARD_X + CARD_W - PAD}" y="${FOOTER_Y}" font-family="system-ui,-apple-system,sans-serif" font-size="26" fill="${GREEN}" font-weight="800" text-anchor="end">DzPulse</text>

  <!-- Bottom tagline -->
  <text x="${W / 2}" y="${H - 60}" font-family="system-ui,sans-serif" font-size="26" fill="#9ca3af" text-anchor="middle">Vote at dzpulse.dz</text>
</svg>`;
}

// ── SVG → PNG helper ──────────────────────────────────────────────────────────
function svgToPng(svgStr: string): Buffer {
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "original" },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

// ── OG Share page ─────────────────────────────────────────────────────────────
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  const origin = `${proto}://${host}`;
  const pollUrl = `${origin}/polls/${slug}`;
  const imageUrl = `${origin}/api/share/${slug}/image`;

  try {
    const poll = await getPollWithOptions(slug);
    if (!poll) { res.redirect(302, pollUrl); return; }

    const optionsSummary = poll.options.slice(0, 3)
      .map((o) => {
        const pct = poll.totalVotes > 0 ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0;
        return `${o.label} ${pct}%`;
      }).join(" · ");

    const description = poll.subtitle
      ? `${poll.subtitle} — ${optionsSummary} · ${poll.totalVotes.toLocaleString()} votes`
      : `${optionsSummary} · ${poll.totalVotes.toLocaleString()} votes`;

    const e = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <title>${e(poll.title)} — DzPulse</title>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="DzPulse"/>
  <meta property="og:title" content="${e(poll.title)}"/>
  <meta property="og:description" content="${e(description)}"/>
  <meta property="og:url" content="${pollUrl}"/>
  <meta property="og:image" content="${imageUrl}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:type" content="image/png"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@dzpulse"/>
  <meta name="twitter:title" content="${e(poll.title)}"/>
  <meta name="twitter:description" content="${e(description)}"/>
  <meta name="twitter:image" content="${imageUrl}"/>
  <link rel="canonical" href="${pollUrl}"/>
  <meta http-equiv="refresh" content="0;url=${pollUrl}"/>
  <script>window.location.replace("${pollUrl}");</script>
</head>
<body style="font-family:system-ui,sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="text-align:center;max-width:480px;padding:2rem;">
    <p style="color:${GREEN};font-weight:800;font-size:1.2rem;margin-bottom:.25rem;">DzPulse</p>
    <p style="color:#9ca3af;font-size:.75rem;margin-bottom:1rem;">Algerian Opinion Polls Platform</p>
    <h1 style="color:#111;font-size:1.25rem;font-weight:700;margin-bottom:1rem;">${e(poll.title)}</h1>
    <p style="color:#6b7280;font-size:.9rem;margin-bottom:1.5rem;">${e(description)}</p>
    <a href="${pollUrl}" style="background:${GREEN};color:#fff;padding:.75rem 1.5rem;border-radius:.5rem;text-decoration:none;font-weight:600;">View poll →</a>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.status(200).send(html);
  } catch {
    res.redirect(302, pollUrl);
  }
});

// ── OG image PNG (1200×630) ───────────────────────────────────────────────────
router.get("/:slug/image", async (req, res) => {
  const { slug } = req.params;
  try {
    const poll = await getPollWithOptions(slug);
    if (!poll) { res.status(404).send("Not found"); return; }
    const svg = await buildOgSvg(poll);
    const png = svgToPng(svg);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.status(200).send(png);
  } catch (err) {
    console.error("OG image error:", err);
    res.status(500).send("Error generating image");
  }
});

// ── Instagram Story PNG (1080×1920) ──────────────────────────────────────────
router.get("/:slug/story", async (req, res) => {
  const { slug } = req.params;
  try {
    const poll = await getPollWithOptions(slug);
    if (!poll) { res.status(404).send("Not found"); return; }
    const svg = await buildStorySvg(poll);
    const png = svgToPng(svg);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="dzpulse-${slug}-story.png"`);
    res.setHeader("Cache-Control", "public, max-age=120");
    res.status(200).send(png);
  } catch (err) {
    console.error("Story image error:", err);
    res.status(500).send("Error generating story image");
  }
});

export default router;
