import {Component, Inject} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';
import {ValidationContentComponent} from "./validation-content/validation-content.component";

@Component({
  selector: 'lfb-validate-dlg',
  templateUrl: './validate-dlg.component.html',
  styleUrls: ['./validate-dlg.component.scss'],
  imports: [
    MatDialogContent,
    MatIcon,
    ValidationContentComponent,
    MatDialogClose,
    MatDialogTitle,
    MatIconButton
  ],
  standalone: true
})
export class ValidateDlgComponent {

  constructor(
    public dialogRef: MatDialogRef<ValidateDlgComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
  }


  close() {
    this.dialogRef.close();
  }

}
