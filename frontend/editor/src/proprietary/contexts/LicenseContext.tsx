import React, {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { LicenseInfo } from "@app/types/license";

interface LicenseContextValue {
  licenseInfo: LicenseInfo | null;
  loading: boolean;
  error: string | null;
  refetchLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(
  undefined,
);

interface LicenseProviderProps {
  children: ReactNode;
}

const FULL_MIT_LICENSE_INFO: LicenseInfo = {
  licenseType: "ENTERPRISE",
  enabled: true,
  maxUsers: 0,
  hasKey: false,
};

export const LicenseProvider: React.FC<LicenseProviderProps> = ({
  children,
}) => {
  const contextValue: LicenseContextValue = useMemo(
    () => ({
      licenseInfo: FULL_MIT_LICENSE_INFO,
      loading: false,
      error: null,
      refetchLicense: async () => {},
    }),
    [],
  );

  return (
    <LicenseContext.Provider value={contextValue}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useOptionalLicense = (): LicenseContextValue | undefined => {
  return useContext(LicenseContext);
};

export const useLicense = (): LicenseContextValue => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error("useLicense must be used within LicenseProvider");
  }
  return context;
};
