package stirling.software.SPDF.config;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import stirling.software.SPDF.service.VisitStatsService;
import stirling.software.common.util.RequestUriUtils;

/** Records one visit per trackable request for the admin-only Visit Statistics dashboard. */
@Component
@RequiredArgsConstructor
public class VisitStatsFilter extends OncePerRequestFilter {

    private final VisitStatsService visitStatsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();

        if (RequestUriUtils.isTrackableResource(request.getContextPath(), uri)) {
            visitStatsService.recordVisit(normalize(request.getContextPath(), uri));
        }

        filterChain.doFilter(request, response);
    }

    private String normalize(String contextPath, String uri) {
        String normalized =
                (contextPath != null && !contextPath.isBlank() && uri.startsWith(contextPath))
                        ? uri.substring(contextPath.length())
                        : uri;
        return normalized.isBlank() ? "/" : normalized;
    }
}
