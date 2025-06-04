import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {FHIRServer, FhirService} from '../../../services/fhir.service';
import fhir from 'fhir/r4';
import {fhirPrimitives} from '../../../fhir';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {finalize, map, switchMap, tap} from 'rxjs/operators';

interface State {
  searchTerm: string;
  searchField: SearchField;
  fhirServer: FHIRServer;
}

interface SearchField {
  field: string,
  display: string,
  searchFieldPlaceholder: string
}

@Component({
  selector: 'lfb-fhir-search-page',
  styles: [`
    .result-item:hover {
      background-color: lightgrey;
    }

    .scrollable-results {
      max-height: 54vh;
      overflow-y: auto;
    }
  `
  ],
  templateUrl: 'fhir-search-page.component.html'
})
export class FhirSearchPageComponent implements OnInit, AfterViewInit {

  private _loading$ = new BehaviorSubject<boolean>(false);
  private _search$ = new Subject<void>();
  private _bundle$ = new BehaviorSubject<fhir.Bundle>(null);

  inputTerm = '';
  resultsOffset = 0; // To calculate serial number of the results across pages
  pageSize = 20;
  nextUrl: fhirPrimitives.url = null;
  prevUrl: fhirPrimitives.url = null;
  total: number = undefined;
  questionnaires: fhir.Questionnaire [];

  @Input()
  hasResumeFormOption: boolean = false;

  @Output() selectedQuestionnaire = new EventEmitter<fhir.Questionnaire>();

  @Output() importFromLocalFile = new EventEmitter<boolean>();

  @Output() resumeTheLastForm = new EventEmitter<boolean>;

  searchFieldList: SearchField [] = [
    {field: 'title:contains', display: 'Form title only', searchFieldPlaceholder: 'Search form title'},
    {
      field: 'identifier:contains',
      display: 'Form identifier only',
      searchFieldPlaceholder: 'Search form identifier'
    },
    {field: '_content', display: 'Any text field', searchFieldPlaceholder: 'Search any text field'},
    {field: 'name:contains', display: 'Form name only', searchFieldPlaceholder: 'Search form name'},
    {field: 'code', display: 'Item code', searchFieldPlaceholder: 'Search item code'}
  ];

  @ViewChild('searchInputElement') inputField!: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
       this.inputField?.nativeElement.focus();
  }

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  onScroll(): void {
    const element = this.scrollContainer.nativeElement;
    const threshold = 300;

    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      this.loadItems();
    }
  }

  private _state: State = {
    searchTerm: '',
    searchField: this.searchFieldList[0],
    fhirServer: this.fhirService.getFhirServer()
  };

  constructor(public fhirService: FhirService) {

    this._search$.pipe(
      tap(() => {
        this._loading$.next(true);
        this.pageSize = 20;
      }),
      switchMap(() => this._search()),
      finalize(() => this._loading$.next(false))
    )
      .subscribe((bundle) => {
        this.total = undefined; // Reset total before processing bundle
        this._bundle$.next(bundle);
      });

    // Set up bundle pipe line. Bundle could be invoked either by search or navigation.
    this.bundle$.pipe(map((bundle) => {
        this.questionnaires = null;
        if (!bundle) {
          return null; // Might happen when initializing _bundle$
        }
        if (bundle.total !== undefined) { // page bundles may not have total. The existing total is valid.
          this.total = bundle.total;
        }

        // Capture navigation urls.
        this.nextUrl = null;
        this.prevUrl = null;
        if (bundle.link && bundle.link.length > 0) {
          bundle.link.forEach((lnk) => {
            switch (lnk.relation) {
              case 'self':
                this.resultsOffset = this._getOffset(lnk.url);
                break;
              case 'next':
                this.nextUrl = lnk.url;
                break;
              case 'prev':
              case 'previous':
                this.prevUrl = lnk.url;
                break;
            }
          });
        }

        if (!bundle.entry) {
          return null;
        }
        return bundle.entry.map((e) => {
          // Trim down resource
          const res = e.resource;
          const ret = {};
          ['id', 'title', 'name', 'publisher', 'version', 'effectivePeriod', 'status', 'code', 'meta'].forEach((f) => {
            if (res[f]) {
              ret[f] = res[f];
            }
          });
          return ret;
        });
      })
    ).subscribe((resources: fhir.Questionnaire []) => {
      this.questionnaires = resources;
      this._loading$.next(false)
    });
  }

  get loading$() {
    return this._loading$.asObservable();
  }

  get bundle$() {
    return this._bundle$.asObservable();
  }

  get searchTerm() {
    return this._state.searchTerm;
  }

  set searchTerm(searchTerm: string) {
    this._set({searchTerm});
  }

  get searchField() {
    return this._state.searchField;
  }

  set searchField(searchField: SearchField) {
    this._set({searchField});
  }

  get selectedFHIRServer() {
    return this._state.fhirServer;
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
  }

  private _search(): Observable<fhir.Bundle> {
    return this.fhirService.search('Questionnaire', this.searchTerm, this.searchField.field, {_count: this.pageSize});
  }

  ngOnInit(): void {
    this.searchTerm = this.inputTerm;
    this._search$.next();
  }

  searchInput() {
    this.searchTerm = this.inputTerm;
    this._search$.next();
  }

  nextPage(): void {
    this.getBundleByUrl(this.nextUrl);
  }

  prevPage(): void {
    this.getBundleByUrl(this.prevUrl);
  }

  getBundleByUrl(url: fhirPrimitives.url): void {
    this.fhirService.getBundleByUrl(url).subscribe((bundle) => {
      this._bundle$.next(bundle);
    });
  }

  _getOffset(url: fhirPrimitives.url): number {
    let ret = '';
    if (url) {
      ret = new URL(url).searchParams.get('_getpagesoffset');
    }
    return ret ? parseInt(ret, 10) : 0;
  }

  selectQuestionnaire(questionnaireId: any): void {
    this.selectedQuestionnaire.emit(questionnaireId);
  }

  importQuestionnaireFromLocalFile() {
    this.importFromLocalFile.emit(true);
  }

  resumeTheLastQuestionnaire() {
    this.resumeTheLastForm.emit(true);
  }

  loadItems() {
    this.pageSize += 20;
    this.fhirService.search('Questionnaire', this.searchTerm, this.searchField.field, {_count: this.pageSize}).subscribe((bundle) => {
      this._bundle$.next(bundle);
    });
  }
}
