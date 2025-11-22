import React from "react";
import { clsx } from "clsx";

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = "horizontal",
}) => {
  return (
    <div
      className={clsx(
        "inline-flex",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        "[&>button:not(:first-child)]:rounded-l-none",
        "[&>button:not(:last-child)]:rounded-r-none",
        orientation === "horizontal"
          ? "[&>button:not(:first-child)]:-ml-px"
          : "[&>button:not(:first-child)]:-mt-px",
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
};
