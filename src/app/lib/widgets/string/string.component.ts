/**
 * Component for general input box
 */
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {Util} from '../../util';

@Component({
  selector: 'lfb-string',
  templateUrl: './string.component.html'
})
export class StringComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {

  modifiedMessages = {
    PATTERN: {
      '^\\S*$': 'Spaces and other whitespace characters are not allowed in this field.', // uri
      '^[^\\s]+(\\s[^\\s]+)*$': 'Spaces are not allowed at the beginning or end.',       // code
    },
    MIN_LENGTH: null,
    MAX_LENGTH: null
  }
  errors: { code: string, originalMessage: string, modifiedMessage: string } [] = null;
  customErrors: { code: string, originalMessage: string, modifiedMessage: string } [] = null;

  ngOnInit() {
    super.ngOnInit();
    this.controlClasses = this.controlClasses || 'form-control form-control-sm';
    this.updateName();
    this.customErrors = this.getCustomErrors()
  }

  /**
   * Add formProperty change subscriptions.
   */
  ngAfterViewInit() {
    this.setDescriptionDefaultValue();
    super.ngAfterViewInit();
    this.formProperty.valueChanges.subscribe(() => this.customErrors = this.getCustomErrors());
    this.formProperty.errorsChanges.subscribe((errors) => {
      this.errors = [];
      if (errors?.length) {
        // For some reason, errors have duplicates. Remove them.
        const errorsObj = {};
        errors.reduce((acc, error) => {
          if (!acc[error.code]) {
            acc[error.code] = error;
          }
          return acc;
        }, errorsObj);
        this.errors = Object.values(errorsObj).map((e: any) => {
          const modifiedMessage = e.code === 'PATTERN' ? this.modifiedMessages.PATTERN[e.params[0]] : this.modifiedMessages[e.code];
          if (e.title === 'Link id' && e.code === 'INVALID_TYPE') {
            return;
          }
          return {code: e.code, originalMessage: e.message, modifiedMessage};
        });
      }

    });
  }

  private setDescriptionDefaultValue() {
    if (this.formProperty.canonicalPathNotation.includes('answerExpression') && this.formProperty.canonicalPathNotation.includes('description')) {
      const parentValue = this.formProperty.parent?.value;
      if (!parentValue || Object.keys(parentValue).length === 0) {
        this.formProperty.setValue('TO DO', false)
      }
    }
  }

  onInput() {
    Util.updateAnswerExpressionDescription(this.formProperty, 'expression');
    Util.updateAnswerExpressionDescription(this.formProperty, 'description');
    this.updateName();
  }


  private updateName() {
    if (this.formProperty.canonicalPathNotation !== 'title') {
      return;
    }
    const nameFormProperty = this.formProperty.searchProperty('/name');
    if (nameFormProperty) {
      const title = this.formProperty.value;
      const name = Util.convertTitleToName(title);
      nameFormProperty.setValue(name, false);
    }
  }

  getCustomErrors(): any[] {
    if (this.formProperty?.schema?.isRequired && !this.formProperty?.value) {
      return [{
        code: "REQUIRED_FIELD",
        originalMessage: 'This field is required except for draft questionnaire!',
        modifiedMessage: 'This field is required except for draft questionnaire!'
      }];
    }
    return null;
  }

  doEnter($event) {
    $event.preventDefault();
  }
}
