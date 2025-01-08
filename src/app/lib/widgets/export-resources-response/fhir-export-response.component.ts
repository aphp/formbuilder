import {AfterViewInit, Component, Input, SimpleChanges} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {CodeSystem} from "fhir/r4";

@Component({
  selector: 'fhir-export-response',
  templateUrl: './fhir-export-response.component.html',
  styleUrls: ['./fhir-export-response.component.scss']
})
export class FhirExportResponseComponent {

  private _loading$ = new BehaviorSubject<boolean>(false);
  @Input()
  serverResponseCodeSystem: any;
  @Input()
  codeSystem: CodeSystem;
  @Input()
  serverResponseValueSet: any;
  @Input()
  errorCodeSystem: any;
  @Input()
  errorValueSet: any;
  @Input()
  exportType: 'UPDATE' | 'CREATE';
  @Input()
  nbCodeSystemConcepts = 0;


  countSuccessfulValueSetUpdate: number;
  countSuccessfulValueSetCreate: number;
  countSuccessfulValueSetPatch: number;
  countSuccessfulNoChangeValueSetUpdate: number;
  hasNoChangeDetectedValueSet = false;

  isSuccessfulCreateCodeSystem = false;
  isSuccessfulUpdateCodeSystem = false;
  hasNoChangeCodeSystem = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverResponseCodeSystem']?.currentValue) {
      this.isSuccessfulCreateCodeSystem = this.countMessage(['SUCCESSFUL_UPDATE_AS_CREATE'], this.serverResponseCodeSystem, this.errorCodeSystem);
      this.isSuccessfulUpdateCodeSystem = this.countMessage(['SUCCESSFUL_UPDATE'], this.serverResponseCodeSystem, this.errorCodeSystem);
      this.hasNoChangeCodeSystem = this.countMessage(['SUCCESSFUL_UPDATE_NO_CHANGE'], this.serverResponseCodeSystem, this.errorCodeSystem);
    }
    if (changes['serverResponseValueSet']?.currentValue) {
      this.countSuccessfulValueSetUpdate = this.countMessage(['SUCCESSFUL_UPDATE'], this.serverResponseValueSet, this.errorValueSet);
      this.countSuccessfulValueSetCreate = this.countMessage(['SUCCESSFUL_UPDATE_AS_CREATE'], this.serverResponseValueSet, this.errorValueSet);
      this.countSuccessfulValueSetPatch = this.countMessage(['SUCCESSFUL_PATCH'], this.serverResponseValueSet, this.errorValueSet);
      this.countSuccessfulNoChangeValueSetUpdate = this.countMessage(['SUCCESSFUL_UPDATE_NO_CHANGE', 'SUCCESSFUL_PATCH_NO_CHANGE'], this.serverResponseValueSet, this.errorValueSet);
      this.hasNoChangeDetectedValueSet = !this.countSuccessfulValueSetCreate && !this.countSuccessfulValueSetUpdate && !this.countSuccessfulValueSetPatch && !this.countSuccessfulNoChangeValueSetUpdate;
    }
  }

  get loading$() {
    return this._loading$.asObservable();
  }


  countMessage(messages: string [], data: any, error: any) {
    if (!data || error) {
      return null;
    }

    return data?.entry?.flatMap(entry => entry?.response?.outcome?.issue || [])
      .flatMap(issue => issue.details?.coding || [])
      .filter(coding => messages.includes(coding.code))
      .length;
  }

  getValue(value: string) {
    return value ? value : '';
  }

}
