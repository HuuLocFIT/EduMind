import React from 'react';
import { Button } from '@edumind/user-ui';

export interface CourseNotFoundProps {
  onBackToLearning: () => void;
  className?: string;
}

export const CourseNotFound: React.FC<CourseNotFoundProps> = ({ onBackToLearning, className }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className ?? ''}`}>
      <div className="text-center">
        <p className="text-gray-600 text-lg mb-4">Course not found</p>
        <Button variant="primary" onClick={onBackToLearning}>
          Back to My Learning
        </Button>
      </div>
    </div>
  );
};
