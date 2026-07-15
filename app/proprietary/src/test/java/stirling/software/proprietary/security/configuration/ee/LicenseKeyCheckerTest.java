package stirling.software.proprietary.security.configuration.ee;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.security.configuration.ee.KeygenLicenseVerifier.License;
import stirling.software.proprietary.service.UserLicenseSettingsService;

@ExtendWith(MockitoExtension.class)
class LicenseKeyCheckerTest {

    @Mock private KeygenLicenseVerifier verifier;
    @Mock private UserLicenseSettingsService userLicenseSettingsService;

    @Test
    void alwaysUnlocksEnterpriseWithoutKeyVerification() {
        ApplicationProperties props = new ApplicationProperties();
        props.getPremium().setEnabled(false);

        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, props, userLicenseSettingsService);
        checker.init();

        assertEquals(License.ENTERPRISE, checker.getPremiumLicenseEnabledResult());
    }

    @Test
    void requireProOrEnterprise_isNoOpInFullMitBuild() {
        ApplicationProperties props = new ApplicationProperties();
        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, props, userLicenseSettingsService);
        checker.init();

        assertThatCode(() -> checker.requireProOrEnterprise("storage.provider=s3"))
                .doesNotThrowAnyException();
    }
}
