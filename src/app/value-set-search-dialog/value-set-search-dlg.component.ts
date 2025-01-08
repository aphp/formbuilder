import {Component, OnInit} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import fhir, {UsageContext} from 'fhir/r4';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {fhirPrimitives} from '../fhir';
import {FHIRServer, FhirService} from '../services/fhir.service';
import {Util} from '../lib/util';
import {IMultiSelectOption} from 'ngx-bootstrap-multiselect';

// Search related inputs on the page.
interface State {
  searchTerm: string;
  searchField: string;
  status: IMultiSelectOption [];
  isShared: boolean;
  useContext: boolean;
  contained: boolean;
  fhirServer: FHIRServer;
}

@Component({
  selector: 'lfb-value-set-search-dlg',
  styleUrls: ['./value-set-search-dlgt.component.scss'],
  templateUrl: 'value-set-search-dlg.component.html'
})
export class ValueSetSearchDlgComponent implements OnInit {

  private _loading$ = new BehaviorSubject<boolean>(false);
  private _search$ = new Subject<void>();
  private _bundle$ = new BehaviorSubject<fhir.Bundle>(null);

  inputTerm = '';
  resultsOffset = 0; // To calculate serial number of the results across pages
  pageSize = 20;
  nextUrl: fhirPrimitives.url = null;
  prevUrl: fhirPrimitives.url = null;
  total: number = undefined;
  valueSets: fhir.ValueSet [];
  statusList: IMultiSelectOption [];
  panelOpenState = false;

  questionnaireUseContext: UsageContext [];
  useContextCheckBoxLabel = '';
  sharedContextTypeValue = 'shared';

  /**
   * Define a structure to associate search parameters on the page.
   * @private
   */
  private _state: State = {
    searchTerm: '',
    searchField: 'title:contains',
    status: [],
    isShared: false,
    useContext: true,
    contained: false,
    fhirServer: this.fhirService.getFhirServer()
  };

  constructor(public fhirService: FhirService, private activeModal: NgbActiveModal) {

    // Set up search pipe line
    this._search$.pipe(
      tap(() => this._loading$.next(true)),
      switchMap(() => this._search()),
      tap(() => this._loading$.next(false))
    ).subscribe((bundle) => {
      this.total = undefined; // Reset total before processing bundle
      this._bundle$.next(bundle);
    })

    // Set up bundle pipe line. Bundle could be invoked either by search or navigation.
    this.bundle$.pipe(map((bundle) => {
        this.valueSets = null;
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
          // Trim down resource
          const res = e.resource;
          const ret = {};
          ['id', 'title', 'name', 'url', 'useContext', 'status', 'meta'].forEach((f) => {
            if (res[f]) {
              ret[f] = res[f];
            }
          });
          return ret;
        });
      })
    ).subscribe((resources: fhir.ValueSet []) => {
      this.valueSets = resources;
    });
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

  get isShared() {
    return this._state.isShared;
  }

  set isShared(isShared: boolean) {
    this._set({isShared});
  }

  get useContext() {
    return this._state.useContext;
  }

  set useContext(useContext: boolean) {
    this._set({useContext});
  }

  get contained() {
    return this._state.contained;
  }

  set contained(contained: boolean) {
    this._set({contained});
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
    if (this.isShared) {
      othersParams = {...othersParams, 'context-type-value': this.sharedContextTypeValue};
    }
    const contextTypeValue = this.getUsageContextLabelFromCurrentQuestionnaire();
    if (this.useContext && contextTypeValue && contextTypeValue !== this.sharedContextTypeValue) {
      if (this.isShared) {
        othersParams = {...othersParams, 'context-type-value': this.sharedContextTypeValue + ',' + contextTypeValue}
      } else {
        othersParams = {...othersParams, 'context-type-value': contextTypeValue}
      }
    }
    if (this.contained) {
      othersParams = {...othersParams, _contained: 'true', _containedType: 'contained '}
    }
    return this.fhirService.search('ValueSet', this.searchTerm, this.searchField, othersParams);
  }

  ngOnInit(): void {
    this.statusList = [
      {id: 'draft', name: 'Draft'},
      {id: 'active', name: 'Active'},
      {id: 'retired', name: 'Retired'},
      {id: 'unknown', name: 'Unknown'}
    ];
    this.useContextCheckBoxLabel = this.getUsageContextLabelFromCurrentQuestionnaire(false);
    this._state.isShared = this.useContextCheckBoxLabel === 'Commun';
    this.searchTerm = this.inputTerm;
    this._search$.next();
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
   * Handle dialog dismiss
   * @param reason
   */
  dismiss(reason: any): void {
    this.activeModal.dismiss(reason);
  }

  /**
   * Handle dialog close
   * @param value
   */
  close(value: any): void {
    this.activeModal.close(value);
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

  getUsageContextCode(usageContext: UsageContext) {
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
      usageContext.valueCodeableConcept?.coding?.forEach(value => result.push(value.code));
      return result.join(',');
    }
  }

  getUsageContextLabelFromCurrentQuestionnaire(searchForCode = true) {
    let result = '';
    if (!this.questionnaireUseContext || this.questionnaireUseContext.length === 0) {
      return result;
    }
    let index = 0;
    for (const value of this.questionnaireUseContext) {
      const usageContextLabel = searchForCode ? this.getUsageContextCode(value) : this.getUsageContextLabel(value);
      if (usageContextLabel) {
        result += usageContextLabel;
        if (index < this.questionnaireUseContext.length - 1) {
          result += ',';
        }
      }
      index++;
    }
    return result;
  }

}
