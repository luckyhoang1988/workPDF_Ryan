// Type declarations for generate-sitemap.mjs (plain ESM build helper).

import type { OgManifest } from "./og-prerender.d.mts";

export function isPublicRoute(routePath: string): boolean;
export function isCanonicalRoute(routePath: string, id: string): boolean;
export function buildSitemap(routePaths: string[], siteUrl: string): string;
export function generateSitemap(args: {
  distDir: string;
  manifest: OgManifest;
  siteUrl: string;
}): Promise<number>;
