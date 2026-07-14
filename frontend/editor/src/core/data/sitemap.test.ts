import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// Build tooling (plain ESM, node:fs only) - import the helpers for coverage.
// eslint-disable-next-line no-restricted-imports -- build script lives outside the @app alias root
import {
  buildSitemap,
  generateSitemap,
  isCanonicalRoute,
  isPublicRoute,
} from "../../../scripts/generate-sitemap.mjs";

describe("isPublicRoute", () => {
  it("excludes auth and account-only routes", () => {
    expect(isPublicRoute("/login")).toBe(false);
    expect(isPublicRoute("/signup")).toBe(false);
    expect(isPublicRoute("/files")).toBe(false);
    expect(isPublicRoute("/mobile-scanner")).toBe(false);
    expect(isPublicRoute("/settings")).toBe(false);
    expect(isPublicRoute("/settings/people")).toBe(false);
  });

  it("keeps public tool routes", () => {
    expect(isPublicRoute("/compress")).toBe(true);
    expect(isPublicRoute("/merge-pdfs")).toBe(true);
  });
});

describe("buildSitemap", () => {
  it("includes the home page plus each given route as an absolute URL", () => {
    const xml = buildSitemap(["/compress", "/merge"], "https://pdf.ryanapp.online");
    expect(xml).toContain("<loc>https://pdf.ryanapp.online/</loc>");
    expect(xml).toContain("<loc>https://pdf.ryanapp.online/compress</loc>");
    expect(xml).toContain("<loc>https://pdf.ryanapp.online/merge</loc>");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });
});

describe("isCanonicalRoute", () => {
  it("accepts a tool's primary kebab-case path and rejects its aliases", () => {
    expect(isCanonicalRoute("/split", "split")).toBe(true);
    expect(isCanonicalRoute("/split-pdfs", "split")).toBe(false);
    expect(isCanonicalRoute("/pdf-to-single-page", "pdfToSinglePage")).toBe(true);
  });

  it("treats a self-mapped non-tool app route as canonical", () => {
    expect(isCanonicalRoute("/settings/people", "/settings/people")).toBe(true);
  });
});

describe("generateSitemap", () => {
  it("drops URL aliases, keeping only each tool's canonical path", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitemap-"));
    const manifest = {
      byPath: {
        "/split": "split",
        "/split-pdfs": "split",
        "/auto-split-pdf": "split",
        "/compress": "compress",
        "/compress-pdf": "compress",
      },
    };

    const count = await generateSitemap({
      distDir: dir,
      manifest,
      siteUrl: "https://pdf.ryanapp.online",
    });
    expect(count).toBe(3); // home + /split + /compress

    const xml = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    expect(xml).toContain("<loc>https://pdf.ryanapp.online/split</loc>");
    expect(xml).toContain("<loc>https://pdf.ryanapp.online/compress</loc>");
    expect(xml).not.toContain("/split-pdfs");
    expect(xml).not.toContain("/auto-split-pdf");
    expect(xml).not.toContain("/compress-pdf");

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("writes sitemap.xml filtering out non-public routes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitemap-"));
    const manifest = {
      byPath: {
        "/compress": "compress",
        "/settings/people": "/settings/people",
        "/login": "login",
      },
    };

    const count = await generateSitemap({
      distDir: dir,
      manifest,
      siteUrl: "https://pdf.ryanapp.online",
    });
    expect(count).toBe(2); // home + /compress

    const xml = await fs.readFile(path.join(dir, "sitemap.xml"), "utf8");
    expect(xml).toContain("/compress");
    expect(xml).not.toContain("/settings/people");
    expect(xml).not.toContain("/login");

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("skips writing when no site URL is known", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sitemap-"));
    const count = await generateSitemap({
      distDir: dir,
      manifest: { byPath: {} },
      siteUrl: "",
    });
    expect(count).toBe(0);
    await expect(fs.readFile(path.join(dir, "sitemap.xml"))).rejects.toThrow();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
