package stirling.software.proprietary.security.model.api.user;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @Schema(description = "username (email) of the account to send a reset link to")
    private String username;
}
