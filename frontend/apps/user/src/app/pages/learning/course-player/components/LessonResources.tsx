import React from 'react';
import type { LessonResponse } from '@edumind/shared-types';
import { Card } from '@edumind/user-ui';
import { FileText } from 'lucide-react';

export interface LessonResourcesProps {
  resources: LessonResponse['resources'];
  className?: string;
}

export const LessonResources: React.FC<LessonResourcesProps> = ({ resources, className }) => {
  if (!resources || resources.length === 0) return null;

  return (
    <Card className={`p-6 mb-6 ${className ?? ''}`}>
      <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
      <ul className="space-y-2">
        {resources.map((resource, index: number) => (
          <li key={index}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {resource.title}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
};
