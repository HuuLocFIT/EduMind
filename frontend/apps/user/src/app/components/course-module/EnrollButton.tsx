import React, { useState } from "react";
import { Button } from "@edumind/user-ui";
import { Check, Lock } from "lucide-react";

interface EnrollButtonProps {
  courseId: number;
  isEnrolled: boolean;
  isFree: boolean;
  onEnroll: () => Promise<void>;
  className?: string;
}

export const EnrollButton: React.FC<EnrollButtonProps> = ({
  courseId,
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
      <Button variant="secondary" className={`w-full ${className}`} disabled>
        <Check className="w-4 h-4 mr-2" />
        Enrolled
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      onClick={handleEnroll}
      isLoading={loading}
      className={`w-full ${className}`}
    >
      {isFree ? "Enroll for Free" : "Enroll Now"}
    </Button>
  );
};
