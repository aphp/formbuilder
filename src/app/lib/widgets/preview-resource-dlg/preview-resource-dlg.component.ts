import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import fhir from 'fhir/r4';

/**
 * Define data structure for dialog
 */
export interface PreviewData {
  resource: fhir.Resource;
}

@Component({
  selector: 'lfb-resource-preview-dlg',
  templateUrl: './preview-resource-dlg.component.html',
  styleUrls: ['./preview-resource-dlg.component.css']
})
export class PreviewResourceDlgComponent {


  constructor(
    public dialogRef: MatDialogRef<PreviewResourceDlgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PreviewData,
  ) {

  }

  close() {
    this.dialogRef.close();
  }

}
