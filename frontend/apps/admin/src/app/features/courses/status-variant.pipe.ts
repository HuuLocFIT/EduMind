import { Pipe, PipeTransform } from '@angular/core';
import { type BadgeVariant } from '@edumind/admin-ui';
import { CourseStatus } from '@edumind/shared-constants';
import { CourseResponse } from '@edumind/shared-types';

@Pipe({ name: 'statusVariant', standalone: true, pure: true })
export class StatusVariantPipe implements PipeTransform {
  transform(status: CourseResponse['status']): BadgeVariant {
    const mapping: Record<(typeof CourseStatus)[keyof typeof CourseStatus], BadgeVariant> = {
      DRAFT: 'secondary',
      PUBLISHED: 'success',
      ARCHIVED: 'secondary',
    };
    return mapping[status] ?? 'secondary';
  }
}
