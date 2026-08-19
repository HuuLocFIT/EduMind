import React from 'react';
import type { LessonResponse } from '@edumind/shared-types';
import { Card } from '@edumind/user-ui';
import { formatFileSize } from '@edumind/shared-utils';
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
        {resources.map((resource) => {
          const sizeLabel = typeof resource.size === 'number' ? `, ${formatFileSize(resource.size)}` : '';
          const accessibleLabel = `${resource.title}, ${resource.type.toUpperCase()} file${sizeLabel}, opens in new tab`;

          return (
            <li key={resource.url}>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={accessibleLabel}
                className="text-blue-600 hover:text-blue-800 flex items-start gap-2"
              >
                <FileText className="w-4 h-4 shrink-0 mt-1" aria-hidden="true" />
                <span aria-hidden="true" className="min-w-0 break-words">
                  {resource.title}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 whitespace-nowrap self-start mt-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5"
                >
                  {resource.type.toUpperCase()}
                  {typeof resource.size === 'number' ? ` · ${formatFileSize(resource.size)}` : ''}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
