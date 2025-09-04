import {Component, ViewChild} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, Validators} from '@angular/forms';
import fhir, {CodeSystem, CodeSystemProperty, Resource, UsageContext, ValueSet} from "fhir/r4";
import {Util} from "../lib/util";
import {TerminologyResourcesService} from "../services/terminology-resources.service";
import {FhirService} from "../services/fhir.service";
import {FetchService} from "../services/fetch.service";
import {BehaviorSubject, mergeAll, Observable, of} from "rxjs";
import {catchError, filter, finalize, map} from "rxjs/operators";
import {FormService} from "../services/form.service";
import {StepperSelectionEvent} from "@angular/cdk/stepper";
import {MatStepper} from "@angular/material/stepper";
import {FileUploadComponent} from "../upload/file-upload.component";
import moment from "moment";

type Validation = { message: string, data: any };

@Component({
  selector: 'create-terminology-resources',
  templateUrl: './create-terminology-resources.component.html',
  styleUrls: ['./create-terminology-resources.component.scss']
})
export class CreateTerminologyResourcesComponent {


  constructor(private formBuilder: FormBuilder,
              private terminologyResourcesService: TerminologyResourcesService,
              private formService: FormService,
              private fhirService: FhirService,
              private fetchService: FetchService
  ) {

  }

  hierarchy = [];
  concepts = [];
  properties: any[] = [];
  conceptCodes: any []


  codeSystem: CodeSystem;

  private valueSetsOfSelectedCodeSystem: ValueSet[];


  firstFormGroup: FormGroup;
  resourceFormGroup: FormGroup;
  updateFormGroup: FormGroup;
  selectCodeSystemFormGroup: FormGroup;
  validationFormGroup: FormGroup;

  validation$ = new BehaviorSubject<Validation>({data: null, message: ''});
  $allowedUseContextOptions: Observable<any>;
  createUpdateButtonName: string;
  errorMessages: string [];
  infoMessages: string[]

  @ViewChild('stepper') private stepper: MatStepper;

  @ViewChild('conceptsUploadComponent') private conceptsUploadComponent!: FileUploadComponent;
  @ViewChild('hierarchyUploadComponent') private hierarchyUploadComponent!: FileUploadComponent;
  @ViewChild('propertiesUploadComponent') private propertiesUploadComponent!: FileUploadComponent;

  protected readonly _edsUrl = 'https://aphp.fr/ig/fhir/eds';
  protected readonly _baseUrls = [this._edsUrl, 'https://aphp.fr/ig/fhir/core'];
  private readonly _dateFormat = 'YYYY-MM-DD';
  private _loading$ = new BehaviorSubject<boolean>(false);

  ngOnInit(): void {
    this.reset();
    this.$allowedUseContextOptions = this.fetchService.getValueSetByUrl(Util.buildUrl(this._edsUrl, 'ValueSet', 'aphp-eds-domain-usage-context-vs'));
  }

  get id() {
    return this.resourceFormGroup.get('id');
  }

  get loading$() {
    return this._loading$.asObservable();
  }

  public reset() {
    this.infoMessages = [];
    this.errorMessages = [];
    this.resourceFormGroup = this.formBuilder.group({
      title: ['', Validators.required],
      id: ['', [Validators.required]],
      url: [this._edsUrl + '/CodeSystem'],
      description: ['', Validators.required],
      fhirIg: [this._edsUrl, Validators.required],
      status: ['draft', Validators.required],
      date: new FormControl(new Date(), [
        Validators.required
      ]),
      experimental: ['true', Validators.required],
      useContextValue: [''],
      hierarchyMeaning: [''],
      caseSensitive: ['true', Validators.required],
      concepts: ['', Validators.required]
    });

    this.firstFormGroup = this.formBuilder.group({
      onlyCodeSystem: ['true', Validators.required],
      exportType: ['CREATE', Validators.required]
    });
    this.selectCodeSystemFormGroup = this.formBuilder.group({
      selectedCodeSystem: [null, Validators.required]
    });
    this.validationFormGroup = this.formBuilder.group({
      isValid: ['', Validators.required]
    });
    this.updateFormGroup = this.formBuilder.group({
      codeSystemServerResponse: [''],
      codeSystem: [''],
      valueSetServerResponse: [''],
      nbCodeSystemConcepts: [''],
      errorCodeSystem: [''],
      errorValueSet: ['']
    });
    this.conceptsUploadComponent?.reset();
    this.propertiesUploadComponent?.reset();
    this.hierarchyUploadComponent?.reset();
  }


