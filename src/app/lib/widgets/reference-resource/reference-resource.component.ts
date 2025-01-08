import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {ExtensionsService} from '../../../services/extensions.service';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {FetchService} from '../../../services/fetch.service';

@Component({
  selector: 'lfb-reference-resource',
  templateUrl: './reference-resource.component.html'
})
export class ReferenceResourceComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

  static readonly REFERENCE_RESOURCE_URL = 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource';
  subscriptions: Subscription [] = [];

  constructor(private extensionService: ExtensionsService, private fetchService: FetchService) {
    super();
  }


  $allowedOptions: Observable<any>;
  errors: any [];

  ngAfterViewInit(): void {

    super.ngAfterViewInit();

    const sub = this.formProperty.valueChanges.subscribe((value) => {
      this.updateReferenceResource(value);
    });
    this.subscriptions.push(sub);

  }

  ngOnInit() {
    this.setSelectValuesFromValueSet(this.schema.widget.valueSetUrl);
    this.readReferenceResource();
    super.ngOnInit();
  }

  setSelectValuesFromValueSet(valueSetUrl: string) {

    if (!valueSetUrl) {
      return;
    }
    this.$allowedOptions = this.fetchService.getValueSetByUrl(valueSetUrl);
  }

  private updateReferenceResource(value) {
    if (this.formProperty.canonicalPathNotation !== '__$referenceResource') {
      return;
    }
    this.extensionService.removeExtension(e => (e.value?.url &&
      e.value.url === ReferenceResourceComponent.REFERENCE_RESOURCE_URL))
    if (value) {
      const referenceExtension = {
        url: ReferenceResourceComponent.REFERENCE_RESOURCE_URL,
        valueCode: value
      }
      this.extensionService.addExtension(referenceExtension, null)
    }
  }

  readReferenceResource() {
    const extensionExt = this.extensionService.getFirstExtensionByUrl(ReferenceResourceComponent.REFERENCE_RESOURCE_URL);
    if (extensionExt?.valueCode) {
      this.formProperty.setValue(extensionExt.valueCode, true);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }
}
