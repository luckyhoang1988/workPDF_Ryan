import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useAuth } from "@app/auth/UseSession";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import { isValidToolId } from "@app/types/toolId";
import { useSpringLogin } from "@app/auth/ui/useSpringLogin";
import SpringLoginForm from "@app/auth/ui/SpringLoginForm";
import { Z_INDEX_SIGN_IN_MODAL } from "@app/styles/zIndex";
import loginHeaderLight from "@app/assets/brand/modern-logo/LoginLightModeHeader.svg";
import loginHeaderDark from "@app/assets/brand/modern-logo/LoginDarkModeHeader.svg";

const PENDING_TOOL_KEY = "ryanpdf_login_required_pending_tool";

/**
 * Compact login prompt for gated tools. Listens for `ryanpdf:loginRequired`
 * (dispatched by ToolWorkflowContext.handleToolSelect when an anonymous user
 * picks a tool with `requiresAuth !== false`) and opens a centered modal
 * instead of the full-page /login route.
 *
 * The tool the user originally wanted is stashed in sessionStorage so it can
 * be resumed after sign-in - whether that resolves inline (email/password,
 * same page) or via an OAuth redirect round-trip through /auth/callback.
 */
export default function LoginRequiredBootstrap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { handleToolSelectForced } = useToolWorkflow();
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ toolId?: string }>).detail;
      if (detail?.toolId) {
        try {
          window.sessionStorage.setItem(PENDING_TOOL_KEY, detail.toolId);
        } catch {
          // sessionStorage unavailable (private mode): the modal still opens,
          // it just won't auto-resume the tool after sign-in.
        }
      }
      setOpened(true);
    };
    window.addEventListener("ryanpdf:loginRequired", handler as EventListener);
    return () =>
      window.removeEventListener(
        "ryanpdf:loginRequired",
        handler as EventListener,
      );
  }, []);

  // Resume the originally-requested tool once a session appears - covers both
  // an inline email/password sign-in and a return trip from OAuth.
  useEffect(() => {
    if (!session) return;
    let pendingToolId: string | null = null;
    try {
      pendingToolId = window.sessionStorage.getItem(PENDING_TOOL_KEY);
    } catch {
      // sessionStorage unavailable; pendingToolId stays null.
    }
    setOpened(false);
    if (!pendingToolId) return;
    try {
      window.sessionStorage.removeItem(PENDING_TOOL_KEY);
    } catch {
      // Non-fatal: worst case the flag lingers and is overwritten next time.
    }
    if (isValidToolId(pendingToolId)) {
      handleToolSelectForced(pendingToolId);
    }
  }, [session, handleToolSelectForced]);

  const login = useSpringLogin({ ready: !session && opened });

  return (
    <Modal
      opened={opened && !session}
      onClose={() => setOpened(false)}
      withCloseButton
      centered
      size="sm"
      radius="lg"
      zIndex={Z_INDEX_SIGN_IN_MODAL}
      title={
        <Text fw={700} size="lg">
          {t("loginRequiredModal.title", "Sign in to use this tool")}
        </Text>
      }
    >
      <Text size="sm" c="dimmed" mb="md">
        {t(
          "loginRequiredModal.body",
          "This tool needs a free RyanPDF account. Sign in (or create one) to continue - no payment required.",
        )}
      </Text>
      <SpringLoginForm
        state={login}
        logoSrc={loginHeaderLight}
        logoDarkSrc={loginHeaderDark}
        logoAlt="RyanPDF"
        footer={
          <Text size="sm" ta="center" mt="md">
            <a
              href="/signup"
              onClick={(e) => {
                e.preventDefault();
                setOpened(false);
                navigate("/signup");
              }}
            >
              {t(
                "loginRequiredModal.createAccount",
                "Don't have an account? Create one for free",
              )}
            </a>
          </Text>
        }
      />
    </Modal>
  );
}
