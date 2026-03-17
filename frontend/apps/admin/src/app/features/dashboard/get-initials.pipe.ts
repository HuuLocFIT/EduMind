import { Pipe, PipeTransform } from '@angular/core';
import { getInitials } from '../../core/utils';

@Pipe({ name: 'getInitials', standalone: true, pure: true })
export class GetInitialsPipe implements PipeTransform {
  transform(name: string): string {
    return getInitials(name);
  }
}