  async selectionChange($event: StepperSelectionEvent) {
    const toCreateResource: boolean = this.firstFormGroup.value.exportType === 'CREATE';
    const isUpdateFormStep = $event.selectedIndex == 2 && !toCreateResource;
    const isValidationStep = ($event.selectedIndex === 2 && toCreateResource) || ($event.selectedIndex == 3 && !toCreateResource);
    const serverResponseStep = ($event.selectedIndex === 3 && toCreateResource) || ($event.selectedIndex == 4 && !toCreateResource)

    this.updateFormGroup.reset();
    this.validationFormGroup.reset();
    this.infoMessages = [];

    if (!serverResponseStep) {
      this.errorMessages = [];
    }

    if (isUpdateFormStep) {
      this.setValidatorsForIdControl();
      this.valueSetsOfSelectedCodeSystem = await this.findValueSetsByCodeSystem(this.selectCodeSystemFormGroup.value?.selectedCodeSystem?.url);
      const valueSetIds = this.valueSetsOfSelectedCodeSystem.map(vs => vs.id);
      if (valueSetIds?.length > 0) {
        this.infoMessages.push(`${valueSetIds.length} existing ValueSet${valueSetIds.length > 0 ? 's' : ''} depend${valueSetIds.length > 0 ? 's' : ''} from the selected CodeSystem, ids: ${valueSetIds.join(', ')}`)
      }
    }

    if (isValidationStep) {
      this._loading$.next(true);
      this.createUpdateButtonName = this.getCreateUpdateButtonName();
      await this.validate();
      this._loading$.next(false);
    }
  }

  getCreateUpdateButtonName() {
    const btnName: string = `${this.isUpdateExportType() ? 'Update' : 'Create'}`
    if (this.firstFormGroup.value?.onlyCodeSystem === 'true') {
      btnName.concat(' CodeSystem');
    } else {
      btnName.concat(' CodeSystem et ValueSet(s)')
    }
    return btnName
  }

  onChangeFhirIg(value: string) {
    const url = Util.buildUrl(value, 'CodeSystem', this.resourceFormGroup.value.id);
    this.resourceFormGroup.patchValue({url});
  }

  onUseContextSelectionChanged(options: any): void {
    const searchStr = this.resourceFormGroup.value.useContextValue;

    if (!searchStr) {
      return;
    }
    this.verifyFormat();

    this.fhirService.search('CodeSystem', searchStr, 'context', null).subscribe({
      next: (bundle) => {
        const entryCount = bundle.entry?.length || 0;
        if (entryCount > 0) {
          const isUpdateTypeAndContextMismatch = !this.isUpdateExportType() ||
            this.getUseContextValue(this.selectCodeSystemFormGroup?.value?.selectedCodeSystem) !== searchStr;
          if (isUpdateTypeAndContextMismatch) {
            const display = this.getDisplayFromUseContextValue(searchStr, options);
            const useContext = display || searchStr;
            this.errorMessages.push(`A CodeSystem for the ${useContext} already exists.`);
          }
        }
      },
      error: (error) => {
        const errorMessage = error?.message || error;
        this.errorMessages.push(
          `Error searching for CodeSystem with use context '${searchStr}': ${errorMessage}`
        );
      }
    });
  }

  private getDisplayFromUseContextValue(value: string, options: any[]): string | null {
    if (!options) return null;

    const result = options.find(option => option.code === value);
    return result?.display || null;
  }

  onCodeSystemSelected(selectedCodeSystem: CodeSystem): void {

    this.selectCodeSystemFormGroup.patchValue({selectedCodeSystem});
    this.resourceFormGroup.patchValue({
      title: selectedCodeSystem?.title,
      id: selectedCodeSystem?.id,
      url: selectedCodeSystem?.url,
      description: selectedCodeSystem?.description,
      fhirIg: selectedCodeSystem?.url?.startsWith(this._edsUrl) ? this._edsUrl : this._baseUrls[1],
      status: selectedCodeSystem?.status,
      date: selectedCodeSystem?.date,
      experimental: selectedCodeSystem?.experimental?.toString(),
      caseSensitive: selectedCodeSystem?.caseSensitive?.toString(),
      useContextValue: this.getUseContextValue(selectedCodeSystem),
      hierarchyMeaning: selectedCodeSystem?.hierarchyMeaning
    })

    this.stepper.next();
  }

