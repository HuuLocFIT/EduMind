import { Pipe, PipeTransform } from '@angular/core';
import { formatRoleLabel } from '../../core/utils';

@Pipe({ name: 'roleLabel', standalone: true })
export class RoleLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? formatRoleLabel(value) : '';
  }
}
