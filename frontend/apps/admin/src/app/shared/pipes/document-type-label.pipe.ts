import { Pipe, PipeTransform } from '@angular/core';
import { formatDocumentTypeLabel } from '../../core/utils';

@Pipe({ name: 'documentTypeLabel', standalone: true })
export class DocumentTypeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? formatDocumentTypeLabel(value) : '';
  }
}
