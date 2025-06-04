import {Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';
import {FormService} from '../services/form.service';
import fhir, {Questionnaire} from 'fhir/r4';
import {Observable, of, Subject} from 'rxjs';
import {catchError, debounceTime, finalize, switchMap, takeUntil} from 'rxjs/operators';
import {MessageType} from '../lib/widgets/message-dlg/message-dlg.component';
import {NgbActiveModal, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {AutoCompleteResult} from '../lib/widgets/auto-complete/auto-complete.component';
import {FetchService} from '../services/fetch.service';
import {FhirService} from '../services/fhir.service';
import {FhirSearchDlgComponent} from '../lib/widgets/fhir-search-dlg/fhir-search-dlg.component';
import {PreviewDlgComponent} from '../lib/widgets/preview-dlg/preview-dlg.component';
import {AppJsonPipe} from '../lib/pipes/app-json.pipe';
import {Util} from '../lib/util';
import {MatDialog} from '@angular/material/dialog';
import {FhirExportDlgComponent} from '../lib/widgets/fhir-export-dlg/fhir-export-dlg.component';
import {SharedObjectService} from '../services/shared-object.service';
import {ValidateDlgComponent} from '../lib/widgets/validate-dlg/validate-dlg.component';
import {environment} from '../../environments/environment';
import {AuthService} from "../services/auth.service";
import {QuestionnaireCreateDlgComponent} from "../questionnaire-create-dialog/questionnaire-create-dlg.component";
import copy from "fast-copy";

@Component({
  selector: 'lfb-base-page',
  templateUrl: './base-page.component.html',
  styleUrls: ['./base-page.component.css'],
  providers: [NgbActiveModal]
})
export class BasePageComponent implements OnInit {

  private unsubscribe = new Subject<void>();
  @Input()
  guidingStep = 'home'; // 'choose-start', 'home', 'item-editor'
  startOption = 'scratch';
  questionnaire: fhir.Questionnaire = null;
  formFields: fhir.Questionnaire = null;
  formValue: fhir.Questionnaire;
  formSubject = new Subject<fhir.Questionnaire>();
  @Output()
  state = new EventEmitter<string>();
  objectUrl: any;
  acResult: AutoCompleteResult = null;
  @ViewChild('fileInput') fileInputEl: ElementRef;
  @ViewChild('loincSearchDlg') loincSearchDlg: TemplateRef<any>;
  @ViewChild('warnFormLoading') warnFormLoadingDlg: TemplateRef<any>;
  @ViewChild('duplicateEntryDetectedForm') duplicateEntryDetectedDlg: TemplateRef<any>;
  acceptedTermsOfUse = false;
  acceptedSnomed = false;
  lformsErrorMessage = null;

  isReadOnly: boolean;
  isAdmin: boolean;

  constructor(private formService: FormService,
              private modelService: SharedObjectService,
              private modalService: NgbModal,
              private fetchService: FetchService,
              public fhirService: FhirService,
              private appJsonPipe: AppJsonPipe,
              private matDlg: MatDialog,
              public authService: AuthService
  ) {
    this.acResult = null;
    const isAutoSaved = this.formService.isAutoSaved();
    if (isAutoSaved && !this.isDefaultForm()) {
      this.startOption = 'from_autosave';
    }

    this.acceptedTermsOfUse = sessionStorage.acceptedLoinc === 'true';
    this.acceptedSnomed = sessionStorage.acceptedSnomed === 'true';
    this.formService.setSnomedUser(this.acceptedSnomed);

    this.formSubject.asObservable().pipe(
      debounceTime(500),
      switchMap((fhirQ) => {
        this.formService.autoSaveForm(Util.convertToQuestionnaireJSON(fhirQ));
        return of(fhirQ);
      }),
      takeUntil(this.unsubscribe)
    ).subscribe(() => {
      console.log('Saved');
    });

    formService.guidingStep$.subscribe((step) => {
      this.guidingStep = step;
    });
    FormService.lformsLoaded$.subscribe({
      error: (error) => {
        this.lformsErrorMessage = `Encountered an error which causes the application not to work properly. Root cause is: ${error.message}`;
      }
    });
  }

  ngOnInit() {
    // @ts-ignore
    if (window.Cypress) {
      // @ts-ignore
      window.basePageComponent = this;
    }
    const result = {acceptedLoinc: true, acceptedSnomed: false};
    this.acceptedTermsOfUse = result.acceptedLoinc;
    sessionStorage.acceptedLoinc = result.acceptedLoinc;
    sessionStorage.acceptedSnomed = result.acceptedSnomed;
    this.formService.setSnomedUser(result.acceptedSnomed);
    if (window.opener) {
      this.formService.windowOpenerUrl = this.parseOpenerUrl(window.location);
    }
    this.addWindowListeners();
    this.isReadOnly = this.authService.hasReadOnlyRole();
    this.isAdmin = this.authService.hasAdminRole();
  }


  /**
   * Parse location object for url of window.opener.
   * window.location.href is expected to have url path of the form
   * '/window-open?referrer=[openerUrl], where <code>openerUrl</code> is location.href
   * of the parent window (window.opener). If the referrer parameter is missing,
   * it reads referrer or origin header for the url.
   *
   * @param location - Window location object
   * @returns string - window.opener url.
   */
  private parseOpenerUrl(location: Location): string {
    let ret = null;
    const pathname = location?.pathname.replace(/^\/+/, '').toLowerCase();
    if (pathname === 'window-open') {
      const params = new URLSearchParams(location.search);
      ret = params.get('referrer');
    }
    return ret;
  }

  /**
   * getter for url of the window.opener
   */
  get openerUrl(): string {
    return this.formService.windowOpenerUrl;
  }

  /**
   * Add window listeners, mainly to handle messaging with other browser windows.
   */
  addWindowListeners() {
    if (this.openerUrl) {
      const msgListener = (event) => {
        const message = event.data;
        const parentUrl = this.formService.windowOpenerUrl;
        if (!parentUrl.startsWith(event.origin)) {
          return;
        }
        switch (message?.type) {
          case 'initialQuestionnaire':
            try {
              console.log(`Received questionnaire from ${parentUrl}`);
              this.setQuestionnaire(JSON.parse(JSON.stringify(message.questionnaire)));
              this.setStep('fl-editor');
            } catch (err) {
              console.error(`Failed to parse questionnaire received from ${parentUrl}: ${err}`);
            }
            break;

          default:
            console.log(`Received a message from ${parentUrl}: type = ${event.data?.type}`);
            break;
        }
      }
      window.addEventListener('message', msgListener);
      window.addEventListener('beforeunload', (event) => {
        window.opener.postMessage({
          type: 'closed',
          questionnaire: Util.convertToQuestionnaireJSON(this.formValue)
        }, this.openerUrl);
      });

      window.opener.postMessage({type: 'initialized'}, this.openerUrl);
    }
  }

  /**
   * Notify changes to form.
   * @param form - form object, a.k.a questionnaire
   */
  notifyChange(form) {
    this.formSubject.next(form);
  }


  /**
   * Handle value changes in form-fields component.
   * @param formChanges - form changes
   */
  formFieldsChanged(formChanges) {
    [this.formValue, this.questionnaire, this.formFields].forEach((obj) => {
      for (const key of Object.keys(obj)) {
        if (key !== 'item') {
          delete obj[key];
        }
      }
      Object.assign(obj, formChanges);
    });
    this.notifyChange(this.formValue);
  }


  /**
   * Handle value changes in item-component.
   * @param itemList - Emits item list. Form level fields should be untouched.
   */
  itemComponentChanged(itemList) {
    this.formValue.item = itemList;
    this.notifyChange(this.formValue);
  }


  /**
   * Set questionnaire.
   * Make
   * @param questionnaire - Input FHIR questionnaire
   */
  setQuestionnaire(questionnaire) {
    this.updateQuestionnaireWithCustomProperties(questionnaire);
    questionnaire = this.formService.updateFhirQuestionnaire(questionnaire);
    this.questionnaire = questionnaire;
    this.modelService.questionnaire = this.questionnaire;
    this.formValue = Object.assign({}, questionnaire);
    this.formFields = Object.assign({}, questionnaire);
    delete this.formFields.item;
    this.notifyChange(this.formValue);
  }

  private updateQuestionnaireWithCustomProperties(questionnaire) {
    Util.setQuestionnaireVariableAndLaunchContextItems(questionnaire);
    Util.setUseContext(questionnaire);
    Util.addHiddenItemYesNoProperty(questionnaire.item, false);
  }

  /**
   * Switch guiding step
   * @param step - a
   */
  setStep(step: string) {
    this.formService.setGuidingStep(step);
    this.formService.autoSave('state', step);
  }

  /**
   * Check auto save status
   */
  isAutoSaved() {
    return this.formService.isAutoSaved();
  }

/////////////////////////////////////////

  /**
   * Set guiding to step to switch the page.
   */

  /*
  setGuidingStep(step: string) {
    // this.guidingStep = step;
    this.formService.autoSave('state', step);
  }
*/
  /**
   * Select form from local file system. Copied from current form builder.
   *
   * @param event - Object having selected file from the browser file dialog.
   */
  onFileSelected(event) {
    const loadFromFile = () => {
      const fileReader = new FileReader();
      const selectedFile = event.target.files[0];
      event.target.value = null; //
      fileReader.onload = () => {
        setTimeout(() => {
          this.setStep('item-editor');
          try {
            const questionnaire = this.formService.parseQuestionnaire(fileReader.result as string);
            delete questionnaire.id;
            console.log(questionnaire);
            this.setQuestionnaire(questionnaire);
          } catch (e) {
            this.showError(`${e.message}: ${selectedFile.name}`);
          }
        });
      }
      fileReader.onerror = (error) => {
        this.showError('Error occurred reading file: ${selectedFile.name}');
      }
      fileReader.readAsText(selectedFile, 'UTF-8');
    };

    if (this.questionnaire) {
      this.warnFormLoading((load) => {
        loadFromFile();
      },);
    } else {
      loadFromFile();
    }
  }

  showError(error: any) {
    this.formService.showMessage('Error', error.message || error, MessageType.DANGER);
  }

  /**
   * View preview of lforms widget and questionnaire json
   */
  showPreviewDlg() {
    // configure lforms template options
    const lformsTemplateOptions = {
      options: {
        displayScoreWithAnswerText: false // Not show scores
      }
    };

    this.matDlg.open(PreviewDlgComponent,
      {
        data: {questionnaire: Util.convertToQuestionnaireJSON(this.formValue), lfData: lformsTemplateOptions},
        width: '80vw', height: '80vh'
      }
    );
  }

  async validateQuestionnaire() {
    const questionnaire = Util.convertToQuestionnaireJSON(this.formValue);
    const validateResponse = await this.fhirService.validate(questionnaire);

    this.matDlg.open(ValidateDlgComponent,
      {
        data: {data: validateResponse?.issue},
        width: '80vw', height: '80vh'
      });

  }

  goToHelp() {
    const url = environment.igFormBuilderUrl;
    window.open(url, '_blank', "noopener");
  }

  /**
   * Format result item for auto complete.
   * @param acResult - Result item.
   */
  formatter(acResult: any) {
    return acResult.id + ': ' + acResult.title;
  }

  /**
   * Save form to local file, mostly copied from current form builder.
   */
  saveToFile() {
    const content = this.toString(this.questionnaire);
    const blob = new Blob([content], {type: 'application/json;charset=utf-8'});
    const formName = this.questionnaire.title;
    const formShortName = this.questionnaire.name;
    const exportFileName = formShortName ? formShortName.replace(/\s/g, '-') : (formName ? formName.replace(/\s/g, '-') : 'form');

    // Use hidden anchor to do file download.
    // const downloadLink: HTMLAnchorElement = document.createElement('a');
    const downloadLink = document.getElementById('exportAnchor');
    const urlFactory = (window.URL || window.webkitURL);
    if (this.objectUrl != null) {
      // First release any resources on existing object url
      urlFactory.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.objectUrl = urlFactory.createObjectURL(blob);
    downloadLink.setAttribute('href', this.objectUrl);
    downloadLink.setAttribute('download', exportFileName + '.R4.json');
    // Avoid using downloadLink.click(), which will display down content in the browser.
    downloadLink.dispatchEvent(new MouseEvent('click'));
  }

  /**
   * Close menu handler.
   */
  close() {
    if (this.openerUrl) {
      window.close();
    } else {
      this.setStep('home');
      if (!this.isDefaultForm()) {
        this.startOption = 'from_autosave';
      }
    }
  }

  /**
   * Change button text based on context
   */
  createButtonLabel(): string {
    let ret = 'Create questions';
    if (this.questionnaire?.item?.length > 0) {
      ret = 'Edit questions'
    }
    return ret;
  }

  /**
   * Import FHIR server menu handler.
   */
  importFromFHIRServer() {
    // Server picked, invoke search dialog.
    this.modalService.open(FhirSearchDlgComponent, {size: 'lg', scrollable: true}).result.then((selected) => {
      if (selected !== false) { // Questionnaire picked, get the item from the server.
        this.warnFormLoading((load: boolean) => {
          if (load) {
            this.fhirService.read(selected).subscribe((resp) => {
              this.setStep('item-editor');
              this.setQuestionnaire(resp);
            });
          }
        });
      }
    }, (reason) => {
      console.error(reason);
    });
  }

  async save() {

    const questionnaire = Util.convertToQuestionnaireJSON(this.formValue);

    const isUrlUnique = await this.fetchService.checkUrlUnique(questionnaire?.url, questionnaire?.version, questionnaire?.id);

    if (!isUrlUnique) {
      this.modalService.open(this.duplicateEntryDetectedDlg);
      return;
    }

    if (questionnaire.id) {
      const observer: Observable<any> = this.fhirService.update(questionnaire, null);
      this.handleServerResponse(observer, 'UPDATE');
    } else {
      const newQuestionnaire = copy(this.questionnaire);
      this.openQuestionnaireCreateDlgComponent(newQuestionnaire);
    }
  }


  handleServerResponse(serverResponse: Observable<fhir.Resource>, type) {
    serverResponse.pipe(
      catchError((err) => {
        console.error(err.message);
        return of(err);
      }),
      finalize(() => {
      })
    )
      .subscribe((response) => {
        const modalRef = this.modalService.open(FhirExportDlgComponent, {size: 'lg', scrollable: true});
        if (response instanceof Error) {
          modalRef.componentInstance.error = response;
          modalRef.componentInstance.serverResponse = null;
        } else {
          modalRef.componentInstance.notChanged = this.isNotChangedQuestionnaire(response);
          this.questionnaire.id = response.id;
          this.questionnaire.meta = response.meta;
          this.setQuestionnaire(this.questionnaire)
          modalRef.componentInstance.error = null;
          modalRef.componentInstance.type = type;
          modalRef.componentInstance.serverResponse = response;
        }
      });
  }

  private isNotChangedQuestionnaire(response: any) {
    return this.questionnaire.id === response.id &&
      this.questionnaire.meta &&
      this.questionnaire.meta.versionId === response.meta.versionId;
  }

  /**
   * Transform questionnaire model to FHIR compliant questionnaire in string format.
   *
   * The questionnaire, although mostly a FHIR questionnaire object, has some internal fields for processing.
   * Get a fully compliant FHIR questionnaire in string format.
   *
   * @param questionnaire - Questionnaire model is in the form builder.
   */
  toString(questionnaire: fhir.Questionnaire): string {
    return this.appJsonPipe.transform(questionnaire);
  }

  /**
   * Show warning dialog when overwriting existing form.
   * @param loadFn - Callback method after user clicks continue button.
   * @param cancelFn - Callback method after user clicks cancel button.
   */
  warnFormLoading(loadFn, cancelFn?) {
    if (Util.isDefaultForm(this.questionnaire)) {
      loadFn(true);
    } else {
      this.modalService.open(this.warnFormLoadingDlg, {size: 'lg', scrollable: true}).result.then((result) => {
        loadFn(result);
      }, (reason) => {
        if (cancelFn) {
          cancelFn(reason);
        }
      });
    }
  }

  /**
   * Compare if a stored form is equal to default form.
   */
  isDefaultForm(): boolean {
    const storedQ = this.formService.autoLoadForm();
    if (storedQ) {
      storedQ.item = storedQ.item || [];
    }
    return Util.isDefaultForm(storedQ);
  }

  onQuestionnaireSelected(questionnaireId: any) {
    this.fhirService.read(questionnaireId).subscribe(questionnaire => {
      this.setQuestionnaire(questionnaire);
      this.setStep('item-editor');
    });

  }

  onImportQuestionnaireFromLocalFile() {
    this.fileInputEl.nativeElement.click();
  }

  onResumeTheLastForm() {
    let state = this.formService.autoLoad('state');
    state = state === 'home' ? 'item-editor' : state;
    this.formService.setGuidingStep(state);
    this.setQuestionnaire(this.formService.autoLoadForm());
  }

  onDuplicate() {
    const newQuestionnaire = copy(this.questionnaire);
    delete newQuestionnaire.url;
    this.openQuestionnaireCreateDlgComponent(newQuestionnaire);
  }

  createQuestionnaireFromScratch() {
    this.openQuestionnaireCreateDlgComponent(Util.createDefaultForm());
  }

  private openQuestionnaireCreateDlgComponent(questionnaire: Questionnaire) {
    const modalRef = this.modalService.open(QuestionnaireCreateDlgComponent);

    modalRef.componentInstance.questionnaire = questionnaire;

    modalRef.result.then(questionnaire => {
      if (!questionnaire) {
        return;
      }
      if (!questionnaire.item) {
        questionnaire.item = [];
      }
      this.setStep('item-editor');
      this.setQuestionnaire(questionnaire);
    });
  }
}
