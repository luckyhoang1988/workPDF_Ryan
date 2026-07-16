import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Self-service password reset relied on SMTP that was never configured, and
// accounts are now Google-only - so this page would just accept an email and
// silently pretend to send a reset link. Redirect straight to /login instead.
export default function ForgotPassword() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
