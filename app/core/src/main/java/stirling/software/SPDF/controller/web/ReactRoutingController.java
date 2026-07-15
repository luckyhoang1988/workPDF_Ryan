package stirling.software.SPDF.controller.web;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.util.HtmlUtils;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;

import stirling.software.common.configuration.InstallationPathConfig;

@Controller
public class ReactRoutingController {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(ReactRoutingController.class);
    private static final Pattern BASE_HREF_PATTERN =
            Pattern.compile("<base href=\\\"[^\\\"]*\\\"\\s*/?>");

    @Value("${server.servlet.context-path:/}")
    private String contextPath;

    private String cachedIndexHtml;
    private boolean indexHtmlExists = false;
    private boolean useExternalIndexHtml = false;
    private boolean loggedMissingIndex = false;
    private String cachedSaasLandingHtml;
    private boolean saasLandingExists = false;

    @PostConstruct
    public void init() {
        log.info("Static files custom path: {}", InstallationPathConfig.getStaticPath());

        // SaaS landing page: only present on the classpath when the :saas module is bundled
        // (app/saas/src/main/resources/static/saas-landing.html). When present it replaces the
        // root page so the SaaS API host shows its own landing instead of the OSS API-only page.
        ClassPathResource saasLanding = new ClassPathResource("static/saas-landing.html");
        if (saasLanding.exists()) {
            try (InputStream in = saasLanding.getInputStream()) {
                this.cachedSaasLandingHtml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                this.saasLandingExists = true;
                log.info("SaaS landing page detected; serving it at '/' and '/index.html'");
            } catch (Exception ex) {
                log.warn("Failed to read saas-landing.html; falling back to index.html", ex);
            }
        }

        // Check for external index.html first (customFiles/static/)
        Path externalIndexPath = Path.of(InstallationPathConfig.getStaticPath(), "index.html");
        log.debug("Checking for custom index.html at: {}", externalIndexPath);
        if (Files.exists(externalIndexPath) && Files.isReadable(externalIndexPath)) {
            log.info("Using custom index.html from: {}", externalIndexPath);
            this.cachedIndexHtml = processIndexHtml();
            this.indexHtmlExists = true;
            this.useExternalIndexHtml = true;
            return;
        }

        // Fall back to classpath index.html
        ClassPathResource resource = new ClassPathResource("static/index.html");
        if (resource.exists()) {
            this.cachedIndexHtml = processIndexHtml();
            this.indexHtmlExists = true;
            this.useExternalIndexHtml = false;
            return;
        }

        // Neither external nor classpath index.html exists - cache fallback once
        this.cachedIndexHtml = buildFallbackHtml();
        this.indexHtmlExists = true;
        this.useExternalIndexHtml = false;
        this.loggedMissingIndex = true;
        log.warn(
                "index.html not found in classpath or custom path; using lightweight fallback page");
    }

    private String processIndexHtml() {
        try {
            Resource resource = getIndexHtmlResource();

            if (!resource.exists()) {
                if (!loggedMissingIndex) {
                    log.warn("index.html not found, using lightweight fallback page");
                    loggedMissingIndex = true;
                }
                return buildFallbackHtml();
            }

            try (InputStream inputStream = resource.getInputStream()) {
                String html = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

                // Replace %BASE_URL% with the actual context path for base href
                String baseUrl = contextPath.endsWith("/") ? contextPath : contextPath + "/";
                html = html.replace("%BASE_URL%", baseUrl);
                // Also rewrite any existing <base> tag (Vite may have baked one in)
                html =
                        BASE_HREF_PATTERN
                                .matcher(html)
                                .replaceFirst("<base href=\\\"" + baseUrl + "\\\" />");

                // Inject context path as a global variable for API calls
                String contextPathScript =
                        "<script>window.STIRLING_PDF_API_BASE_URL = '" + baseUrl + "';</script>";
                html = html.replace("</head>", contextPathScript + "</head>");

                return html;
            }
        } catch (Exception ex) {
            if (!loggedMissingIndex) {
                log.warn("index.html not found, using lightweight fallback page", ex);
                loggedMissingIndex = true;
            }
            return buildFallbackHtml();
        }
    }

    private Resource getIndexHtmlResource() {
        // Check external location first
        Path externalIndexPath = Path.of(InstallationPathConfig.getStaticPath(), "index.html");
        if (Files.exists(externalIndexPath) && Files.isReadable(externalIndexPath)) {
            return new FileSystemResource(externalIndexPath.toFile());
        }

        // Fall back to classpath
        return new ClassPathResource("static/index.html");
    }

    @GetMapping(
            value = {"/", "/index.html"},
            produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> serveRootPage(HttpServletRequest request) {
        // Swap ONLY the root page for SaaS. SPA entry points that delegate to serveIndexHtml
        // (/auth/callback, /share/{token}, forwarded routes) keep serving the normal shell.
        if (saasLandingExists && cachedSaasLandingHtml != null) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .contentType(MediaType.TEXT_HTML)
                    .body(cachedSaasLandingHtml);
        }
        return serveIndexHtml(request);
    }

