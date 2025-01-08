import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'orderByCode'})
export class ValueSetByCodePipe implements PipeTransform {
  transform(options: any[]): any[] {
    return options?.sort((a, b) => {
      return ('' + a.code).localeCompare(b.code);
    });
  }
}
