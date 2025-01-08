import {Component, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {FhirService} from '../services/fhir.service';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators} from "@angular/forms";
import {Util} from "../lib/util";
import {SharedObjectService} from "../services/shared-object.service";
import {TerminologyResourcesService} from "../services/terminology-resources.service";
import fhir, {CodeSystem, CodeSystemConcept, Resource, UsageContext, ValueSet} from "fhir/r4";
import {catchError, finalize} from "rxjs/operators";
import {v4 as uuidv4} from 'uuid';
import {AlertService} from "../services/alert.service";

@Component({
  selector: 'lfb-value-set-create-dlg',
  styleUrls: ['./value-set-create-dlgt.component.scss'],
  templateUrl: 'value-set-create-dlg.component.html'
})
export class ValueSetCreateDlgComponent implements OnInit {


  private _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _edsUrl = 'https://aphp.fr/ig/fhir/eds';
  private codeSystemConcepts: any [];
  private useContext: UsageContext[];
  private codeSystem: CodeSystem | any;
  private valueSetUrl: string;
  private initialCodingValue: CodeSystemConcept;

  private childCodeSystemConcepts: CodeSystemConcept [];
  private newConcept: CodeSystemConcept;

  errorMessages: string [];
  formGroup: FormGroup;
  updateFormGroup: FormGroup;


  constructor(private formBuilder: FormBuilder,
              private fhirService: FhirService,
              private sharedObjectService: SharedObjectService,
              private terminologyResourcesService: TerminologyResourcesService,
              private alertService: AlertService,
              private activeModal: NgbActiveModal) {
  }


  ngOnInit(): void {
    this.errorMessages = [];
    this.formGroup = this.formBuilder.group({
      title: ['', [Validators.required, containsLetterValidator]]
    });
    this.updateFormGroup = this.formBuilder.group({
      codeSystemServerResponse: [''],
      codeSystem: [''],
      valueSetServerResponse: [''],
      nbCodeSystemConcepts: [''],
      errorCodeSystem: [''],
      errorValueSet: ['']
    });
    this.setNewAndChildCodeConcepts();
    this.setCodeSystem();
  }
  get title() {
    return this.formGroup.get('title');
  }
  private setCodeSystem() {
    const nbConceptHavingScore = this.codeSystemConcepts.filter(csc => csc.score).length;
    if (nbConceptHavingScore > 0) {
      this.errorMessages.push(
        `${nbConceptHavingScore} Answer Option${nbConceptHavingScore > 1 ? 's have' : ' has'} score. This use case is not covered yet by the formBuilder`
      );
    }

    this.sharedObjectService?.questionnaire$?.subscribe({
      next: (questionnaire) => {
        this.useContext = questionnaire.useContext;
        if (!(this.useContext?.length > 0)) {
          this.errorMessages.push('The Questionnaire SHALL have a usecontext');
          return;
        }

        const searchStr = this.useContext[0]?.valueCodeableConcept?.coding[0]?.code;
        const useContextDisplay = this.useContext[0]?.valueCodeableConcept?.coding[0]?.display;

        if (!searchStr) {
          this.errorMessages.push(`No valid search string found in use context`);
          return;
        }

        this.fhirService.search('CodeSystem', searchStr, 'context', null).subscribe({
          next: (bundle) => {
            const entryCount = bundle.entry?.length || 0;

            if (entryCount === 0) {
              this.errorMessages.push(`No code system found for this use context: ${useContextDisplay}, you SHALL create it using the terminological resources function`);
            } else {

              if (entryCount > 1) {
                this.errorMessages.push(`Multiple code systems found for this use context: ${useContextDisplay}, please send a message to the support team!`);
                return;
              }
              this.codeSystem = bundle.entry[0].resource;
              const url = this.codeSystem?.url;

              if (url) {
                const badSystems = this.codeSystemConcepts
                  .filter(concept => concept?.system && concept?.system !== url)
                  .map(concept => concept?.system);

                if (badSystems.length > 0) {
                  this.errorMessages.push(`${badSystems.length} Answer Option belong to a codesystem which is not the domain codesystem. This use case is not covered yet by the formBuilder`);
                }
                this.setConceptCodeSystemItemsAndCheckDuplicated();
              } else {
                this.errorMessages.push("Code system URL is missing or invalid.");
              }
            }
          },
          error: (searchError) => {
            this.errorMessages.push(`Error searching for code system with use context ${searchStr}: ${searchError.message || searchError}`);
          }
        });
      },
      error: (subscriptionError) => {
        this.errorMessages.push(`Failed to retrieve questionnaire data: ${subscriptionError.message || subscriptionError}`);
      }
    });
  }

