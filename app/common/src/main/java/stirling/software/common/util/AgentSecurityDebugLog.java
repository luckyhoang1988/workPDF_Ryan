package stirling.software.common.util;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

public final class AgentSecurityDebugLog {

    private static final String SESSION_ID = "067f11";
    private static final Path LOG_PATH = Path.of("debug-067f11.log");

    private AgentSecurityDebugLog() {}

    public static void log(
            String runId,
            String hypothesisId,
            String location,
            String message,
            Map<String, ?> data) {
        try {
            String payload =
                    "{"
                            + "\"sessionId\":"
                            + quote(SESSION_ID)
                            + ",\"runId\":"
                            + quote(runId)
                            + ",\"hypothesisId\":"
                            + quote(hypothesisId)
                            + ",\"location\":"
                            + quote(location)
                            + ",\"message\":"
                            + quote(message)
                            + ",\"data\":"
                            + mapToJson(data)
                            + ",\"timestamp\":"
                            + Instant.now().toEpochMilli()
                            + "}";
            Files.writeString(
                    LOG_PATH,
                    payload + System.lineSeparator(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);
        } catch (IOException ignored) {
            // Debug instrumentation must never affect runtime behavior.
        }
    }

    private static String mapToJson(Map<String, ?> data) {
        return data.entrySet().stream()
                .map(entry -> quote(entry.getKey()) + ":" + valueToJson(entry.getValue()))
                .collect(Collectors.joining(",", "{", "}"));
    }

    private static String valueToJson(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        if (value instanceof Iterable<?> iterable) {
            return iterableToJson(iterable);
        }
        return quote(String.valueOf(value));
    }

    private static String iterableToJson(Iterable<?> values) {
        StringBuilder out = new StringBuilder("[");
        boolean first = true;
        for (Object value : values) {
            if (!first) {
                out.append(',');
            }
            out.append(valueToJson(value));
            first = false;
        }
        return out.append(']').toString();
    }

    private static String quote(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.append('"').toString();
    }
}
