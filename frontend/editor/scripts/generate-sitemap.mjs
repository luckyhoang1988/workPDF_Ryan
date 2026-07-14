// Builds a sitemap.xml from the same og-metadata.json route manifest used by
// og-prerender.mjs, so every public tool page stays discoverable without a
// second source of truth. Kept separate from vite.config so it is
// unit-testable without a full build.

import fs from "node:fs/promises";
import path from "node:path";

// Routes that require a signed-in session (account/admin settings) or are
// pure app chrome with no indexable content - excluded so the sitemap only
// lists pages a crawler can actually see and use.
const EXCLUDED_PATHS = new Set(["/login", "/signup", "/files", "/mobile-scanner"]);
const EXCLUDED_PREFIXES = ["/settings"];

export function isPublicRoute(routePath) {
  if (EXCLUDED_PATHS.has(routePath)) return false;
  return !EXCLUDED_PREFIXES.some(
    (prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`),
  );
}

// Same kebab-case formula generate-og-metadata.mjs uses to derive a tool's
// primary URL from its id (e.g. "pdfToSinglePage" -> "/pdf-to-single-page").
const canonicalToolPath = (id) => "/" + id.replace(/([A-Z])/g, "-$1").toLowerCase();

// manifest.byPath maps every URL alias (see urlMapping.ts) to the same tool
// id, e.g. both "/split" and "/split-pdfs" -> "split". Listing every alias in
// the sitemap submits duplicate-content URLs to crawlers, so keep only the
// one canonical path per tool (byPath values that aren't a tool id are
// non-tool app routes self-mapped to their own path - always canonical).
export function isCanonicalRoute(routePath, id) {
  return id.startsWith("/") ? id === routePath : canonicalToolPath(id) === routePath;
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** @param {string[]} routePaths @param {string} siteUrl */
export function buildSitemap(routePaths, siteUrl) {
  const base = siteUrl.replace(/\/+$/, "");
  const urls = ["/", ...routePaths]
    .map((routePath) => {
      const loc = routePath === "/" ? `${base}/` : `${base}${routePath}`;
      return `  <url><loc>${escapeXml(loc)}</loc></url>`;
    })
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    "</urlset>\n"
  );
}

/**
 * Write dist/sitemap.xml from the route manifest. Returns the URL count
 * written, or 0 if skipped (no siteUrl known - relative URLs aren't valid
 * in a sitemap, so there is nothing safe to write).
 * @returns {Promise<number>}
 */
export async function generateSitemap({ distDir, manifest, siteUrl }) {
  if (!siteUrl) return 0;
  const routePaths = Object.entries(manifest.byPath || {})
    .filter(([routePath, id]) => isPublicRoute(routePath) && isCanonicalRoute(routePath, id))
    .map(([routePath]) => routePath);
  const xml = buildSitemap(routePaths, siteUrl);
  await fs.writeFile(path.join(distDir, "sitemap.xml"), xml);
  return routePaths.length + 1;
}
