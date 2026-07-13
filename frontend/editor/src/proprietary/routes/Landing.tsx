import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@app/auth/UseSession";
import { useAppConfig } from "@app/contexts/AppConfigContext";
import HomePage from "@app/pages/HomePage";
import { useBackendProbe } from "@app/hooks/useBackendProbe";
import AuthLayout from "@app/routes/authShared/AuthLayout";
import LoginHeader from "@app/routes/login/LoginHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@app/ui/Button";

/**
 * Landing component - shows HomePage whether or not there is a session.
 * Anonymous visitors can use the tools marked `requiresAuth: false`; everyone
 * else is prompted to sign in at tool-selection time (LoginRequiredBootstrap),
 * not by blocking the route here.
 */
export default function Landing() {
  const { session, loading: authLoading } = useAuth();
  const { config, loading: configLoading, refetch } = useAppConfig();
  const backendProbe = useBackendProbe();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loading = authLoading || configLoading || backendProbe.loading;

  // Debug: Track Landing component lifecycle
  useEffect(() => {
    const mountId = Math.random().toString(36).substring(7);
    console.log(
      `[Landing:${mountId}] 🔵 Component mounted at ${location.pathname}`,
    );
    console.log(`[Landing:${mountId}] Mount state:`, {
      authLoading,
      configLoading,
      backendLoading: backendProbe.loading,
      hasSession: !!session,
    });
    return () => {
      console.log(`[Landing:${mountId}] 🔴 Component unmounting`);
    };
  }, [
    location.pathname,
    authLoading,
    configLoading,
    backendProbe.loading,
    session,
  ]);

  // Periodically probe while backend isn't up so the screen can auto-advance when it comes online
  useEffect(() => {
    if (backendProbe.status === "up" || backendProbe.loginDisabled) {
      return;
    }
    const tick = async () => {
      const result = await backendProbe.probe();
      if (result.status === "up") {
        await refetch();
        if (result.loginDisabled) {
          navigate("/", { replace: true });
        }
      }
    };
    const intervalId = window.setInterval(() => {
      void tick();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [
    backendProbe.status,
    backendProbe.loginDisabled,
    backendProbe.probe,
    navigate,
    refetch,
  ]);

  useEffect(() => {
    if (backendProbe.status === "up") {
      void refetch();
    }
  }, [backendProbe.status, refetch]);

  console.log("[Landing] ════════════════════════════════════");
  console.log("[Landing] Render state:", {
    pathname: location.pathname,
    loading,
    authLoading,
    configLoading,
    backendLoading: backendProbe.loading,
    hasSession: !!session,
    hasConfig: !!config,
    loginEnabled: config?.enableLogin === true && !backendProbe.loginDisabled,
    backendStatus: backendProbe.status,
    timestamp: new Date().toISOString(),
  });
  console.log("[Landing] ════════════════════════════════════");

  // Show loading while checking auth and config
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If login is disabled, show app directly (anonymous mode)
  if (config?.enableLogin === false || backendProbe.loginDisabled) {
    console.debug("[Landing] Login disabled - showing app in anonymous mode");
    return <HomePage />;
  }

  // If backend is not up yet and user is not authenticated, show a branded status screen
  if (!session && backendProbe.status !== "up") {
    const backendTitle = t("backendStartup.notFoundTitle", "Backend not found");
    const handleRetry = async () => {
      const result = await backendProbe.probe();
      if (result.status === "up") {
        await refetch();
        navigate("/", { replace: true });
      }
    };
    return (
      <AuthLayout>
        <LoginHeader title={backendTitle} />
        <div
          className="auth-section"
          style={{
            padding: "1.5rem",
            marginTop: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.2)",
          }}
        >
          <p style={{ margin: "0 0 0.75rem 0", color: "var(--text-primary)" }}>
            {t(
              "backendStartup.unreachable",
              "The application cannot currently connect to the backend. Verify the backend status and network connectivity, then try again.",
            )}
          </p>
          <Button
            type="button"
            onClick={handleRetry}
            className="auth-cta-button px-4 py-[0.75rem] rounded-[0.625rem] text-base font-semibold mt-5 border-0 cursor-pointer"
            style={{ width: "fit-content" }}
          >
            {t("backendStartup.retry", "Retry")}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Show the main app regardless of session. A curated set of tools stays
  // usable anonymously; everything else is gated at tool-selection time by
  // LoginRequiredBootstrap, not by blocking the whole app here.
  return <HomePage />;
}