  onTitleInput() {
    if(this.errorMessages.length > 0){
      return;
    }
    this.errorMessages = [];
    this.setConceptCodeSystemItemsAndCheckDuplicated();
    this.title.markAsTouched();
  }

  getConceptId(): string {
    const title = this.formGroup.value.title;
    return Util.capitalizeFirstLetter(Util.sanitizeString(title ? title : ''));
  }

  private setNewAndChildCodeConcepts() {

    this.childCodeSystemConcepts = this.codeSystemConcepts.map(concept => ({
      code: concept.code ? concept.code : uuidv4(),
      display: concept.display
    }));
    this.newConcept = {
      code: this.getConceptId(),
      display: this.formGroup.value.title,
      concept: this.childCodeSystemConcepts
    };
  }

  private setConceptCodeSystemItemsAndCheckDuplicated() {

    this.setNewAndChildCodeConcepts();

    if (!this.codeSystem) {
      this.errorMessages.push(`The CodeSystem is undefined!`);
      return;
    }
    const duplicateCodeInNewConcepts: CodeSystemConcept [] = this.codeSystem.concept?.map(c => c.code)?.filter(c => c === this.newConcept?.code);
    if (duplicateCodeInNewConcepts?.length > 0) {
      const uniqueArray = duplicateCodeInNewConcepts.filter((item, index) => {
        return duplicateCodeInNewConcepts.indexOf(item) === index;
      });
      uniqueArray.forEach(conceptCode => this.errorMessages.push(`a concept with code ${conceptCode} already exists in the domain codeSystem. This use case is not covered yet by the formBuilder.`))
    }

    const allExistingConcepts = getAllConcepts(this.codeSystem)

    const childConceptCodes = this.childCodeSystemConcepts?.map(value => value.code)?.filter(Boolean)
    const childConceptCodesSet = new Set(childConceptCodes);
    if (childConceptCodesSet.size !== this.childCodeSystemConcepts?.length) {
      this.errorMessages.push(`The same code is used by multiple Answer Option`)
    }
    const duplicateCodesInChildConcepts: string [] = allExistingConcepts?.map(value => value.code)?.filter(code => childConceptCodesSet.has(code));
    if (duplicateCodesInChildConcepts?.length > 0) {
      const uniqueArray = duplicateCodesInChildConcepts.filter((item, index) => {
        return duplicateCodesInChildConcepts.indexOf(item) === index;
      });
      uniqueArray.forEach(conceptCode => this.errorMessages.push(`a concept with code ${conceptCode} already exists in the domain codeSystem. This use case is not covered yet by the formBuilder.`));
    }

    const nbConceptWithoutDisplay = this.childCodeSystemConcepts?.filter(value => !value.display).length;
    if (nbConceptWithoutDisplay > 0) {
      this.errorMessages.push(`${nbConceptWithoutDisplay} Answer Option${nbConceptWithoutDisplay > 1 ? 's do' : ' does'} not have Display.`)
    }
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

  applyValueSet(): void {
    const response = {
      valueSetUrl: this.valueSetUrl,
      initialCodingValue: this.initialCodingValue
    };
    this.activeModal.close(response);
    this.alertService.showAlert({
      type: 'primary',
      timeout: 10000,
      message: `The answerOption was successfully changed by the created valueset: ${this.valueSetUrl}`
    });
  }


  create() {

    this.setConceptCodeSystemItemsAndCheckDuplicated();

    if (this.errorMessages?.length > 0) {
      return;
    }
    //create codeSystem
    this.codeSystem.concept?.push(this.newConcept);
    const observerCodeSystem: Observable<fhir.Resource> = this.fhirService.postWithBundle([this.codeSystem]);
    this.createValueSetAndHandleCodeSystemServerResponse(observerCodeSystem);

  }


  private createValueSet() {
    const codeSystemUrl = this.codeSystem?.url;
    const useContext = this.useContext;
    const experimental = false;
    const date = new Date().toISOString();
    const fhirIg = this._edsUrl;
    const status = 'draft';
    const concepts = this.getConcepts();
    const hierarchy = this.getHierarchy();
    const valueSets = this.terminologyResourcesService.createValueSets(concepts, hierarchy, codeSystemUrl, useContext, experimental, date, fhirIg, status);

    const observerValueSet = this.fhirService.postValueSets(valueSets, []);
    const nbCodeSystemConcepts = this.codeSystem?.concept?.length || 0;
    this.handleValueSetServerResponse(observerValueSet, nbCodeSystemConcepts, valueSets[0]);
  }

  private handleValueSetServerResponse(bundleResponse: Observable<Resource>,
                                       nbCodeSystemConcepts: number, valueSet: ValueSet) {
    this.valueSetUrl = valueSet?.url;
    this.initialCodingValue = this.getInitialCodingValue();
    this._loading$.next(true)
    bundleResponse.pipe(
      catchError((errorValueSet) => {
        console.error(errorValueSet);
        this.updateFormGroup.patchValue({errorValueSet});
        this._loading$.next(false);
        return of(errorValueSet);
      })
    )
    bundleResponse.subscribe(valueSetServerResponse => {
      this._loading$.next(true)
      setTimeout(() => {
        this.updateFormGroup.patchValue({valueSetServerResponse, nbCodeSystemConcepts});
        this._loading$.next(false);
      }, 2000);
    })
  }

  private createValueSetAndHandleCodeSystemServerResponse(observer: Observable<any>) {
    this._loading$.next(true);
    observer.pipe(
      catchError((errorCodeSystem) => {
        console.error(errorCodeSystem);
        this.updateFormGroup.patchValue({errorCodeSystem});
        return of(errorCodeSystem);
      }),
      finalize(() => {
        this._loading$.next(false);
      })
    )
      .subscribe(codeSystemServerResponse => {
        this.updateFormGroup.patchValue({
          codeSystemServerResponse,
          codeSystem: this.codeSystem
        });
        //create valueSet
        this.createValueSet();
      })
  }

  private getHierarchy(): any[] {
    const result = [];
    for (const concept of this.childCodeSystemConcepts) {
      result.push({parent: this.getConceptId(), child: concept.code});
    }
    return result;
  }

  private getConcepts(): CodeSystemConcept[] {
    const result: CodeSystemConcept[] = [];
    result.push(...this.childCodeSystemConcepts);
    result.push({code: this.getConceptId(), display: this.formGroup.value.title});
    return result;
  }

  private getInitialCodingValue(): any {

    const selectedConcept = this.codeSystemConcepts.find(codeSystemConcept => codeSystemConcept.initialSelected);

    if (selectedConcept) {
      let matchingChildConcept = this.childCodeSystemConcepts.find(childConcept =>
        childConcept.code === selectedConcept.code
      );
      if (!matchingChildConcept) {
        matchingChildConcept = this.childCodeSystemConcepts.find(childConcept =>
          childConcept.display === selectedConcept.display
        );
      }

      return {
        code: matchingChildConcept?.code,
        display: selectedConcept.display,
        system: this.codeSystem?.url
      };
    }

    return null;
  }


  protected readonly close = close;

  onSubmit() {

  }

  closeDialog() {
    if (this.updateFormGroup.value?.codeSystemServerResponse && this.updateFormGroup.value?.valueSetServerResponse) {
      this.applyValueSet();
    } else {
      this.dismiss('close');
    }
  }
}

function getAllConcepts(codeSystem: CodeSystem): CodeSystemConcept [] {
  const conceptsList: CodeSystemConcept [] = [];

  // Recursive function to process each concept and its nested child concepts
  function processConcept(concept) {
    conceptsList.push({
      code: concept.code,
      display: concept.display
    });
    // If the current concept has child concepts, recursively process each one
    if (concept.concept && concept.concept.length > 0) {
      concept.concept.forEach(childConcept => processConcept(childConcept));
    }
  }

  // Start with the root concepts in the CodeSystem
  if (codeSystem.concept && codeSystem.concept.length > 0) {
    codeSystem.concept.forEach(rootConcept => processConcept(rootConcept));
  }

  return conceptsList;
}
function containsLetterValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  // Check if the string contains at least one letter
  const hasLetter = /[a-zA-Z]/.test(value);

  return hasLetter ? null : { noLetter: true };
}
