import {Component, Input, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BehaviorSubject, of} from 'rxjs';
import {FhirService} from '../services/fhir.service';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {Util} from "../lib/util";
import {catchError, finalize, map, tap} from "rxjs/operators";
import {Questionnaire} from "fhir/r4";

@Component({
  selector: 'lfb-questionnaire-create-dlg',
  styleUrls: ['./questionnaire-create-dlg.component.scss'],
  templateUrl: 'questionnaire-create-dlg.component.html'
})
export class QuestionnaireCreateDlgComponent implements OnInit {

  private _loading$ = new BehaviorSubject<boolean>(false);


  @Input()
  questionnaire: Questionnaire;

  errorMessages: string [];
  infoMessages: string [];
  formGroup: FormGroup;


  constructor(private formBuilder: FormBuilder,
              private fhirService: FhirService,
              private activeModal: NgbActiveModal) {
  }


  ngOnInit(): void {
    this.errorMessages = [];
    this.formGroup = this.formBuilder.group({
      title: ['', [Validators.required, containsLetterValidator]],
      id: ['', [Validators.required, idValidator()]]
    });


  }

  get title() {
    return this.formGroup.get('title');
  }


  onTitleInput() {
    const id = Util.capitalizeFirstLetter(Util.sanitizeString(this.title?.value ? this.title.value : ''));
    this.id.setValue(id);
    this.title.markAsTouched();
    this.id.markAsTouched();
    this.checkQuestionnaireId();
  }

  checkQuestionnaireId() {
    const id = this.id.value;
    this._loading$.next(true);
    this.fhirService.search('Questionnaire', id, '_id', null).pipe(
      map(bundle => !!bundle.entry?.length),
      tap(hasResults => {
        this.errorMessages = [];
        this.infoMessages = [];
        if (hasResults) {
          this.errorMessages.push(`id is not available.`);
        } else {
          this.infoMessages.push(`id is available.`);
        }
      }),
      catchError(error => {
        this.errorMessages = [];
        const errorMessage = error?.message || String(error);
        this.errorMessages.push(
          `Error searching for Questionnaire with ID '${id}': ${errorMessage}`
        );
        return of(null);
      }),
      finalize(() => {
        this._loading$.next(false);
      })
    ).subscribe();

  }

  get loading$() {
    return this._loading$.asObservable();
  }

  get id() {
    return this.formGroup.get('id');
  }

  dismiss(reason: any): void {
    this.activeModal.dismiss(reason);
  }

  create(): void {
    this._loading$.next(true);

    const idValue = this.id?.value;
    const titleValue = this.title?.value;

    this.questionnaire.id = idValue;
    this.questionnaire.name = idValue;
    this.questionnaire.title = titleValue;

    this.fhirService.create(this.questionnaire, null).pipe(
      tap(questionnaire => {
        if (questionnaire) {
          this.activeModal.close(questionnaire);
        }
      }),
      catchError(error => {
        const errorMessage = 'Error creating questionnaire';
        this.errorMessages.push(errorMessage)
        console.error(errorMessage, error);
        return of(null);
      }),
      finalize(() => {
        this._loading$.next(false);
      })
    ).subscribe();
  }
}

function containsLetterValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  // Check if the string contains at least one letter
  const hasLetter = /[a-zA-Z]/.test(value);

  return hasLetter ? null : {noLetter: true};
}

export function idValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return {required: true};

    const startsWithUppercase = /^[A-Z]/.test(value);
    const validChars = /^[A-Za-z0-9]+$/.test(value);
    const maxLength = value.length <= 64;

    const errors: ValidationErrors = {};

    if (!startsWithUppercase) {
      errors.noUppercaseStart = true;
    }

    if (!validChars) {
      errors.invalidCharacters = true;
    }

    if (!maxLength) {
      errors.tooLong = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}
