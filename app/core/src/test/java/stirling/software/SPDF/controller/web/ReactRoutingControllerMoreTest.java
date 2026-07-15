package stirling.software.SPDF.controller.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.MockedStatic;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;

import stirling.software.common.configuration.InstallationPathConfig;

@DisplayName("ReactRoutingController (additional coverage)")
class ReactRoutingControllerMoreTest {

    private ReactRoutingController newController(String contextPath) throws Exception {
        ReactRoutingController controller = new ReactRoutingController();
        setField(controller, "contextPath", contextPath);
        return controller;
    }

    private static void setField(ReactRoutingController c, String name, Object value)
            throws Exception {
        Field field = ReactRoutingController.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(c, value);
    }

    @Nested
    @DisplayName("serveRootPage")
    class ServeRootPage {

        @Test
        @DisplayName("serves the SaaS landing page when present")
        void servesSaasLanding() throws Exception {
            ReactRoutingController controller = newController("/");
            controller.init();
            // Simulate a bundled SaaS landing page detected at startup.
            setField(controller, "saasLandingExists", true);
            setField(controller, "cachedSaasLandingHtml", "<html>SAAS LANDING</html>");

            ResponseEntity<String> response =
                    controller.serveRootPage(mock(HttpServletRequest.class));

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_HTML);
            assertThat(response.getBody()).isEqualTo("<html>SAAS LANDING</html>");
        }

        @Test
        @DisplayName("falls back to the SPA shell when no SaaS landing exists")
        void fallsBackToIndex() throws Exception {
            ReactRoutingController controller = newController("/");
            controller.init();

            ResponseEntity<String> response =
                    controller.serveRootPage(mock(HttpServletRequest.class));

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).contains("RyanPDF");
        }
    }

    @Nested
    @DisplayName("external index.html processing")
    class ExternalIndexHtml {

        @Test
        @DisplayName("rewrites base url, base tag and injects the api base script")
        void rewritesPlaceholders(@TempDir Path staticDir) throws Exception {
            Path indexHtml = staticDir.resolve("index.html");
            Files.writeString(
                    indexHtml,
                    "<html><head><base href=\"/old/\" /><title>x</title></head>"
                            + "<body>%BASE_URL%</body></html>",
                    StandardCharsets.UTF_8);

            try (MockedStatic<InstallationPathConfig> paths =
                    mockStatic(InstallationPathConfig.class)) {
                paths.when(InstallationPathConfig::getStaticPath)
                        .thenReturn(staticDir.toString() + "/");

                ReactRoutingController controller = newController("/myapp");
                controller.init();

                ResponseEntity<String> response =
                        controller.serveIndexHtml(mock(HttpServletRequest.class));

                String body = response.getBody();
                assertThat(body).isNotNull();
                // %BASE_URL% replaced with normalized context path.
                assertThat(body).contains("/myapp/");
                assertThat(body).doesNotContain("%BASE_URL%");
                // Existing <base> tag rewritten and api base script injected before </head>.
                assertThat(body).contains("<base href=\"/myapp/\"");
                assertThat(body).contains("window.STIRLING_PDF_API_BASE_URL = '/myapp/'");
            }
        }
    }

    @Nested
    @DisplayName("serveIndexHtml fallbacks")
    class ServeIndexHtmlFallbacks {

        @Test
        @DisplayName("processes on each request when nothing is cached")
        void processesWhenNoCache() throws Exception {
            ReactRoutingController controller = newController("/");
            // Skip init(); force the uncached branch directly.
            setField(controller, "indexHtmlExists", false);
            setField(controller, "cachedIndexHtml", null);

            ResponseEntity<String> response =
                    controller.serveIndexHtml(mock(HttpServletRequest.class));

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).contains("RyanPDF");
        }
    }

    @Nested
    @DisplayName("prerendered per-tool route pages")
    class PrerenderedRoutePages {

        @Test
        @DisplayName("forwardRootPaths serves the tool's prerendered file when one exists")
        void servesFlatPrerenderedFile(@TempDir Path staticDir) throws Exception {
            Files.writeString(
                    staticDir.resolve("compress.html"),
                    "<html><head><title>Nen - RyanPDF</title></head><body></body></html>",
                    StandardCharsets.UTF_8);

            try (MockedStatic<InstallationPathConfig> paths =
                    mockStatic(InstallationPathConfig.class)) {
                paths.when(InstallationPathConfig::getStaticPath)
                        .thenReturn(staticDir.toString() + "/");

                ReactRoutingController controller = newController("/");
                controller.init();

                ResponseEntity<String> response =
                        controller.forwardRootPaths("compress", mock(HttpServletRequest.class));

                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).contains("Nen - RyanPDF");
            }
        }

        @Test
        @DisplayName("forwardRootPaths falls back to the SPA shell when no prerendered file exists")
        void fallsBackWhenNoPrerenderedFile(@TempDir Path staticDir) throws Exception {
            try (MockedStatic<InstallationPathConfig> paths =
                    mockStatic(InstallationPathConfig.class)) {
                paths.when(InstallationPathConfig::getStaticPath)
                        .thenReturn(staticDir.toString() + "/");

                ReactRoutingController controller = newController("/");
                controller.init();

                ResponseEntity<String> response =
                        controller.forwardRootPaths(
                                "some-unknown-route", mock(HttpServletRequest.class));

                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).contains("RyanPDF");
                assertThat(response.getBody()).doesNotContain("Nen - RyanPDF");
            }
        }

        @Test
        @DisplayName("forwardNestedPaths serves the nested prerendered file when one exists")
        void servesNestedPrerenderedFile(@TempDir Path staticDir) throws Exception {
            Files.createDirectories(staticDir.resolve("settings"));
            Files.writeString(
                    staticDir.resolve("settings").resolve("people.html"),
                    "<html><head><title>People Settings - RyanPDF</title></head><body></body></html>",
                    StandardCharsets.UTF_8);

            try (MockedStatic<InstallationPathConfig> paths =
                    mockStatic(InstallationPathConfig.class)) {
                paths.when(InstallationPathConfig::getStaticPath)
                        .thenReturn(staticDir.toString() + "/");

                ReactRoutingController controller = newController("/");
                controller.init();

                ResponseEntity<String> response =
                        controller.forwardNestedPaths(
                                "settings", "people", mock(HttpServletRequest.class));

                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                assertThat(response.getBody()).contains("People Settings - RyanPDF");
            }
        }
    }
}
