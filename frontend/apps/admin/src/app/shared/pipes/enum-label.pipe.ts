import { Pipe, PipeTransform } from '@angular/core';
import { formatEnumLabel } from '../../core/utils';

@Pipe({ name: 'enumLabel', standalone: true })
export class EnumLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? formatEnumLabel(value) : '';
  }
}
