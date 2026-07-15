import apiClient from "@app/services/apiClient";

export interface VisitStatsEndpoint {
  endpoint: string;
  visits: number;
}

export interface VisitStatsDaily {
  date: string;
  visits: number;
}

export interface VisitStatsResponse {
  totalVisits: number;
  totalEndpoints: number;
  topEndpoints: VisitStatsEndpoint[];
  dailyTotals: VisitStatsDaily[];
}

const visitStatsService = {
  async getVisitStats(days = 30, limit = 20): Promise<VisitStatsResponse> {
    const response = await apiClient.get<VisitStatsResponse>(
      "/api/v1/admin/visit-stats",
      { params: { days, limit } },
    );
    return response.data;
  },
};

export default visitStatsService;
