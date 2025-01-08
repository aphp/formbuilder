import {Component, Input} from '@angular/core';
import {FHIRServer, FhirService} from '../../../services/fhir.service';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BehaviorSubject} from 'rxjs';
import {Util} from '../../util';

// Search related inputs on the page.
interface State {
  fhirServer: FHIRServer;
}

@Component({
  selector: 'lfb-fhir-export-dlg',
  templateUrl: './fhir-export-dlg.component.html',
  styleUrls: ['./fhir-export-dlg.component.css']
})
export class FhirExportDlgComponent {

  private _loading$ = new BehaviorSubject<boolean>(false);
  notChanged = false;
  serverResponse: any;
  type: string;
  error: any;
  @Input()
  questionnaire: any;

  // State of the component.
  private _state: State = {
    fhirServer: this.fhirService.getFhirServer()
  };

  constructor(public fhirService: FhirService, private activeModal: NgbActiveModal) {
  }

  // Getters and setters
  get loading$() {
    return this._loading$.asObservable();
  }

  get selectedFHIRServer() {
    return this._state.fhirServer;
  }

  set selectedFHIRServer(fhirServer: FHIRServer) {
    this.fhirService.setFhirServer(fhirServer);
    this._set({fhirServer});
  }

  /**
   * Set partial properties of search state.
   * @param patch - Partial state fields.
   * @private
   */
  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
  }

  /**
   * Handle dialog close
   * @param value
   */
  close(value: any): void {
    this.activeModal.close(value);
  }

  /**
   * Get FHIR server list.
   */
  getServerList(): FHIRServer [] {
    return this.fhirService.fhirServerList;
  }

  getValue(value: string) {
    return value ? value : '';
  }

  joinProfiles(profiles: []): string {
    if (!profiles || !Util.isIterable(profiles)) {
      return '';
    }
    return profiles.join(', ');
  }
}