    public ResponseEntity<String> serveIndexHtml(HttpServletRequest request) {
        try {
            if (indexHtmlExists && cachedIndexHtml != null) {
                return ResponseEntity.ok()
                        .cacheControl(CacheControl.noCache().mustRevalidate())
                        .contentType(MediaType.TEXT_HTML)
                        .body(cachedIndexHtml);
            }
            // Fallback: process on each request (dev mode or cache failed)
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .contentType(MediaType.TEXT_HTML)
                    .body(processIndexHtml());
        } catch (Exception ex) {
            log.error("Failed to serve index.html, returning fallback", ex);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .contentType(MediaType.TEXT_HTML)
                    .body(buildFallbackHtml());
        }
    }

    @GetMapping(value = "/auth/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> serveAuthCallback(HttpServletRequest request) {
        return serveIndexHtml(request);
    }

    @GetMapping(value = "/share/{token}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> serveShareLinkPage(HttpServletRequest request) {
        return serveIndexHtml(request);
    }

    @GetMapping(value = "/mobile-scanner", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> serveMobileScanner(HttpServletRequest request) {
        return serveIndexHtml(request);
    }

    // `files` was historically a backend static-asset directory and was therefore
    // in the exclusion list - removing it lets /files and /files/<folder-uuid>
    // forward to the SPA index.html, which is what FileManagerView expects.
    // (Real storage endpoints live under /api/v1/storage/files, already
    // excluded by the leading `api` token in the same regex.)
    @GetMapping(
            "/{path:^(?!api|static|robots\\.txt|favicon\\.ico|manifest.*\\.json|pipeline|pdfjs|pdfjs-legacy|pdfium|vendor|fonts|images|css|js|assets|locales|modern-logo|classic-logo|Login|og_images|samples)[^\\.]*$}")
    public ResponseEntity<String> forwardRootPaths(
            @PathVariable String path, HttpServletRequest request) throws IOException {
        return servePrerenderedOrIndexHtml(request, path + ".html");
    }

    @GetMapping(
            "/{path:^(?!api|static|pipeline|pdfjs|pdfjs-legacy|pdfium|vendor|fonts|images|css|js|assets|locales|modern-logo|classic-logo|Login|og_images|samples)[^\\.]*}/{subpath:^(?!.*\\.).*$}")
    public ResponseEntity<String> forwardNestedPaths(
            @PathVariable String path, @PathVariable String subpath, HttpServletRequest request)
            throws IOException {
        return servePrerenderedOrIndexHtml(request, path + "/" + subpath + ".html");
    }

    /**
     * Vite's og-prerender build step (see frontend/editor/scripts/og-prerender.mjs) bakes a
     * route-specific title/description/canonical/OG tags into a static file per tool page (e.g.
     * compress.html). Serve that file verbatim for its clean URL (/compress) when present, so
     * link-unfurling crawlers and search engines see the tool's own metadata instead of the generic
     * SPA shell; routes with no prerendered file (dynamic routes, unknown paths) keep falling back
     * to the normal index.html.
     */
    private ResponseEntity<String> servePrerenderedOrIndexHtml(
            HttpServletRequest request, String relativeHtmlPath) throws IOException {
        Resource prerendered = getPrerenderedRouteResource(relativeHtmlPath);
        if (prerendered != null) {
            try (InputStream inputStream = prerendered.getInputStream()) {
                String html = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                return ResponseEntity.ok()
                        .cacheControl(CacheControl.noCache().mustRevalidate())
                        .contentType(MediaType.TEXT_HTML)
                        .body(html);
            }
        }
        return serveIndexHtml(request);
    }

    private Resource getPrerenderedRouteResource(String relativeHtmlPath) {
        Path externalPath = Path.of(InstallationPathConfig.getStaticPath(), relativeHtmlPath);
        if (Files.exists(externalPath) && Files.isReadable(externalPath)) {
            return new FileSystemResource(externalPath.toFile());
        }
        ClassPathResource resource = new ClassPathResource("static/" + relativeHtmlPath);
        return resource.exists() ? resource : null;
    }

    private String buildFallbackHtml() {
        String baseUrl = contextPath.endsWith("/") ? contextPath : contextPath + "/";
        String escapedBaseUrlHtml = HtmlUtils.htmlEscape(baseUrl);
        return """
                <!doctype html>
                <html>
                  <head>
                    <meta charset="utf-8" />
                    <base href="%s" />
                    <title>RyanPDF</title>
                  </head>
                  <body>
                    <p>RyanPDF is running.</p>
                  </body>
                </html>
                """
                .formatted(escapedBaseUrlHtml);
    }
}
