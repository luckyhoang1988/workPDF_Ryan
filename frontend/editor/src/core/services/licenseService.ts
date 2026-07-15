import type { LicenseInfo } from "@app/types/license";

/** Full MIT build: license billing APIs removed; stub for legacy imports. */
const licenseService = {
  async getLicenseInfo(): Promise<LicenseInfo> {
    return {
      licenseType: "ENTERPRISE",
      enabled: true,
      maxUsers: 0,
      hasKey: false,
    };
  },
};

export default licenseService;