  async exportToFiles(): Promise<void> {
    this.verifyFormat();

    if (this.errorMessages?.length > 0 || !this.resourceFormGroup?.valid) {
      return;
    }

    try {
      this.codeSystem = await this.createCodeSystem();
      await this.saveToFile(JSON.stringify(this.codeSystem), `${this.codeSystem.name}-cs`);

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      if (this.firstFormGroup.value.onlyCodeSystem === 'false') {
        const valueSets = this.createOrFetchValueSets();
        for (let i = 0; i < valueSets.length; i++) {
          const vs = valueSets[i];
          await delay(200);
          await this.saveToFile(JSON.stringify(vs), `${i}-${vs.name}-vs`);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  async validate() {
    this.verifyFormat();
    if (!this.resourceFormGroup?.valid) {
      return;
    }
    this.codeSystem = await this.createCodeSystem();
    const validateResponse = await this.fhirService.validate(this.codeSystem);
    const VALIDATION_ERROR_MESSAGE = 'The resource contains invalid concepts or properties. Please check your input csv files and try again.';
    this.validation$.next({
      message: validateResponse ? validateResponse.message : VALIDATION_ERROR_MESSAGE,
      data: validateResponse?.issue
    });
  }

  isUpdateExportType() {
    return this.firstFormGroup.value?.exportType === 'UPDATE';
  }

  onTitleInput() {
    this.setValidatorsForIdControl();
    if (this.resourceFormGroup && !this.isUpdateExportType()) {
      const title = this.resourceFormGroup.value.title;
      const id = Util.capitalizeFirstLetter(Util.sanitizeString(title ? title : ''));
      const url = Util.buildUrl(this.resourceFormGroup.value.fhirIg, 'CodeSystem', id);
      this.resourceFormGroup.patchValue({url, id});
      const idControl = this.resourceFormGroup.get('id');
      idControl.markAsTouched();
      idControl?.updateValueAndValidity();
    }

  }
  setValidatorsForIdControl(){
    const idControl = this.resourceFormGroup.get('id');
    idControl.clearValidators();
    idControl.addValidators([Validators.required]);
    if (this.resourceFormGroup && !this.isUpdateExportType()) {
      idControl.addValidators([isAlphanumericButNotNumericValidator]);
    }
    idControl.markAsTouched();
    idControl?.updateValueAndValidity();
  }

  onDownloadFile(fileType: string, $event) {
    this.initEntities(fileType, $event);
    this.resourceFormGroup.patchValue({concepts: this.conceptCodes?.length > 0 ? 'ok' : ''});
    this.verifyFormat();

  }

  getErrorMessages() {
    return [...new Set(this.errorMessages)];
  }

  /**
   * Switch guiding step
   * @param step - a
   */
  setStep(step: string) {
    this.formService.setGuidingStep(step);
    this.formService.autoSave('state', step);
  }

  isDisabled() {
    return !this.resourceFormGroup.valid || this.errorMessages?.length > 0 || this.concepts.length < 1;
  }


  private async update() {
    if (!this.selectCodeSystemFormGroup.value?.selectedCodeSystem) {
      return;
    }

    let valueSets = null
    if (this.firstFormGroup.value.onlyCodeSystem === 'false') {
      valueSets = this.createOrFetchValueSets();
      await this.checkExistingValueSetsWithDifferentCodeSystem(valueSets, this.selectCodeSystemFormGroup.value?.selectedCodeSystem?.url);
      if (this.errorMessages?.length > 0) {
        return;
      }
    }

    this.codeSystem = await this.createCodeSystem();
    const observer: Observable<fhir.Resource> = this.fhirService.postWithBundle([this.codeSystem]);
    this.handleCodeSystemServerResponse(observer);

    if (valueSets?.length > 0) {
      const valueSetUrlForDeletion = this.findValueSetUrlForDeletion(valueSets);
      const valueSetsToCreateOrUpdate = this.getValueSetsToUpdate(valueSets, valueSetUrlForDeletion);
      const observerValueSet = this.fhirService.postValueSets(valueSetsToCreateOrUpdate, valueSetUrlForDeletion.map(str => str.substring(str.lastIndexOf('/') + 1)));
      const nbCodeSystemConcepts = valueSets?.length || 0;
      this.handleValueSetServerResponse(observerValueSet, nbCodeSystemConcepts);
    }

  }


  private handleValueSetServerResponse(bundleResponse: Observable<Resource>,
                                       nbCodeSystemConcepts: number) {
    this._loading$.next(true)
    bundleResponse.pipe(
      catchError((errorValueSet) => {
        console.error(errorValueSet);
        this.updateFormGroup.patchValue({errorValueSet});
        return of(errorValueSet);
      }),
      finalize(() => {
        this._loading$.next(false);
      })
    )
    bundleResponse.subscribe(value => {
      this.updateFormGroup.patchValue({valueSetServerResponse: value, nbCodeSystemConcepts});
      this._loading$.next(false);
    })
  }

  private handleCodeSystemServerResponse(observer: Observable<any>) {
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
      .subscribe(value => {
        this.updateFormGroup.patchValue({
          codeSystemServerResponse: value,
          codeSystem: this.codeSystem
        });
      })
  }

  private async checkExistingValueSetsWithDifferentCodeSystem(valueSets: ValueSet[], url) {
    const ids = valueSets.map(vs => vs.id);
    const existingValueSetWithDifferentCodeSystem = await this.findValueSetsHavingDifferentCodeSystem(ids, url);
    if (existingValueSetWithDifferentCodeSystem?.length > 0) {
      const existingIds = existingValueSetWithDifferentCodeSystem.map(vs => vs?.id);
      const rows = this.findExistingValueSetRows(existingIds);
      this.errorMessages.push(`Existing ValueSet${rows?.length > 0 ? 's' : ''} to another CodeSystem than ${url}, row${rows?.length > 0 ? 's' : ''}: ${rows.join(', ')}`);
    }
  }


  private async create() {
    this.codeSystem = await this.createCodeSystem();
    const existingCodeSystem = await this.getExistingCodeSystem(this.codeSystem.url);

    let valueSets = null
    if (existingCodeSystem) {
      this.errorMessages.push('The CodeSystem you try to create already exists, to create a new one modify the title of your new CodeSystem to generate a new url!');
      return;
    } else {
      if (this.firstFormGroup.value.onlyCodeSystem === 'false') {
        valueSets = this.createOrFetchValueSets();
        const existingsValueSets = await this.findValueSetsHavingDifferentCodeSystem(valueSets.map(vs => vs.id), this.codeSystem.url);
        const existingIds = existingsValueSets.map(vs => vs.id);
        const rows = this.findConceptRowsFromValueSetIds(existingIds)
        if (existingIds?.length > 0) {
          this.errorMessages.push(`ValueSet${existingIds.length > 1 ? 's' : ''} with id in : ${existingIds.join(', ')} already exist${existingIds.length > 1 ? 's' : ''}. Please review line${existingIds.length > 1 ? 's' : ''} ${rows} from concept.csv file. Neither the CodeSystem nor the ValueSet${existingIds.length > 1 ? 's' : ''} were created`);
          return;
        }
      }
    }
    const observerCodeSystem: Observable<any> = this.fhirService.postWithBundle([this.codeSystem]);
    this.handleCodeSystemServerResponse(observerCodeSystem);
    if (valueSets?.length > 0) {
      const observerValueSets = this.fhirService.postValueSets(valueSets, []);
      this.handleValueSetServerResponse(observerValueSets, valueSets.length)
    }
  }

  private saveToFile(content, exportFileName) {
    const blob = new Blob([content], {type: 'application/json;charset=utf-8'});
    const downloadLink = document.createElement('a');

    const objectUrl = URL.createObjectURL(blob);
    downloadLink.setAttribute('href', objectUrl);
    downloadLink.setAttribute('download', exportFileName + '.R4.json');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  /**
   * Creates or fetches ValueSet array based on form and code system data.
   *
   * This method generates an array of `ValueSet` objects when `onlyCodeSystem` is false,
   * using provided concepts, hierarchy, and code system details. If `onlyCodeSystem` is true,
   * it returns an empty array.
   *
   * @returns {ValueSet[]} - An array of `ValueSet` objects, or an empty array if `onlyCodeSystem` is true.
   */
  private createOrFetchValueSets(): ValueSet [] {
    if (this.firstFormGroup.value.onlyCodeSystem === 'false') {
      return this.terminologyResourcesService.createValueSets(this.concepts,
        this.hierarchy,
        this.codeSystem.url,
        this.codeSystem.useContext,
        this.codeSystem.experimental,
        this.codeSystem.date,
        this.resourceFormGroup.value.fhirIg,
        this.codeSystem.status)
    } else {
      return [];
    }
  }


  private findValueSetUrlForDeletion(valueSetsToCreate: ValueSet[]): string[] {
    const valueSetUrls = new Set(valueSetsToCreate.map(valueSet => valueSet.url));
    const valueSetToDelete: string[] = [];

    this.valueSetsOfSelectedCodeSystem?.forEach(oldVs => {
      if (!valueSetUrls.has(oldVs.url)) {
        valueSetToDelete.push(oldVs.url);
      }
    });

    return valueSetToDelete;
  }

  private getValueSetsToUpdate(
    newValueSets: ValueSet[],
    codesForDeletion: string[]
  ): ValueSet[] {
    return newValueSets
      .filter(vs => !codesForDeletion.includes(vs.url)) // Exclude value sets marked for deletion
      .reduce((result: ValueSet[], vs) => {
        const matchingValueSet = this.valueSetsOfSelectedCodeSystem?.find(oldVs => oldVs.id === vs.id);
        if (matchingValueSet) {
          Object.assign(matchingValueSet, {
            title: vs.title,
            status: vs.status,
            experimental: vs.experimental,
            useContext: vs.useContext,
            date: vs.date
          });
          result.push(matchingValueSet);
        } else {
          result.push(vs);
        }
        return result;
      }, []);
  }


  private async createCodeSystem() {
    let codeSystem: CodeSystem = {
      resourceType: "CodeSystem",
      id: this.resourceFormGroup.value.id,
      url: this.resourceFormGroup.value.url,
      title: this.resourceFormGroup.value.title,
      name: this.resourceFormGroup.value.id,
      status: this.resourceFormGroup.value.status,
      date: this.getFormattedDate(),
      content: "complete",
      meta: {
        source: Util.FORMBUILDER_ENDPOINT,
        profile: [Util.buildUrl(this._edsUrl, 'StructureDefinition', 'APHPEDSCodeSystem')]
      }
    };
    if (this.resourceFormGroup.value.description) {
      codeSystem.description = this.resourceFormGroup.value.description;
    }
    if (this.resourceFormGroup.value.useContextValue) {
      const result = await this.$allowedUseContextOptions.pipe(map((data: any) => {
          return data?.expansion?.contains;
        }),
        mergeAll(),
        filter((uc: any) => uc.code === this.resourceFormGroup.value.useContextValue)).toPromise();

      if (result?.code) {
        const usageContext: UsageContext = {
          code: {
            system: Util.buildUrl(this._edsUrl, 'CodeSystem', 'aphp-eds-usage-context-type-cs'),
            code: 'domain',
            display: 'Domaine métier'
          },
          valueCodeableConcept: {coding: [{code: result.code, display: result.display, system: result.system}]}
        };
        codeSystem.useContext = [usageContext];
      }
    }
    if (this.resourceFormGroup.value.hierarchyMeaning) {
      codeSystem.hierarchyMeaning = this.resourceFormGroup.value.hierarchyMeaning;
    }
    if (Boolean(this.resourceFormGroup.value.experimental)) {
      codeSystem.experimental = (this.resourceFormGroup.value.experimental === 'true');
    }
    if (Boolean(this.resourceFormGroup.value.caseSensitive)) {
      codeSystem.caseSensitive = (this.resourceFormGroup.value.caseSensitive === 'true');
    }

    const codeSystemConcepts = this.terminologyResourcesService.createCodeSystemConcepts(this.concepts, this.hierarchy, this.properties);
    if (codeSystemConcepts && codeSystemConcepts.length > 0) {
      codeSystem.concept = codeSystemConcepts
    }
    delete codeSystem.property;
    if (this.properties && this.properties.length > 0) {
      codeSystem.property = this.getProperties()
    }

    return codeSystem;
  }


  private getProperties() {
    const properties = [];
    for (let p of this.properties) {
      if (p.code && p.type) {
        const codeSystemProperty: CodeSystemProperty = {code: p.key, type: p.type};
        properties.push(codeSystemProperty);
      }
    }
    return properties.reduce((acc, current) => {
      const x = acc.find(item => {
        return item.code === current.code;
      });
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);
  }

  private initEntities(fileType: string, $event) {
    switch (fileType) {
      case 'concepts': {
        this.concepts = $event;
        this.conceptCodes = [...new Set(this.concepts.map(value => value.code))];
        break;
      }
      case 'hierarchy': {
        this.hierarchy = $event;
        break;
      }
      case 'properties': {
        this.properties = $event;
        break;
      }
    }
  }


  public verifyFormat() {
    this.errorMessages = [];
    if (this.concepts?.length > 0) {
      const columnNames = ['code', 'display'];
      const fileName = 'concepts.csv';
      const isNotValidHeader = this.isNotValidHeader(this.concepts, columnNames);
      if (isNotValidHeader) {
        this.errorMessages.push(this.getHeaderErrorMessage(fileName, columnNames));
      } else {
        const indicesLackingProperties = this.findIndicesLackingProperties(this.concepts, columnNames);
        if (indicesLackingProperties?.length > 0) {
          this.errorMessages.push(this.getMissingColumnErrorMessage(indicesLackingProperties, fileName));
        }
      }
    }

    if (this.hierarchy?.length > 0) {
      const columnNames = ['parent', 'child'];
      const fileName = 'hierarchy.csv';
      const isNotValidHeader = this.isNotValidHeader(this.hierarchy, columnNames);
      if (isNotValidHeader) {
        this.errorMessages.push(this.getHeaderErrorMessage(fileName, columnNames));
      } else {
        const rows = this.findIndicesLackingProperties(this.hierarchy, columnNames);
        if (rows?.length > 0) {
          this.errorMessages.push(this.getMissingColumnErrorMessage(rows, fileName));
        } else {
          const result = this.checkPropertiesInArray(this.hierarchy, columnNames, this.conceptCodes);
          if (result?.length > 0) {
            this.errorMessages.push(this.getConceptNotDeclaredErrorMessage(result, fileName));
          }
        }
      }
    }

    if (this.properties?.length > 0) {
      const columnNames = ['code', 'key', 'value', 'type'];
      const fileName = 'properties.csv';
      const isNotValidHeader = this.isNotValidHeader(this.properties, columnNames);
      if (isNotValidHeader) {
        this.errorMessages.push(this.getHeaderErrorMessage(fileName, columnNames));
      } else {
        const rows = this.findIndicesLackingProperties(this.properties, columnNames);
        if (rows?.length > 0) {
          this.errorMessages.push(this.getMissingColumnErrorMessage(rows, fileName));
        } else {
          const nokCodes = this.checkPropertiesInArray(this.properties, ['code'], this.conceptCodes);
          if (nokCodes?.length > 0) {
            this.errorMessages.push(this.getConceptNotDeclaredErrorMessage(nokCodes, fileName));
          }
          const notValidTypeRows = this.getNotValidRows(validateType, ['code', 'string', 'integer', 'boolean', 'dateTime', 'decimal']);
          if (notValidTypeRows.length > 0) {
            this.errorMessages.push(`Type ${this.getNotValidRowsMessage(notValidTypeRows, fileName)} consistent with http://hl7.org/fhir/R4/datatypes.html (Coding is not managed yet)}`);
          }
          const notValidValueRows = this.getNotValidRows(validateValue, null);
          if (notValidValueRows.length > 0) {
            this.errorMessages.push(`Value ${this.getNotValidRowsMessage(notValidValueRows, fileName)} consistent with their declared types`);
          }
          const notValidKeyRows = this.getNotValidRows(validateKey, null);
          if (notValidKeyRows.length > 0) {
            this.errorMessages.push(`Key ${this.getNotValidRowsMessage(notValidKeyRows, fileName)} formatted as code`);
          }
        }
      }
    }
    if (this.errorMessages.length === 0) {
      const indicesLowerCaseCodes = this.findLowerCaseCode();
      if (indicesLowerCaseCodes?.length > 0) {
        this.errorMessages.push(`Start root concept code with an upper-case letter in row${indicesLowerCaseCodes?.length > 1 ? 's' : ''} ${indicesLowerCaseCodes.join(', ')}`);
      }

      const threshold = 64;
      const tooManyCharacterCodes = this.findTooManyCharacterCode(threshold);
      if (tooManyCharacterCodes?.length > 0) {
        this.errorMessages.push(`Use ${threshold} characters or less for root concept code in row${tooManyCharacterCodes?.length > 1 ? 's' : ''} ${tooManyCharacterCodes.join(', ')}`);
      }

      const notAlphaNumericCodes = this.findNotValidAlphaNumericCode();
      if (notAlphaNumericCodes?.length > 0) {
        this.errorMessages.push(`Use alphanumeric only for root concept code in row${notAlphaNumericCodes?.length > 1 ? 's' : ''} ${notAlphaNumericCodes.join(', ')}`);
      }
      const duplicateConceptCodes = this.findDuplicateConceptCodes(this.concepts, this.resourceFormGroup?.value?.caseSensitive === 'true');
      if (duplicateConceptCodes?.length > 0) {
        this.errorMessages.push(`Duplicated concept codes, row${duplicateConceptCodes?.length > 1 ? 's' : ''}: ${duplicateConceptCodes.join(', ')}`);
      }
    }
  }

  private findConceptRowsFromValueSetIds(ids: string[]): number [] {
    let indices = [];
    for (let index = 0; index < this.concepts.length; index++) {
      const found = ids.find(value => Util.sanitizeString(this.concepts[index].code) === value)
      if (found) {
        indices.push(index + 2);
      }
    }
    return indices;
  }

  private findNotValidAlphaNumericCode(): number [] {
    let indices = [];
    for (let index = 0; index < this.concepts.length; index++) {
      const parentConceptCode = this.terminologyResourcesService.getParentConceptCode(this.concepts[index].code, this.hierarchy);
      const regex = /^[A-Za-z0-9\-\.]{0,63}$/;
      if (!parentConceptCode && !regex.test(this.concepts[index]?.code)) {
        indices.push(index + 2);
      }
    }
    return indices;
  }

  private findTooManyCharacterCode(threshold: number): number [] {
    let indices = [];
    for (let index = 0; index < this.concepts.length; index++) {
      const parentConceptCode = this.terminologyResourcesService.getParentConceptCode(this.concepts[index].code, this.hierarchy);
      if (!parentConceptCode && hasTooManyCharacter(this.concepts[index]?.code, threshold)) {
        indices.push(index + 2);
      }
    }
    return indices;
  }

  private findLowerCaseCode(): number [] {
    let indices = [];
    for (let index = 0; index < this.concepts.length; index++) {
      const parentConceptCode = this.terminologyResourcesService.getParentConceptCode(this.concepts[index].code, this.hierarchy);
      if (!parentConceptCode && !isFirstLetterUpercase(this.concepts[index]?.code)) {
        indices.push(index + 2);
      }
    }
    return indices;
  }

  private getNotValidRows(validationFunction, validTypes) {
    const notValidKeys = [];
    this.properties.forEach((prop, index) => {
      if (!validationFunction(prop, validTypes)) {
        notValidKeys.push(index + 2)
      }
    })
    return notValidKeys;
  }

  private findExistingValueSetRows(ids: string []) {
    const rows = [];
    for (let index = 0; index <= this.concepts.length; index++) {
      if (this.concepts[index] && ids.includes(Util.sanitizeString(this.concepts[index].code))) {
        rows.push(index + 2)
      }
    }
    return rows;
  }

  private getHeaderErrorMessage(fileName: string, columnNames: string []) {
    return `The header of this file ${fileName} is not valid, it should be: ${columnNames.join(',')}`;
  }

  private getMissingColumnErrorMessage(indicesLackingProperties: any [], fileName: string) {
    return 'Missing data in row' + (indicesLackingProperties.length > 1 ? 's ' : ' ') + indicesLackingProperties.join(',') + ' of file ' + fileName;
  }

  private getConceptNotDeclaredErrorMessage(concepts: any [], fileName: string) {
    const singleConcept = concepts.length === 1;
    return `Code${singleConcept ? '' : 's'} ${concepts.join(', ')} of ${fileName} ${singleConcept ? 'has' : 'have'} not been declared in concepts.csv`;
  }

  private getNotValidRowsMessage(rows: any [], fileNmae: string) {
    return `in row${rows.length > 1 ? 's' : ''} ${rows.join(', ')} of ${fileNmae} ${rows.length > 1 ? 'are' : 'is'} not`;
  }

  private checkPropertiesInArray = (objectsArray: any [], properties: string[], valuesArray: any []): any [] => {
    const missingProperties = [];
    objectsArray.forEach(element => {
      for (let prop of properties) {
        const value = element[prop];
        if (!valuesArray.includes(value)) {
          missingProperties.push(value);
        }
      }
    });
    return [...new Set(missingProperties)];
  };


  private findIndicesLackingProperties(sourceArray, propertiesArray): number [] {
    let indices = [];

    for (let i = 0; i < sourceArray.length; i++) {
      let element = sourceArray[i];
      for (let prop of propertiesArray) {
        if (!element.hasOwnProperty(prop) || Util.isEmptyOrNull(element[prop])) {
          indices.push(i + 2);
        }
      }
    }
    return [...new Set(indices)];
  }

  private findDuplicateConceptCodes(arr, isCaseSensitive: boolean): number [] {
    const codeMap = new Map();
    const duplicateIndices = [];

    arr.forEach((item, index) => {
      const code = isCaseSensitive ? item.code : item?.code?.toUpperCase();
      if (codeMap.has(code)) {
        duplicateIndices.push(codeMap.get(code), index + 2);
      } else {
        codeMap.set(code, index + 2);
      }
    });
    return [...new Set(duplicateIndices)];
  }

  private isNotValidHeader(sourceArray, propertiesArray): boolean {
    for (let i = 0; i < sourceArray.length; i++) {
      const element = sourceArray[i];
      const keys = Object.keys(element)
      if (!keys.every(element => propertiesArray.includes(element))) {
        return true;
      }

    }
    return false;
  }


  private async getExistingCodeSystem(url: string): Promise<any> {
    if (!url) {
      return null;
    }
    try {
      const bundle = await this.fhirService.search('CodeSystem', url, 'url').toPromise();
      if (bundle?.entry && bundle.entry.length > 0) {
        return bundle.entry[0].resource;
      }
    } catch (error) {
      console.error('Error fetching CodeSystem:', error);
      return null;
    }
  }

  private async findValueSetsByCodeSystem(codeSystemUrl: string): Promise<ValueSet []> {
    const result = []
    if (!codeSystemUrl) {
      return result;
    }
    try {
      const bundle = await this.fhirService.search('ValueSet', null).toPromise();
      for (const entry of bundle.entry) {
        const valueSet = entry.resource;
        if ("compose" in valueSet && valueSet?.compose?.include?.some(include => include.system === codeSystemUrl && valueSet.status !== 'retired')) {
          result.push(valueSet);
        }
      }
    } catch (error) {
      console.error('Error fetching ValueSet:', error);
    }
    return result;
  }

  private async findValueSetsHavingDifferentCodeSystem(ids: string[], codeSystemUrl): Promise<ValueSet[]> {
    const result: ValueSet[] = [];

    if (!ids || ids.length === 0) {
      return result;
    }

    try {
      const bundle = await this.fhirService.search('ValueSet', ids.join(','), '_id').toPromise();

      if (bundle?.entry) {
        for (const entry of bundle.entry) {
          const valueSet = entry.resource;

          // Navigate the resource to find `compose.include` arrays and match systems
          if ("compose" in valueSet) {
            const includes = valueSet?.compose?.include || [];
            // Determine if the ValueSet satisfies the code system condition
            const hasMatchingSystem = includes.every(include => include.system !== codeSystemUrl);

            if (hasMatchingSystem && valueSet?.id) {
              result.push(valueSet);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching ValueSet:', error);
    }

    return result;
  }

  private getUseContextValue(selectedCodeSystem: CodeSystem) {
    const useContext = selectedCodeSystem?.useContext;
    return (useContext && useContext[0]?.valueCodeableConcept?.coding?.length > 0) ? useContext[0]?.valueCodeableConcept?.coding[0].code : '';
  }

  async exportToServer() {
    this.verifyFormat();
    if (this.errorMessages?.length > 0 || !this.resourceFormGroup?.valid) {
      return;
    }
    if (this.firstFormGroup.value.exportType === 'CREATE') {
      await this.create()
    } else {
      await this.update()
    }
    this.validationFormGroup.patchValue({isValid: true});
    this.stepper.next();
  }


  private getFormattedDate(): string {
    const date = this.resourceFormGroup.value.date;
    return moment(date).format(this._dateFormat);
  }
}

// Validation function for property types
function validateType(prop, validTypes) {
  return validTypes.includes(prop.type);
}

// Validation function for property values
function validateValue(prop) {
  let pattern: any;
  switch (prop.type) {
    case 'string': {
      pattern = /[ \r\n\t\S]+/;
      break;
    }
    case 'code': {
      pattern = /^[^\s]+(\s[^\s]+)*$/;
      break;
    }
    case 'integer': {
      pattern = /^([0]|[-+]?[1-9][0-9]*)$/;
      break;
    }
    case 'boolean': {
      pattern = /true|false/;
      break;
    }
    case 'decimal': {
      pattern = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/;
      break;
    }
    case 'dateTime': {
      pattern = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/;
      break;
    }
  }

  const regex = new RegExp(pattern);
  return regex.test(prop.value);
}

function isFirstLetterUpercase(str: string): boolean {
  const regex = /^[A-Z]/;
  return regex.test(str);
}

function hasTooManyCharacter(s: string, threshold: number): boolean {
  return s?.length > threshold;
}

function isAlphanumericButNotNumericValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  // Vérifie si le string est de longueur <= 64, commence par une majuscule et est alphanumérique
  const regex = /^[A-Z][a-zA-Z0-9]{0,63}$/;
  return regex.test(value) ? null : {'alphanumericNotNumeric': true};
}


// Validation function for property keys
function validateKey(prop) {
  const pattern = /^[^\s]+(\s[^\s]+)*$/;
  const regex = new RegExp(pattern);
  return regex.test(prop.key);
}
