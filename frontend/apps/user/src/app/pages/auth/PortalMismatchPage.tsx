import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { USER_ROUTES, ADMIN_PORTAL_URL } from "@edumind/shared-utils";
import { useAuthStore } from "../../stores/auth.store";
import { Button, Card } from "@edumind/user-ui";

/**
 * Rendered by AuthBootBoundary in place of route content when a confirmed
 * identity does not belong to this portal. Local state is already cleared
 * (see refreshSession's PORTAL_MISMATCH branch) - the shared refresh cookie
 * is left untouched, so this is intentionally not a logout screen. No
 * default logout CTA - see fix_multiple_account_on_browser_profile.md P1-11.
 */
export function PortalMismatchPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchAccount = () => {
    useAuthStore.getState().startSwitchingAccount();
    navigate(USER_ROUTES.LOGIN, { state: { from: location } });
  };

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 text-center"
    >
      <Card className="w-full max-w-md" padding="lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Wrong account for this portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          This account isn't available on this portal.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="primary" fullWidth onClick={handleSwitchAccount}>
            Log in with a different account
          </Button>
          {ADMIN_PORTAL_URL && (
            <a
              href={ADMIN_PORTAL_URL}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-600 px-4 py-2 font-semibold text-blue-600 transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to the admin portal
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
