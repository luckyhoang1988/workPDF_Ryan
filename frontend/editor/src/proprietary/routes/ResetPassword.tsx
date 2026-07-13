import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PasswordInput } from "@mantine/core";
import { Button } from "@app/ui/Button";
import { useDocumentMeta } from "@app/hooks/useDocumentMeta";
import AuthLayout from "@app/routes/authShared/AuthLayout";
import LoginHeader from "@app/routes/login/LoginHeader";
import NavigationLink from "@app/routes/login/NavigationLink";
import ErrorMessage from "@app/auth/ui/ErrorMessage";
import { springAuth } from "@app/auth/spring/springAuthClient";
import { BASE_PATH, withBasePath } from "@app/constants/app";
import "@app/auth/ui/auth.css";
import loginHeader from "@app/assets/brand/modern-logo/LoginLightModeHeader.svg";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didUpdate, setDidUpdate] = useState(false);

  const baseUrl = window.location.origin + BASE_PATH;

  useDocumentMeta({
    title: `${t("login.resetYourPassword", "Reset your password")} - RyanPDF`,
    description: t(
      "app.description",
      "The Free Adobe Acrobat alternative (10M+ Downloads)",
    ),
    ogTitle: `${t("login.resetYourPassword", "Reset your password")} - RyanPDF`,
    ogDescription: t(
      "app.description",
      "The Free Adobe Acrobat alternative (10M+ Downloads)",
    ),
    ogImage: `${baseUrl}/og_images/home.png`,
    ogUrl: `${window.location.origin}${window.location.pathname}`,
  });

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setError(t("signup.pleaseFillAllFields", "Please fill in all fields"));
      return;
    }
    if (password.length < 6) {
      setError(
        t("signup.passwordTooShort", "Password must be at least 6 characters"),
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signup.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }
    if (!token) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const { error: resetError } = await springAuth.resetPassword(
        token,
        password,
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setDidUpdate(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/login?messageType=passwordChanged"), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-logo-block">
        <img
          src={loginHeader}
          alt="RyanPDF"
          className="auth-logo-header auth-logo-header--light"
        />
        <img
          src={withBasePath("/modern-logo/LoginDarkModeHeader.svg")}
          alt="RyanPDF"
          className="auth-logo-header auth-logo-header--dark"
        />
      </div>

      <LoginHeader title={t("login.resetYourPassword", "Reset your password")} />

      <ErrorMessage error={error} />

      {!token ? (
        <>
          <ErrorMessage
            error={t(
              "login.invalidResetLink",
              "This password reset link is invalid or has expired.",
            )}
          />
          <NavigationLink
            onClick={() => navigate("/forgot-password")}
            text={t("login.forgotPassword", "Forgot your password?")}
          />
        </>
      ) : didUpdate ? (
        <>
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "0.5rem",
              color: "#16a34a",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center" }}>
              {t(
                "login.passwordUpdatedSuccess",
                "Your password has been updated successfully.",
              )}
            </p>
          </div>
          <NavigationLink
            onClick={() => navigate("/login")}
            text={t("login.backToSignIn", "Back to sign in")}
          />
        </>
      ) : (
        <>
          <div className="auth-fields">
            <div className="auth-field">
              <PasswordInput
                id="password"
                label={t("signup.password", "Password")}
                name="new-password"
                autoComplete="new-password"
                placeholder={t("signup.enterPassword", "Enter your password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isSubmitting && handleUpdatePassword()
                }
                classNames={{ label: "auth-label" }}
              />
            </div>
            <div className="auth-field">
              <PasswordInput
                id="confirmPassword"
                label={t("signup.confirmPassword", "Confirm password")}
                name="new-password"
                autoComplete="new-password"
                placeholder={t(
                  "signup.confirmPasswordPlaceholder",
                  "Re-enter your password",
                )}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isSubmitting && handleUpdatePassword()
                }
                classNames={{ label: "auth-label" }}
              />
            </div>
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={isSubmitting || !password || !confirmPassword}
            className="auth-button"
            fullWidth
            loading={isSubmitting}
          >
            {isSubmitting
              ? t("login.sending", "Sending…")
              : t("login.updatePassword", "Update password")}
          </Button>
          <NavigationLink
            onClick={() => navigate("/login")}
            text={t("login.backToSignIn", "Back to sign in")}
            isDisabled={isSubmitting}
          />
        </>
      )}
    </AuthLayout>
  );
}
