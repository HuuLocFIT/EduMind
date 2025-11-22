import React from "react";
import { clsx } from "clsx";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx("mt-4 pt-4 border-t border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  );
};
