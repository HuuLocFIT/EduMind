import React, { useState } from "react";
import { Button } from "@edumind/user-ui";
import { Check } from "lucide-react";

interface EnrollButtonProps {
  courseId: number;
  isEnrolled: boolean;
  isFree: boolean;
  onEnroll: () => Promise<void>;
  className?: string;
}

export const EnrollButton: React.FC<EnrollButtonProps> = ({
  isEnrolled,
  isFree,
  onEnroll,
  className = "",
}) => {
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      await onEnroll();
    } finally {
      setLoading(false);
    }
  };

  if (isEnrolled) {
    return (
      <Button
        variant="secondary"
        size="lg"
        className={`w-full ${className}`}
        disabled
      >
        <Check className="w-4 h-4 mr-2" />
        Enrolled
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={handleEnroll}
      isLoading={loading}
      className={`w-full ${className}`}
    >
      {isFree ? "Enroll for Free" : "Enroll Now"}
    </Button>
  );
};
