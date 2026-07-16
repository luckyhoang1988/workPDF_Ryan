package stirling.software.SPDF.controller.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import stirling.software.common.model.ApplicationProperties;

/**
 * Serves /robots.txt dynamically so the system.googlevisibility flag actually controls
 * search-engine indexing. 'true' returns an allow-all policy (plus a Sitemap directive so crawlers
 * can find sitemap.xml); 'false' returns a disallow-all policy to keep the instance out of search
 * engines (useful for embedded/internal deployments).
 */
@RestController
public class RobotsController {

    private final ApplicationProperties applicationProperties;

    public RobotsController(ApplicationProperties applicationProperties) {
        this.applicationProperties = applicationProperties;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    @ResponseBody
    public String robotsTxt(HttpServletRequest request) {
        boolean allowIndexing = applicationProperties.getSystem().isGooglevisibility();
        if (!allowIndexing) {
            return "User-agent: *\nDisallow: /\n";
        }
        return "User-agent: *\nAllow: /\n\nSitemap: " + siteUrl(request) + "/sitemap.xml\n";
    }

    private String siteUrl(HttpServletRequest request) {
        String configured = applicationProperties.getSystem().getFrontendUrl();
        if (configured != null && !configured.isBlank()) {
            return configured.endsWith("/")
                    ? configured.substring(0, configured.length() - 1)
                    : configured;
        }
        return request.getScheme()
                + "://"
                + request.getServerName()
                + (isDefaultPort(request) ? "" : ":" + request.getServerPort());
    }

    private static boolean isDefaultPort(HttpServletRequest request) {
        String scheme = request.getScheme();
        int port = request.getServerPort();
        return ("http".equals(scheme) && port == 80) || ("https".equals(scheme) && port == 443);
    }
}
