import React from "react";
import { clsx } from "clsx";

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={clsx("mt-4", className)} {...props}>
      {children}
    </div>
  );
};
