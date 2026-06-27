import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { pollsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/sitemap.xml", async (req, res) => {
  const appUrl = (process.env.APP_URL ?? "https://dzpulse.dz").replace(/\/$/, "");

  try {
    const polls = await db
      .select({ slug: pollsTable.slug, updatedAt: pollsTable.updatedAt, status: pollsTable.status })
      .from(pollsTable)
      .where(or(eq(pollsTable.status, "open"), eq(pollsTable.status, "closed")));

    const staticPages = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/polls", priority: "0.9", changefreq: "hourly" },
      { path: "/topics", priority: "0.7", changefreq: "weekly" },
      { path: "/methodology", priority: "0.5", changefreq: "monthly" },
      { path: "/about", priority: "0.5", changefreq: "monthly" },
    ];

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    for (const page of staticPages) {
      lines.push(
        `  <url>` +
        `<loc>${appUrl}${page.path}</loc>` +
        `<changefreq>${page.changefreq}</changefreq>` +
        `<priority>${page.priority}</priority>` +
        `</url>`
      );
    }

    for (const poll of polls) {
      const lastmod = (poll.updatedAt ?? new Date()).toISOString().slice(0, 10);
      const priority = poll.status === "open" ? "0.8" : "0.5";
      lines.push(
        `  <url>` +
        `<loc>${appUrl}/polls/${poll.slug}</loc>` +
        `<lastmod>${lastmod}</lastmod>` +
        `<changefreq>hourly</changefreq>` +
        `<priority>${priority}</priority>` +
        `</url>`
      );
    }

    lines.push("</urlset>");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(lines.join("\n"));
  } catch (err: any) {
    req.log.error(err);
    res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
