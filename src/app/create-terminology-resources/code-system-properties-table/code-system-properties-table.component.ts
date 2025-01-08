import {Component, EventEmitter, inject, Input, OnInit, Output, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatCardModule} from "@angular/material/card";
import {MatSelectModule} from "@angular/material/select";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {CodeSystemProperty} from "fhir/r4";
import {MatTable} from "@angular/material/table";
import {NgForOf} from "@angular/common";

@Component({
  selector: 'code-system-properties-table',
  templateUrl: './code-system-properties-table.component.html',
  styleUrls: ['./code-system-properties-table.component.scss']
})
export class CodeSystemPropertiesTableComponent {

  constructor(private dialog: MatDialog) {
  }

  @Input()
  conceptCodes;
  properties = [];
  displayedColumns: string[] = ['code', 'key', 'type', 'value'];
  @Output()
  importPropertiesEvent = new EventEmitter<CodeSystemProperty[]>();

  @ViewChild('table', {static: true, read: MatTable}) table;

  clearProperties() {
    this.properties = [];
  }

  addProperty() {
    const dialogRef = this.dialog.open(AddCodeSystemPropertyDialog, {
      data: {conceptCodes: this.conceptCodes},
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        if (this.properties && this.properties.length > 0) {
          this.properties.push(result);
        } else {
          this.properties = [result];
        }
        this.table.renderRows();
        this.importPropertiesEvent.emit(this.properties);
      }
    });
  }


  onDownloadFile($event) {
    this.properties = $event;
    this.importPropertiesEvent.emit(this.properties);
  }

}

@Component({
  selector: 'add-code-system-property-dialog',
  templateUrl: 'add-code-system-property-dialog.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, ReactiveFormsModule, NgForOf],
})
export class AddCodeSystemPropertyDialog implements OnInit {
  constructor(private formBuilder: FormBuilder) {
  }

  readonly dialogRef = inject(MatDialogRef<AddCodeSystemPropertyDialog>);
  readonly data = inject<any>(MAT_DIALOG_DATA);

  ngOnInit(): void {
    this.addForm = this.formBuilder.group({
      code: ['', Validators.required],
      key: ['', Validators.required],
      type: ['', Validators.required],
      value: ['', Validators.required]
    });
    this.conceptCodes = this.data?.conceptCodes;
  }

  conceptCodes: string [];

  addForm: FormGroup;

  submitForm() {
    this.dialogRef.close(this.addForm.value);
  }
}
