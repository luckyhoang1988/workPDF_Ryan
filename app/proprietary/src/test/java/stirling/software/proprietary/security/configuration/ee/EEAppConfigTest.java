package stirling.software.proprietary.security.configuration.ee;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import stirling.software.common.model.ApplicationProperties;

class EEAppConfigTest {

    @Test
    void runningProOrHigher_alwaysTrueInFullMitBuild() {
        EEAppConfig cfg = new EEAppConfig(new ApplicationProperties());
        assertThat(cfg.runningProOrHigher()).isTrue();
    }

    @Test
    void runningEnterprise_alwaysTrueInFullMitBuild() {
        EEAppConfig cfg = new EEAppConfig(new ApplicationProperties());
        assertThat(cfg.runningEnterprise()).isTrue();
    }

    @Test
    void licenseType_alwaysEnterpriseInFullMitBuild() {
        EEAppConfig cfg = new EEAppConfig(new ApplicationProperties());
        assertThat(cfg.licenseType()).isEqualTo("ENTERPRISE");
    }

    @Test
    void ssoAutoLogin_followsConfigWithoutLicenseGate() {
        ApplicationProperties props = new ApplicationProperties();
        props.getPremium().getProFeatures().setSsoAutoLogin(true);
        EEAppConfig cfg = new EEAppConfig(props);

        assertThat(cfg.ssoAutoLogin()).isTrue();
    }
}
