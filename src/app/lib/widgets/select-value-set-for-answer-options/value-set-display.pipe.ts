import { Pipe, PipeTransform } from '@angular/core';
@Pipe({name: 'orderByDisplay'})
export class ValueSetByDisplayPipe implements PipeTransform {
  transform(options: any[]): any[] {
    return options?.sort((a, b) => {
      return ('' + a.display).localeCompare(b.display);
    });
  }
}
