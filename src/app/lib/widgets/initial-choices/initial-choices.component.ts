import {AfterViewInit, Component, OnInit} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {ExtensionsService} from '../../../services/extensions.service';
import {ExpressionComponent} from '../expression/expression.component';
import {combineLatest} from "rxjs";

@Component({
  selector: 'lfb-initial-choices',
  templateUrl: './initial-choices.component.html'
})
export class InitialChoicesComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {

  static ID = 7200;
  _id = InitialChoicesComponent.ID++;
  options: Map<string, string> = new Map([['expression', 'Expression'], ['value', 'Value'], ['no', 'No']]);
  optionsKeys = []

  constructor(private extensionService: ExtensionsService) {
    super();
  }

  ngOnInit() {
    super.ngOnInit();
    if (this.formProperty.canonicalPathNotation === '__$itemExtractionContextMethods') {
      const extension = this.extensionService.getFirstExtensionByUrl(ExpressionComponent.ITEM_EXTRACTION_URL);
      if(extension){
        this.formProperty.setValue('no', false);
        if(extension.valueCode){
          this.formProperty.setValue('value', false);
        }
        if(extension.valueExpression){
          this.formProperty.setValue('expression', false);
        }
      }
    }
    if (this.formProperty.canonicalPathNotation === '__$initialExpressionYesNo') {
      const extension = this.extensionService.getFirstExtensionByUrl(ExpressionComponent.INITIAL_EXPRESSION_URL);
      const initial = this.formProperty.searchProperty('initial');
      if (initial?.value?.length >= 1) {
        this.formProperty.setValue('value', false);
      } else if (extension?.valueExpression) {
        this.formProperty.setValue('expression', false);
      } else {
        this.formProperty.setValue('no', false);
      }
    }

    if (this.formProperty.canonicalPathNotation === '__$calculatedExpressionYesNo') {
      const extension = this.extensionService.getFirstExtensionByUrl(ExpressionComponent.CALCULATED_EXPRESSION_URL);
      if (extension?.valueExpression) {
        this.formProperty.setValue(true, false);
      }
    }
  }

  ngAfterViewInit() {
    if (this.formProperty.schema.widget?.optionLabels) {
      this.options = new Map(this.formProperty.schema.widget.optionLabels);
    }
    this.optionsKeys = Array.from(this.options.keys());
    this.updateForAnswerValueSet();
    this.labelPosition = 'left';
    super.ngAfterViewInit();
  }

  private updateForAnswerValueSet() {
    if (this.formProperty.canonicalPathNotation === '__$initialExpressionYesNo') {

      const obs1 = this.formProperty.searchProperty('__$answerOptionMethods').valueChanges;
      const obs2 = this.formProperty.searchProperty('type').valueChanges;
      const obs3 = this.formProperty.searchProperty('answerValueSet').valueChanges;
      combineLatest(obs1, obs2, obs3).subscribe(([answerOptionMethod, type, answerValueSet]) => {
        this.optionsKeys = Array.from(this.options.keys());
        if ((type === 'choice' || type === 'open-choice') && (answerOptionMethod !== 'value-set' || !answerValueSet)) {
          this.optionsKeys = this.optionsKeys.filter(opt => opt !== 'value')
        }
      });
      this.formProperty.valueChanges.subscribe(value => {
        if (value === 'no' || value === 'expression') {
          this.formProperty.searchProperty('initial').setValue('', false)
        }
      })

    }
  }

  onChange() {
    if (this.formProperty.canonicalPathNotation === '__$itemExtractionContextMethods') {
      this.extensionService.removeExtension(e => (e.value?.url &&
        e.value.url === ExpressionComponent.ITEM_EXTRACTION_URL));
    }
    if (this.formProperty.canonicalPathNotation === '__$initialExpressionYesNo') {
      this.extensionService.removeExtension(e => (
        e.value?.url && e.value.url === ExpressionComponent.INITIAL_EXPRESSION_URL));
    }
    if (this.formProperty.canonicalPathNotation === '__$calculatedExpressionYesNo') {
      this.extensionService.removeExtension(e => (
        e.value?.url && e.value.url === ExpressionComponent.CALCULATED_EXPRESSION_URL));
    }
  }

  doEnter($event) {
    $event.preventDefault();
  }
}
