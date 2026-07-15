package stirling.software.SPDF.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

/**
 * Tracks per-endpoint visit counts for the admin-only "Visit Statistics" dashboard. Counts are
 * accumulated in memory and flushed to the {@code visit_stats} table on a fixed schedule to keep
 * per-request overhead to a single map increment.
 */
@Slf4j
@Service
public class VisitStatsService {

    private static final int FLUSH_INTERVAL_MS = 300_000;

    private final JdbcTemplate jdbcTemplate;
    private final Map<String, LongAdder> pendingCounts = new ConcurrentHashMap<>();

    public VisitStatsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS visit_stats ("
                        + "endpoint VARCHAR(500) NOT NULL, "
                        + "visit_date DATE NOT NULL, "
                        + "visit_count BIGINT NOT NULL DEFAULT 0, "
                        + "PRIMARY KEY (endpoint, visit_date))");
    }

    public void recordVisit(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return;
        }
        pendingCounts.computeIfAbsent(endpoint, k -> new LongAdder()).increment();
    }

    @Scheduled(fixedRate = FLUSH_INTERVAL_MS)
    public void flush() {
        if (pendingCounts.isEmpty()) {
            return;
        }
        LocalDate today = LocalDate.now();
        for (String endpoint : new ArrayList<>(pendingCounts.keySet())) {
            LongAdder adder = pendingCounts.remove(endpoint);
            if (adder == null) {
                continue;
            }
            long delta = adder.sum();
            if (delta > 0) {
                upsert(endpoint, today, delta);
            }
        }
    }

    private void upsert(String endpoint, LocalDate date, long delta) {
        try {
            int updated =
                    jdbcTemplate.update(
                            "UPDATE visit_stats SET visit_count = visit_count + ? "
                                    + "WHERE endpoint = ? AND visit_date = ?",
                            delta,
                            endpoint,
                            date);
            if (updated == 0) {
                jdbcTemplate.update(
                        "INSERT INTO visit_stats (endpoint, visit_date, visit_count) "
                                + "VALUES (?, ?, ?)",
                        endpoint,
                        date,
                        delta);
            }
        } catch (Exception e) {
            log.warn("Failed to persist visit stats for {}: {}", endpoint, e.getMessage());
        }
    }

    public record EndpointVisit(String endpoint, long visits) {}

    public record DailyVisit(LocalDate date, long visits) {}

    public List<EndpointVisit> topEndpoints(int days, int limit) {
        LocalDate since = LocalDate.now().minusDays(Math.max(0, days - 1));
        return jdbcTemplate.query(
                "SELECT endpoint, SUM(visit_count) AS total FROM visit_stats "
                        + "WHERE visit_date >= ? GROUP BY endpoint ORDER BY total DESC LIMIT ?",
                (rs, i) -> new EndpointVisit(rs.getString("endpoint"), rs.getLong("total")),
                since,
                limit);
    }

    public List<DailyVisit> dailyTotals(int days) {
        LocalDate since = LocalDate.now().minusDays(Math.max(0, days - 1));
        return jdbcTemplate.query(
                "SELECT visit_date, SUM(visit_count) AS total FROM visit_stats "
                        + "WHERE visit_date >= ? GROUP BY visit_date ORDER BY visit_date",
                (rs, i) ->
                        new DailyVisit(rs.getDate("visit_date").toLocalDate(), rs.getLong("total")),
                since);
    }

    public long totalVisits(int days) {
        LocalDate since = LocalDate.now().minusDays(Math.max(0, days - 1));
        Long total =
                jdbcTemplate.queryForObject(
                        "SELECT COALESCE(SUM(visit_count), 0) FROM visit_stats "
                                + "WHERE visit_date >= ?",
                        Long.class,
                        since);
        return total != null ? total : 0L;
    }

    public int totalEndpoints(int days) {
        LocalDate since = LocalDate.now().minusDays(Math.max(0, days - 1));
        Integer total =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(DISTINCT endpoint) FROM visit_stats WHERE visit_date >= ?",
                        Integer.class,
                        since);
        return total != null ? total : 0;
    }
}
