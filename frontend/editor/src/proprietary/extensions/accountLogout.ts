import { clearLocalFileOwnership } from "@app/services/fileOwnershipGuard";

type SignOutFn = () => Promise<void>;

interface AccountLogoutDeps {
  signOut: SignOutFn;
  redirectToLogin: () => void;
}

/**
 * Default (web/proprietary) logout handler: sign out and redirect to /login.
 * Desktop builds override this file via path resolution.
 */
export function useAccountLogout() {
  return async ({
    signOut,
    redirectToLogin,
  }: AccountLogoutDeps): Promise<void> => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "ryanpdf_sso_auto_login_logged_out",
          "1",
        );
      }
      await signOut();
    } finally {
      // Shared-machine hygiene: don't leave this user's local "My Files"
      // cache visible to the next person who signs in on this device.
      await clearLocalFileOwnership();
      redirectToLogin();
    }
  };
}
