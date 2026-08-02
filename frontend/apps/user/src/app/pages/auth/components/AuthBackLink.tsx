import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { clsx } from "clsx";

export interface AuthBackLinkProps extends Omit<LinkProps, "children"> {
  children?: ReactNode;
}

export const AuthBackLink = ({
  children = "Back to Login",
  className,
  ...props
}: AuthBackLinkProps) => (
  <Link
    className={clsx(
      "inline-flex items-center gap-2 rounded text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  >
    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
    {children}
  </Link>
);
