import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@app/ui/Button";
import LocalIcon from "@app/components/shared/LocalIcon";
import { useLoginRequired } from "@app/hooks/useLoginRequired";
import LoginRequiredBanner from "@app/components/shared/config/LoginRequiredBanner";
import visitStatsService, {
  VisitStatsResponse,
} from "@app/services/visitStatsService";

const VisitStatsSection: React.FC = () => {
  const { t } = useTranslation();
  const { loginEnabled } = useLoginRequired();
  const [data, setData] = useState<VisitStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitStatsService.getVisitStats(30, 20);
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load visit statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loginEnabled) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [loginEnabled, fetchData]);

  if (!loginEnabled) {
    return (
      <Stack gap="lg">
        <LoginRequiredBanner show />
      </Stack>
    );
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <Loader size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        color="red"
        title={t("visitStats.error", "Error loading visit statistics")}
      >
        {error}
      </Alert>
    );
  }

  const topEndpoints = data?.topEndpoints ?? [];
  const dailyTotals = data?.dailyTotals ?? [];
  const totalVisits = data?.totalVisits ?? 0;
  const totalEndpoints = data?.totalEndpoints ?? 0;
  const maxVisits = Math.max(...topEndpoints.map((e) => e.visits), 1);
  const maxDaily = Math.max(...dailyTotals.map((d) => d.visits), 1);

  return (
    <Stack gap="lg">
      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="lg" fw={600}>
              {t("visitStats.title", "Visit Statistics")}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              leftSection={<LocalIcon icon="refresh" width="1rem" height="1rem" />}
              onClick={fetchData}
              loading={loading}
            >
              {t("visitStats.refresh", "Refresh")}
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            {t(
              "visitStats.description",
              "Requests received over the last 30 days, by page/tool. Admin-only.",
            )}
          </Text>
          <Group gap="xl">
            <div>
              <Text size="sm" c="dimmed">
                {t("visitStats.totalVisits", "Total Visits")}
              </Text>
              <Text size="lg" fw={600}>
                {totalVisits.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {t("visitStats.totalEndpoints", "Distinct Pages/Tools")}
              </Text>
              <Text size="lg" fw={600}>
                {totalEndpoints}
              </Text>
            </div>
          </Group>
        </Stack>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="lg" fw={600}>
            {t("visitStats.dailyTitle", "Visits per Day")}
          </Text>
          {dailyTotals.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t("visitStats.noData", "No data available yet")}
            </Text>
          ) : (
            <Stack gap="xs">
              {dailyTotals.map((day) => (
                <Box key={day.date}>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" c="dimmed">
                      {day.date}
                    </Text>
                    <Text size="xs" fw={600}>
                      {day.visits.toLocaleString()}
                    </Text>
                  </Group>
                  <Box
                    style={{
                      width: "100%",
                      height: "0.5rem",
                      backgroundColor: "var(--mantine-color-gray-2)",
                      borderRadius: "var(--mantine-radius-sm)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      style={{
                        width: `${(day.visits / maxDaily) * 100}%`,
                        height: "100%",
                        backgroundColor: "var(--mantine-color-blue-6)",
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      <Card padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Text size="lg" fw={600}>
            {t("visitStats.tableTitle", "Top Pages/Tools")}
          </Text>
          <Table horizontalSpacing="md" verticalSpacing="sm" withRowBorders highlightOnHover>
            <TableThead>
              <TableTr style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
                <TableTh w="5%">#</TableTh>
                <TableTh w="55%">{t("visitStats.table.endpoint", "Page/Tool")}</TableTh>
                <TableTh w="20%" ta="right">
                  {t("visitStats.table.visits", "Visits")}
                </TableTh>
                <TableTh w="20%" ta="right">
                  {t("visitStats.table.share", "Share")}
                </TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {topEndpoints.length === 0 ? (
                <TableTr>
                  <TableTd colSpan={4}>
                    <Text ta="center" c="dimmed" py="xl">
                      {t("visitStats.noData", "No data available yet")}
                    </Text>
                  </TableTd>
                </TableTr>
              ) : (
                topEndpoints.map((stat, index) => (
                  <TableTr key={stat.endpoint}>
                    <TableTd>
                      <Text size="sm" c="dimmed">
                        {index + 1}
                      </Text>
                    </TableTd>
                    <TableTd>
                      <Text size="sm" truncate>
                        {stat.endpoint}
                      </Text>
                    </TableTd>
                    <TableTd ta="right">
                      <Text size="sm" fw={600}>
                        {stat.visits.toLocaleString()}
                      </Text>
                    </TableTd>
                    <TableTd ta="right">
                      <Text size="sm" c="dimmed">
                        {((stat.visits / maxVisits) * 100).toFixed(1)}%
                      </Text>
                    </TableTd>
                  </TableTr>
                ))
              )}
            </TableTbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );
};

export default VisitStatsSection;
