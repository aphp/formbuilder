import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {FetchService} from '../../../services/fetch.service';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';

@Component({
  selector: 'lfb-use-context',
  templateUrl: './use-context.component.html',
  styles: []
})
export class UseContextComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(private fetchService: FetchService) {
    super();
  }


  $allowedOptions: Observable<any>;
  errors: any [];
  subscriptions: Subscription [] = [];

  setSelectValuesFromValueSet(valueSetUrl: string) {
    if (!valueSetUrl) {
      return;
    }
    this.$allowedOptions = this.fetchService.getValueSetByUrl(valueSetUrl);
  }

  ngOnInit() {
    this.setSelectValuesFromValueSet(this.schema.widget.valueSetUrl);
    this.readUseContext();
    super.ngOnInit();
  }

  ngAfterViewInit(): void {
    super.ngAfterViewInit();
    const sub = this.formProperty.valueChanges.subscribe((value) => {
      this.updateUseContext(value);
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }

  private updateUseContext(value: any) {
    if (value !== null && value !== undefined) {
      const useContextProperty = this.formProperty.searchProperty('useContext')
      if (!value.code) {
        useContextProperty.setValue('', true);
        return;
      }
      const useContextElement = {
        code: {
          system: 'https://aphp.fr/ig/fhir/eds/CodeSystem/aphp-eds-usage-context-type-cs',
          code: 'domain',
          display: 'Domaine métier'
        },
        valueCodeableConcept: {
          coding: [{
            system: value.system,
            code: value.code,
            display: value.display
          }]
        }
      }
      const result = {useContextElement};
      useContextProperty.setValue(result, true);
    }
  }
  compareByCode(itemOne, itemTwo) {
    return itemOne && itemTwo && itemOne.code === itemTwo.code;
  }
  private readUseContext() {
    const useContextProperty = this.formProperty.searchProperty('useContext');
    if (useContextProperty?.value) {
      const useContext = useContextProperty.value;
      if (useContext && useContext.length > 0) {
        const value = useContext?.[0].valueCodeableConcept?.coding [0];
        if (value) {
          const propertyValue = {code: value.code, display: value.display, system: value.system, version: '0.1.0'}
          this.formProperty.setValue(propertyValue, true);
        }
      }
    }
  }
}
