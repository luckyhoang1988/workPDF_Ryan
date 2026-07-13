import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "@app/hooks/useDocumentMeta";
import AuthLayout from "@app/routes/authShared/AuthLayout";
import LoginHeader from "@app/routes/login/LoginHeader";
import NavigationLink from "@app/routes/login/NavigationLink";
import ErrorMessage from "@app/auth/ui/ErrorMessage";
import EmailPasswordForm from "@app/auth/ui/EmailPasswordForm";
import { springAuth } from "@app/auth/spring/springAuthClient";
import { BASE_PATH, withBasePath } from "@app/constants/app";
import "@app/auth/ui/auth.css";
import loginHeader from "@app/assets/brand/modern-logo/LoginLightModeHeader.svg";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const baseUrl = window.location.origin + BASE_PATH;

  useDocumentMeta({
    title: `${t("login.forgotPassword", "Forgot your password?")} - RyanPDF`,
    description: t(
      "app.description",
      "The Free Adobe Acrobat alternative (10M+ Downloads)",
    ),
    ogTitle: `${t("login.forgotPassword", "Forgot your password?")} - RyanPDF`,
    ogDescription: t(
      "app.description",
      "The Free Adobe Acrobat alternative (10M+ Downloads)",
    ),
    ogImage: `${baseUrl}/og_images/home.png`,
    ogUrl: `${window.location.origin}${window.location.pathname}`,
  });

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError(t("login.pleaseEnterEmail", "Please enter your email address"));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const { error: requestError } = await springAuth.forgotPassword(username);
      if (requestError) {
        setError(requestError.message);
        return;
      }
      setSubmitted(true);
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

      <LoginHeader
        title={t("login.forgotPassword", "Forgot your password?")}
      />

      <ErrorMessage error={error} />

      {submitted ? (
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
              {t("login.passwordResetSent", {
                defaultValue:
                  "A password reset link has been sent to {{email}}! Check your email and follow the instructions.",
                email: username,
              })}
            </p>
          </div>
          <NavigationLink
            onClick={() => navigate("/login")}
            text={t("login.backToSignIn", "Back to sign in")}
          />
        </>
      ) : (
        <>
          <EmailPasswordForm
            email={username}
            password=""
            setEmail={setUsername}
            setPassword={() => {}}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitButtonText={
              isSubmitting
                ? t("login.sending", "Sending…")
                : t("login.sendResetLink", "Send reset link")
            }
            showPasswordField={false}
          />
          <p className="text-sm text-gray-500 mt-3">
            {t(
              "login.resetHelp",
              "Enter your email to receive a secure link to reset your password. If the link has expired, please request a new one.",
            )}
          </p>
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
