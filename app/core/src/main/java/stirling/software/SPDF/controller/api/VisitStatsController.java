package stirling.software.SPDF.controller.api;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

import stirling.software.SPDF.service.VisitStatsService;
import stirling.software.SPDF.service.VisitStatsService.DailyVisit;
import stirling.software.SPDF.service.VisitStatsService.EndpointVisit;

/** Admin-only visit/usage statistics, backed by {@link VisitStatsService}. */
@RestController
@RequestMapping("/api/v1/admin/visit-stats")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class VisitStatsController {

    private final VisitStatsService visitStatsService;

    @GetMapping
    public ResponseEntity<VisitStatsResponse> getVisitStats(
            @RequestParam(value = "days", defaultValue = "30") int days,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {

        int lookbackDays = Math.max(1, Math.min(days, 365));
        int endpointLimit = Math.max(1, Math.min(limit, 200));

        List<EndpointVisit> topEndpoints =
                visitStatsService.topEndpoints(lookbackDays, endpointLimit);
        List<DailyVisit> dailyTotals = visitStatsService.dailyTotals(lookbackDays);
        long totalVisits = visitStatsService.totalVisits(lookbackDays);
        int totalEndpoints = visitStatsService.totalEndpoints(lookbackDays);

        return ResponseEntity.ok(
                new VisitStatsResponse(totalVisits, totalEndpoints, topEndpoints, dailyTotals));
    }

    public record VisitStatsResponse(
            long totalVisits,
            int totalEndpoints,
            List<EndpointVisit> topEndpoints,
            List<DailyVisit> dailyTotals) {}
}
