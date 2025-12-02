import React from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
}) => {
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const style: React.CSSProperties = {
    width: width || (variant === "circular" ? "40px" : "100%"),
    height:
      height ||
      (variant === "circular" ? "40px" : variant === "text" ? "1rem" : "200px"),
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        bg-gray-200 
        animate-pulse
        ${className}
      `}
      style={style}
    />
  );
};
