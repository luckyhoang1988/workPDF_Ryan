package stirling.software.proprietary.security.oauth2;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Utility class for OAuth2 SPA redirect handling. Centralizes common logic for callback path
 * construction and the redirect-target cookie.
 */
public final class OAuthRedirectUtils {

    public static final String SPA_REDIRECT_COOKIE = "stirling_redirect_path";
    public static final String DEFAULT_CALLBACK_PATH = "/auth/callback";

    private OAuthRedirectUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Builds the default callback path for the given context path.
     *
     * @param contextPath The application context path
     * @return The full callback path
     */
    public static String defaultCallbackPath(String contextPath) {
        if (contextPath == null
                || contextPath.isBlank()
                || "/".equals(contextPath)
                || "\\".equals(contextPath)) {
            return DEFAULT_CALLBACK_PATH;
        }
        return contextPath + DEFAULT_CALLBACK_PATH;
    }

    /**
     * Normalizes context path by removing trailing slashes and handling empty/root paths.
     *
     * @param contextPath The context path to normalize
     * @return Normalized context path (empty string for root)
     */
    public static String normalizeContextPath(String contextPath) {
        if (contextPath == null || contextPath.isBlank() || "/".equals(contextPath)) {
            return "";
        }
        return contextPath;
    }

    /**
     * Finds the SPA redirect cookie value from the request.
     *
     * @param request The HTTP request
     * @return The redirect path from cookie, or null if not found
     */
    public static String extractRedirectPathFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (SPA_REDIRECT_COOKIE.equals(cookie.getName())) {
                String value =
                        java.net.URLDecoder.decode(
                                cookie.getValue(), java.nio.charset.StandardCharsets.UTF_8);
                return value.trim().isEmpty() ? null : value.trim();
            }
        }
        return null;
    }
}
