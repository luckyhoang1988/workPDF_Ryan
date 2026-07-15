package stirling.software.proprietary.security.configuration.ee;

import java.io.IOException;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.util.GeneralUtils;
import stirling.software.proprietary.service.UserLicenseSettingsService;

@Slf4j
@Component
public class LicenseKeyChecker {

    private final ApplicationProperties applicationProperties;

    private final UserLicenseSettingsService licenseSettingsService;

    private volatile PremiumLicenseTier premiumEnabledResult = PremiumLicenseTier.ENTERPRISE;

    public LicenseKeyChecker(
            ApplicationProperties applicationProperties,
            @Lazy UserLicenseSettingsService licenseSettingsService) {
        this.applicationProperties = applicationProperties;
        this.licenseSettingsService = licenseSettingsService;
    }

    @PostConstruct
    public void init() {
        evaluateLicense();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        synchronizeLicenseSettings();
    }

    @Scheduled(initialDelay = 604800000, fixedRate = 604800000)
    public void checkLicensePeriodically() {
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    private void evaluateLicense() {
        premiumEnabledResult = PremiumLicenseTier.ENTERPRISE;
        log.debug("Full MIT build: premium features unlocked without license key.");
    }

    private void synchronizeLicenseSettings() {
        licenseSettingsService.updateLicenseMaxUsers();
    }

    public void updateLicenseKey(String newKey) {
        applicationProperties.getPremium().setKey(newKey);
        try {
            GeneralUtils.saveKeyToSettings("premium.key", newKey);
        } catch (IOException e) {
            log.warn("Failed to persist premium.key to settings", e);
        }
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    public void resyncLicense() {
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    public PremiumLicenseTier getPremiumLicenseEnabledResult() {
        return premiumEnabledResult;
    }

    /** No-op in full MIT build — premium features are not license-gated. */
    public void requireProOrEnterprise(String configuredAs) {
        // intentionally empty
    }
}
