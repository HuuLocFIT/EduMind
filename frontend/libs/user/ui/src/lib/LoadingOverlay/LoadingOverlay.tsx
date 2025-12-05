import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  show: boolean;
  text?: string;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  show,
  text = "Loading...",
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-2xl max-w-sm mx-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-900 font-medium text-center">{text}</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
