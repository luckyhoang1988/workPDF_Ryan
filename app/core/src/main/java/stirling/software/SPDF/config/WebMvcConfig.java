package stirling.software.SPDF.config;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.EncodedResourceResolver;

import lombok.RequiredArgsConstructor;

import stirling.software.common.model.ApplicationProperties;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final EndpointInterceptor endpointInterceptor;
    private final PdfMetricsInterceptor pdfMetricsInterceptor;
    private final ApplicationProperties applicationProperties;

    private static final Logger logger = LoggerFactory.getLogger(WebMvcConfig.class);

    private static final CacheControl NO_CACHE = CacheControl.noCache();
    private static final CacheControl IMMUTABLE_ONE_YEAR =
            CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable();

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(endpointInterceptor);
        registry.addInterceptor(pdfMetricsInterceptor);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String staticPath =
                "file:"
                        + stirling.software.common.configuration.InstallationPathConfig
                                .getStaticPath();

        // 1. Service worker and PWA metadata (never store)
        // Browsers revalidate SW bytes anyway; no-store is the safest for atomic updates.
        registry.addResourceHandler(
                        "/sw.js", "/manifest.json", "/site.webmanifest", "/browserconfig.xml")
                .addResourceLocations(staticPath, "classpath:/static/")
                .setCacheControl(CacheControl.noStore())
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        // 2. Vite fingerprinted assets (immutable)
        // These already have content hashes in filenames (e.g. index-ChAS4tCC.js)
        registry.addResourceHandler("/assets/**")
                .addResourceLocations(staticPath + "assets/", "classpath:/static/assets/")
                .setCacheControl(IMMUTABLE_ONE_YEAR)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        // 3. Media and fonts (immutable)
        registry.addResourceHandler("/images/**", "/fonts/**")
                .addResourceLocations(
                        staticPath + "images/",
                        "classpath:/static/images/",
                        staticPath + "fonts/",
                        "classpath:/static/fonts/")
                .setCacheControl(IMMUTABLE_ONE_YEAR)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        // 4. Branding and stable non-fingerprinted assets (1 day + SWR)
        // Use stale-while-revalidate to improve perceived performance.
        CacheControl brandingCache =
                CacheControl.maxAge(Duration.ofDays(1))
                        .cachePublic()
                        .staleWhileRevalidate(Duration.ofDays(7));

        // 4a. modern-logo/classic-logo get their own handler scoped to their own
        // subdirectory only. They must NOT share location roots with the legacy
        // "/favicon.*" handler below: a shared root location list would let a
        // request like "/modern-logo/favicon.ico" resolve (via the stripped
        // "favicon.ico" lookup) against the unrelated legacy static/favicon.ico
        // instead of static/modern-logo/favicon.ico.
        registry.addResourceHandler("/modern-logo/**")
                .addResourceLocations(staticPath + "modern-logo/", "classpath:/static/modern-logo/")
                .setCacheControl(brandingCache)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        registry.addResourceHandler("/classic-logo/**")
                .addResourceLocations(
                        staticPath + "classic-logo/", "classpath:/static/classic-logo/")
                .setCacheControl(brandingCache)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        registry.addResourceHandler(
                        "/favicon.*",
                        "/apple-touch-icon.png",
                        "/android-chrome-*.png",
                        "/mstile-*.png",
                        "/safari-pinned-tab.svg",
                        "/icons/**",
                        "/3rdPartyLicenses.json",
                        "/pdfjs/**",
                        "/pdfjs-legacy/**",
                        "/pdfium/**",
                        "/locales/**",
                        "/css/**",
                        "/js/**",
                        "/vendor/**",
                        "/samples/**",
                        "/og_images/**",
                        "/Login/**",
                        "/manifest-classic.json")
                .addResourceLocations(
                        staticPath,
                        "classpath:/static/",
                        staticPath + "pdfjs/",
                        "classpath:/static/pdfjs/",
                        staticPath + "pdfjs-legacy/",
                        "classpath:/static/pdfjs-legacy/",
                        staticPath + "pdfium/",
                        "classpath:/static/pdfium/",
                        staticPath + "locales/",
                        "classpath:/static/locales/",
                        staticPath + "css/",
                        "classpath:/static/css/",
                        staticPath + "js/",
                        "classpath:/static/js/",
                        staticPath + "vendor/",
                        "classpath:/static/vendor/",
                        staticPath + "samples/",
                        "classpath:/static/samples/",
                        staticPath + "og_images/",
                        "classpath:/static/og_images/",
                        staticPath + "Login/",
                        "classpath:/static/Login/",
                        staticPath + "icons/",
                        "classpath:/static/icons/")
                .setCacheControl(brandingCache)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());

        // 5. Catch-all (SPA fallback)
        // Must check with server to ensure index.html is always fresh.
        registry.addResourceHandler("/**")
                .addResourceLocations(staticPath, "classpath:/static/")
                .setCacheControl(NO_CACHE)
                .resourceChain(true)
                .addResolver(new EncodedResourceResolver());
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Check if user has configured custom origins
        boolean hasConfiguredOrigins =
                applicationProperties.getSystem() != null
                        && applicationProperties.getSystem().getCorsAllowedOrigins() != null
                        && !applicationProperties.getSystem().getCorsAllowedOrigins().isEmpty();

        if (hasConfiguredOrigins) {
            logger.info(
                    "Configuring CORS with allowed origins: {}",
                    applicationProperties.getSystem().getCorsAllowedOrigins());

            String[] allowedOrigins =
                    applicationProperties
                            .getSystem()
                            .getCorsAllowedOrigins()
                            .toArray(new String[0]);

            registry.addMapping("/**")
                    .allowedOriginPatterns(allowedOrigins)
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders(
                            "Authorization",
                            "Content-Type",
                            "X-Requested-With",
                            "Accept",
                            "Origin",
                            "X-API-KEY",
                            "X-CSRF-TOKEN",
                            "X-XSRF-TOKEN",
                            "X-Browser-Id")
                    .exposedHeaders(
                            "WWW-Authenticate",
                            "X-Total-Count",
                            "X-Page-Number",
                            "X-Page-Size",
                            "Content-Disposition",
                            "Content-Type")
                    .allowCredentials(true)
                    .maxAge(3600);
        } else {
            // Default to allowing all origins when nothing is configured
            logger.debug(
                    "No CORS allowed origins configured in settings.yml"
                            + " (system.corsAllowedOrigins); WebMvcConfig allowing all origins.");
            registry.addMapping("/**")
                    .allowedOriginPatterns("*")
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders(
                            "Authorization",
                            "Content-Type",
                            "X-Requested-With",
                            "Accept",
                            "Origin",
                            "X-API-KEY",
                            "X-CSRF-TOKEN",
                            "X-XSRF-TOKEN",
                            "X-Browser-Id")
                    .exposedHeaders(
                            "WWW-Authenticate",
                            "X-Total-Count",
                            "X-Page-Number",
                            "X-Page-Size",
                            "Content-Disposition",
                            "Content-Type")
                    .allowCredentials(true)
                    .maxAge(3600);
        }
    }
}
