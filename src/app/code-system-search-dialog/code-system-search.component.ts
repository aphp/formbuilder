import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import fhir, {CodeSystem, UsageContext} from 'fhir/r4';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {finalize, map, switchMap, tap} from 'rxjs/operators';
import {fhirPrimitives} from '../fhir';
import {FHIRServer, FhirService} from '../services/fhir.service';
import {Util} from '../lib/util';
import {IMultiSelectOption} from "ngx-bootstrap-multiselect";
import {FetchService} from "../services/fetch.service";

// Search related inputs on the page.
interface State {
  searchTerm: string;
  searchField: string;
  status: IMultiSelectOption [];
  useContext: string [];
  fhirServer: FHIRServer;
}

@Component({
  selector: 'lfb-code-system-search',
  styleUrls: ['./code-system-search.component.scss'],
  templateUrl: 'code-system-search.component.html'
})
export class CodeSystemSearchComponent implements OnInit, OnChanges {

  private _loading$ = new BehaviorSubject<boolean>(false);
  private _search$ = new Subject<void>();
  private _bundle$ = new BehaviorSubject<fhir.Bundle>(null);
  $allowedUseContextOptions: Observable<any>;

  inputTerm = '';
  resultsOffset = 0; // To calculate serial number of the results across pages
  pageSize = 4;
  nextUrl: fhirPrimitives.url = null;
  prevUrl: fhirPrimitives.url = null;
  total: number = undefined;
  codeSystems: fhir.CodeSystem [];
  statusList = [
    {id: 'draft', name: 'Draft'},
    {id: 'active', name: 'Active'},
    {id: 'retired', name: 'Retired'},
    {id: 'unknown', name: 'Unknown'}
  ];
  @Input()
  selectedCodeSystem;

  @Output()
  codeSystemEventEmitter = new EventEmitter<CodeSystem>();

  private _state: State = {
    searchTerm: '',
    searchField: 'title:contains',
    status: [],
    useContext: [],
    fhirServer: this.fhirService.getFhirServer()
  };

  constructor(public fhirService: FhirService, public fetchService: FetchService) {


  }

  ngOnChanges() {
    this.search();
  }

  ngOnInit(): void {
    this.search();
    this.$allowedUseContextOptions = this.fetchService.getValueSetByUrl(Util.buildUrl('https://aphp.fr/ig/fhir/eds', 'ValueSet', 'aphp-eds-domain-usage-context-vs'));
  }

  // Getters and setters
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

  set searchField(searchField: string) {
    this._set({searchField});
  }

  get status(): IMultiSelectOption [] {
    return this._state.status;
  }

  set status(status: IMultiSelectOption []) {
    this._set({status});
  }


  get useContext() {
    return this._state.useContext;
  }

  set useContext(useContext: string []) {
    this._set({useContext});
  }


  /**
   * Set partial properties of search state.
   * @param patch - Partial state fields.
   * @private
   */
  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
  }

  /**
   * Invoke search with inputs
   * @private
   */
  private _search(): Observable<fhir.Bundle> {
    let othersParams: any = {_count: this.pageSize + 1}
    if (Util.isIterable(this.status)) {
      const status = this.status.join(',');
      if (status) {
        othersParams = {...othersParams, status}
      }
    }
    if (Util.isIterable(this.useContext)) {
      const useContext = this.useContext.join(',');
      if (useContext) {
        othersParams = {...othersParams, 'context-type-value': useContext}
      }
    }

    return this.fhirService.search('CodeSystem', this.searchTerm, this.searchField, othersParams);
  }


  /**
   * Search button handler.
   */
  searchInput() {
    this.searchTerm = this.inputTerm;
    this._search$.next();
  }

  /**
   * Next page button handler
   */
  nextPage(): void {
    this.getBundleByUrl(this.nextUrl);
  }

  /**
   * Previous page button handler
   */
  prevPage(): void {
    this.getBundleByUrl(this.prevUrl);
  }

  /**
   * Get resource bundle using url, typically by navigation links.
   * @param url
   */
  getBundleByUrl(url: fhirPrimitives.url): void {
    this.fhirService.getBundleByUrl(url).subscribe((bundle) => {
      this._bundle$.next(bundle);
    });
  }

  /**
   * Get offset of results page. Used to calculate serial numbers on the page.
   * @param url
   */
  _getOffset(url: fhirPrimitives.url): number {
    let ret = '';
    if (url) {
      ret = new URL(url).searchParams.get('_getpagesoffset');
    }
    return ret ? parseInt(ret, 10) : 0;
  }

  /**
   * Handle dialog close
   * @param chosen codeSystem
   */
  select(codeSystem: any): void {
    this.selectedCodeSystem = codeSystem;
    this.codeSystemEventEmitter.emit(codeSystem)
  }

  getUsageContextLabel(usageContext: UsageContext) {
    if (!usageContext) {
      return '';
    }
    if (usageContext.valueRange) {
      return usageContext.valueRange.low + ' - ' + usageContext.valueRange.high;
    }
    if (usageContext.valueReference) {
      return usageContext.valueReference.display;
    }
    if (usageContext.valueQuantity) {
      return usageContext.valueQuantity.value;
    }
    if (usageContext.valueCodeableConcept && usageContext.valueCodeableConcept.coding) {
      const result = [];
      usageContext.valueCodeableConcept?.coding?.forEach(value => result.push(value.display ? value.display : value.code));
      return result.join(' - ');
    }
  }

  getOptions(array: any []): any [] {
    return array?.map(op => {
      return {id: op.code, name: op.display}
    })
  }

  private search() {
    // Set up search pipe line
    this._search$.pipe(
      tap(() => this._loading$.next(true)),
      switchMap(() => this._search()),
      tap(() => this._loading$.next(false)),
      finalize(() => this._loading$.next(false))
    ).subscribe((bundle) => {
      this.total = undefined; // Reset total before processing bundle
      this._bundle$.next(bundle);
    })

    // Set up bundle pipe line. Bundle could be invoked either by search or navigation.
    this.bundle$.pipe(map((bundle) => {
        if (!bundle) {
          return null; // Might happen when initializing _bundle$
        }
        if (bundle.total !== undefined) { // page bundles may not have total. The existing total is valid.
          this.total = bundle.total;
        }

        // Capture navigation urls.
        this.nextUrl = null;
        this.prevUrl = null;
        if (bundle?.link?.length > 0) {
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
          return e.resource;
        });
      })
    ).subscribe((resources: fhir.CodeSystem []) => {
      this.codeSystems = resources;
    });
    this.searchTerm = this.inputTerm;
    this._search$.next();
  }

  getLastVisibleResultOffset() {
    return Math.min(this.resultsOffset + 1 + this.pageSize, this.total-1);
  }

}
