import {Component, Input, OnInit} from '@angular/core';
import {FetchService} from '../../../services/fetch.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {FormProperty} from '@lhncbc/ngx-schema-form';
import {map} from "rxjs/operators";
import {Util} from "../../util";


@Component({
  selector: 'custom-select-value-set',
  templateUrl: './select-value-set-for-answer-options.component.html'
})
export class SelectValueSetForAnswerOptionsComponent implements OnInit {

  constructor(private fetchService: FetchService) {
  }

  @Input()
  valueSetUrl: string;

  @Input()
  showOnlyDisplay: boolean;

  @Input()
  hasSortedType: boolean

  @Input()
  items: [];

  @Input()
  selectProperty: any
  allowedOptions$: Observable<any>;

  errors: any [];

  private codeSystemCache = new Map<string, any>();

  /**
   * Initialize component, mainly the options list.
   */
  ngOnInit(): void {
    this.setSelectValuesFromValueSet(this.valueSetUrl);
    this.updateIdentifierItem();
    if (this.selectProperty?.schema?.description === 'transformation_type') {
      this.selectProperty.errorsChanges.subscribe((errors) => {
        this.errors = null;
        if (errors?.length) {
          // For some reason, errors have duplicates. Remove them.
          const errorsObj = {};
          errors.reduce((acc, error) => {
            if (!acc[error.code]) {
              acc[error.code] = error;
            }
            return acc;
          }, errorsObj);
          this.errors = Object.values(errorsObj).filter((e: any) => e.code === 'PATTERN').map((e: any) => {
            return {code: e.code, message: 'This field is required if using mapping Orbis DL form extension'};
          });
        }
      });
    }
  }

  setSelectValuesFromValueSet(valueSetUrl: string) {
    if (!valueSetUrl) {
      return;
    }
    this.allowedOptions$ = this.fetchService.getValueSetByUrl(valueSetUrl);
  }

  onSelect(newValue: any, property: FormProperty) {
    property.setValue(newValue, false);
    this.updateIdentifierItem();
    this.updateInitialItem(newValue);
    Util.updateAnswerExpressionDescription(property, 'language');
  }


  private async getCodeSystem(codeSystemUrl: string, code: string) {
    let cachedValue = this.codeSystemCache.get(codeSystemUrl);

    if (!cachedValue) {
      cachedValue = await this.fetchService.getCodeSystemByUrl(codeSystemUrl).toPromise().catch(error => {
        console.error("Error fetching CodeSystem:", error);
        return null;
      });
      if (cachedValue) {
        this.codeSystemCache.set(codeSystemUrl, cachedValue);
      }
    }

    if (!cachedValue || !cachedValue.entry || cachedValue.entry.length < 1) {
      return null;
    }

    const concept = cachedValue.entry[0]?.resource?.concept;
    return concept?.find((conceptItem: any) => conceptItem.code === code) || null;
  }

  private getPropertyByCode(properties: any, code: string) {
    return properties?.find((property: any) => property.code === code) || null;
  }

  async updateIdentifierItem() {
    if (
      !this.selectProperty ||
      !this.selectProperty.__canonicalPathNotation.includes('identifier') ||
      !this.selectProperty.__canonicalPathNotation.includes('system')) {
      return;
    }

    this.startSpinner();

    const type = this.selectProperty.searchProperty('__$type');
    type.setValue(null, false);

    const codeSystem = await this.getCodeSystem(Util.CODE_SYSTEM_NAMESPACE_URL, this.selectProperty.value);

    // Set "type" property if exists
    const propertyType = this.getPropertyByCode(codeSystem?.property, 'has-type');
    if (propertyType) {
      const typeCodeSystem = await this.getCodeSystem(Util.CODE_SYSTEM_IDENTIFIER_TYPE_URL, propertyType.valueCoding?.code);
      if (typeCodeSystem && type) {
        const valueType = {
          system: Util.CODE_SYSTEM_IDENTIFIER_TYPE_URL,
          code: typeCodeSystem.code,
          display: typeCodeSystem.display
        }
        type.setValue(valueType, false);
      }
    }
    this.stopSpinner();
  }

  compareURLs(url1, url2): boolean {
    return this.removeTrailingSlash(url1) === this.removeTrailingSlash(url2);
  }

  removeTrailingSlash(url) {
    return (url[url.length - 1] === '/') ? url.substr(0, url.length - 1) : url;
  }

  private async updateInitialItem(newValue: any) {
    if (this.selectProperty?._path !== '/initial/*/valueCoding/code') {
      return;
    }
    const initial = this.selectProperty.parent;
    if (initial) {
      const valueSetElements = await SingletonValueSetMap.getInstance(this.fetchService, this.valueSetUrl);
      const valueCodingFromValueSet = valueSetElements.get(newValue);
      if (valueCodingFromValueSet) {
        initial.setValue(valueCodingFromValueSet, false)
      } else {
        initial.setValue({code: '', display: '', system: ''}, false);
      }

    }
  }
  spinner$ = new BehaviorSubject<boolean>(false);
  startSpinner() {
    this.spinner$.next(true);
  }

  stopSpinner() {
    this.spinner$.next(false);
  }
}

class SingletonValueSetMap {
  private static instance: Map<string, any> | null = null;

  private constructor() {
  }

  public static async getInstance(fetchService: FetchService, valueSetUrl: string): Promise<Map<string, any>> {
    if (this.instance === null) {
      this.instance = new Map<string, any>();
      const result = await this.getValueSetByUrl(fetchService, valueSetUrl).toPromise();
      result.forEach(vc => this.instance.set(vc?.valueCoding?.code, vc.valueCoding))
    }
    return this.instance;
  }

  static getValueSetByUrl(fetchService: FetchService, valueSetUrl: string): Observable<any> {
    return fetchService.getValueSetByUrl(valueSetUrl)
      .pipe(map(r => r?.expansion?.contains.map(e => ({
        valueCoding: {
          code: e.code,
          display: e.display,
          system: e.system
        }
      }))));
  }
}
