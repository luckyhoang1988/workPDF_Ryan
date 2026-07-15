package stirling.software.proprietary.security.configuration.ee;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import stirling.software.common.service.LicenseServiceInterface;

/** Full-MIT build: always reports enterprise tier. */
@Service
@RequiredArgsConstructor
public class DynamicLicenseService implements LicenseServiceInterface {

    private final LicenseKeyChecker licenseKeyChecker;

    public PremiumLicenseTier getCurrentLicense() {
        return licenseKeyChecker.getPremiumLicenseEnabledResult();
    }

    @Override
    public boolean isRunningProOrHigher() {
        return true;
    }

    @Override
    public boolean isRunningEE() {
        return true;
    }

    @Override
    public String getLicenseTypeName() {
        return getCurrentLicense().name();
    }
}
