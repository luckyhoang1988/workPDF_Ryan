import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Self-service username/password signup has been retired - new accounts are
// created via "Sign in with Google" only. Redirect any stray links/bookmarks
// straight to the login page instead of rendering a password signup form.
export default function Signup() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
