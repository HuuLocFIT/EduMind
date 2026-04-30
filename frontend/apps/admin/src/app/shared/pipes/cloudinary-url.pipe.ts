import { Pipe, PipeTransform } from '@angular/core';
import { cldUrl } from '@edumind/shared-utils';

@Pipe({ name: 'cldUrl', standalone: true })
export class CloudinaryUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, width: number): string {
    return cldUrl(url, `f_auto,q_auto,c_limit,w_${width}`);
  }
}
