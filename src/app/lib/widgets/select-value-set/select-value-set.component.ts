import {AfterViewInit, Component, OnInit} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {FetchService} from '../../../services/fetch.service';
import {Observable} from 'rxjs';
import {FormService} from '../../../services/form.service';
import {ExtensionsService} from '../../../services/extensions.service';
import {ExpressionComponent} from '../expression/expression.component';


@Component({
  selector: 'lfb-value-set-select',
  templateUrl: './select-value-set.component.html'
})
export class SelectValueSetComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {

  constructor(private fetchService: FetchService, private extensionService: ExtensionsService) {
    super();
  }

  $allowedOptions: Observable<any>;
  errors: any [];

  ngAfterViewInit(): void {

    super.ngAfterViewInit();
    this.formProperty.errorsChanges.subscribe((errors) => {
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
          return {code: e.code, message: 'the field value is not valid!'};
        });
      }
    });

    this.formProperty.valueChanges.subscribe((newValue) => {
      this.updateAnswerCode(newValue);
    })

  }

  ngOnInit() {
    this.setSelectValuesFromValueSet(this.schema.widget.valueSetUrl);
    this.readAnswerCode();
    super.ngOnInit();
  }

  private updateAnswerCode(value) {
    if (this.formProperty.canonicalPathNotation !== '__$answerCode') {
      return;
    }

    this.extensionService.removeExtension(e => (e.value?.url &&
      e.value.url === ExpressionComponent.ITEM_EXTRACTION_URL))
    if (value) {
      const extractionExtension = {
        url: ExpressionComponent.ITEM_EXTRACTION_URL,
        valueCode: value
      }
      this.extensionService.addExtension(extractionExtension, null)
    }
  }

  setSelectValuesFromValueSet(valueSetUrl: string) {

    if (!valueSetUrl) {
      return;
    }
    this.$allowedOptions = this.fetchService.getValueSetByUrl(valueSetUrl);
  }


  readAnswerCode() {
    if (this.formProperty.canonicalPathNotation === '__$answerCode') {
      const extensionExts = this.extensionService.getExtensionsByUrl(ExpressionComponent.ITEM_EXTRACTION_URL);
      if (extensionExts && extensionExts.length > 0) {
        const extensionExt = extensionExts[0];
        if (extensionExt?.valueCode) {
          this.formProperty.setValue(extensionExt.valueCode, true);
          const itemExtractionContextMethods = this.formProperty.searchProperty('__$itemExtractionContextMethods');
          itemExtractionContextMethods.setValue('value', false);
        }
      }
    }
  }

}
