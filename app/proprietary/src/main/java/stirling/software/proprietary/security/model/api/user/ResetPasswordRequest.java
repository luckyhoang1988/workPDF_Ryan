package stirling.software.proprietary.security.model.api.user;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;

@Data
public class ResetPasswordRequest {

    @Schema(description = "password reset token from the emailed link")
    private String token;

    @Schema(description = "new password to set", format = "password")
    private String newPassword;
}
