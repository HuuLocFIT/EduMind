import React from "react";
import { GraduationCap, Loader2 } from "lucide-react";

interface FullPageLoadingProps {
  message?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <GraduationCap className="w-16 h-16 text-blue-600" />
          <span className="text-4xl font-bold text-gray-900">EduMind</span>
        </div>

        {/* Spinner */}
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />

        {/* Message */}
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};
