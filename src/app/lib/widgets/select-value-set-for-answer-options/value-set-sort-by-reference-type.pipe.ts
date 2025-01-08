import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'sortedByReferenceType'})
export class SortedByReferenceTypePipe implements PipeTransform {
  transform(options: any[]): any[] {
    options = options?.sort((a, b) => {
      return ('' + a.code).localeCompare(b.code);
    });
    const priorityReferences = ['Practitioner', 'Encounter', 'Patient', 'Organization', 'EpisodeOfCare', 'QuestionnaireResponse', 'DocumentReference', 'ResearchStudy'];
    const filtredOptions = options.filter(r => !priorityReferences.includes(r.code));
    const priorityOptions = options.filter(r => priorityReferences.includes(r.code));
    filtredOptions.unshift(...priorityOptions);
    return filtredOptions;
  }
}
