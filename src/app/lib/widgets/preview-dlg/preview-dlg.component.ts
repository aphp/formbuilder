import {Component, ElementRef, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import fhir from 'fhir/r4';
import {FhirService} from '../../../services/fhir.service';
import {FormService} from '../../../services/form.service';
import version from "../../../../assets/version.json";

declare var LForms: any;

/**
 * Define data structure for dialog
 */
export interface PreviewData {
  questionnaire: fhir.Questionnaire;
  lfData?: any;
}

@Component({
  selector: 'lfb-preview-dlg',
  templateUrl: './preview-dlg.component.html',
  styleUrls: ['./preview-dlg.component.css']
})
export class PreviewDlgComponent {

  @ViewChild('lhcForm', {read: ElementRef}) wcForm: ElementRef;
  lformsErrors: string;

  public readonly lformsVersion: string;

  constructor(
    private fhirService: FhirService,
    public formService: FormService,
    public dialogRef: MatDialogRef<PreviewDlgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PreviewData,
  ) {
    LForms.Util.setFHIRContext(this.fhirService.getSmartClient());
    this.lformsVersion = version.lformsVersion;
  }

  /**
   * Handle errors from <wc-lhc-form>
   * @param event - event object emitted by wc-lhc-form.
   */
  handleLFormsError(event) {
    this.lformsErrors = event.detail;
  }

  close() {
    this.dialogRef.close();
  }

}
