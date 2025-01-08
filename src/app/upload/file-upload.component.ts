import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import * as Papa from 'papaparse';


@Component({
  selector: 'file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  @ViewChild('fileInput') fileInput: ElementRef;

  @Input()
  fileName: string;

  @Input()
  isRequired: boolean = true;

  @Output() downloadEvent = new EventEmitter<string>();
  data: any;
  uploadForm: FormGroup;

  ngOnInit(): void {
    const validators = this.isRequired ? [Validators.required] : [];
    this.uploadForm = new FormGroup({display: new FormControl("", validators)});
  }

  handleFileInputChange(l: FileList): void {
    if (l.length) {
      const f = l[0];
      this.uploadForm.patchValue({display: f.name});
      this.parseFile(f);
    } else {
      this.uploadForm.patchValue({display: ''});
    }
  }

  parseFile(inputFile) {
    Papa.parse(inputFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader:function(h) {
        return h.trim().toLowerCase();
      },
      complete: (result) => {
        this.data = result.data;
        this.downloadEvent.emit(this.data ? this.data : []);
      }
    });
  }

  reset() {
    this.fileInput.nativeElement.value = null;
    const validators = this.isRequired ? [Validators.required] : [];
    this.uploadForm = new FormGroup({display: new FormControl("", validators)});
    this.data = [];
    this.downloadEvent.emit(this.data);
  }

  chooseFile(fileInput: HTMLInputElement) {
    this.reset();
    fileInput.click();
  }
}
