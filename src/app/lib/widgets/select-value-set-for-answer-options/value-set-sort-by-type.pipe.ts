import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'sortedByType'})
export class SortedByTypePipe implements PipeTransform {
  transform(options: any[]): any[] {
    options = options?.sort((a, b) => {
      return ('' + a.code).localeCompare(b.code);
    });
    const priorityList = ['Encounter', 'Location', 'Patient', 'Practitioner', 'PractitionerRole', 'RelatedPerson', 'ResearchStudy'];
    const filtredOptions = options?.filter(r => !priorityList.includes(r.code));
    const priorityOptions = options?.filter(r => priorityList.includes(r.code));
    filtredOptions?.unshift(...priorityOptions);
    return filtredOptions;
  }
}
