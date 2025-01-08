import {AfterViewInit, Component, OnInit} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {ExtensionsService} from '../../../services/extensions.service';

@Component({
  selector: 'lfb-boolean-radio-subject',
  templateUrl: 'boolean-radio-subject.component.html'
})
export class BooleanRadioSubjectComponent extends LfbControlWidgetComponent implements AfterViewInit, OnInit {
  static ID = 10000;
  static readonly SUBJECT_ITEM_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-isSubject';
  _id = BooleanRadioSubjectComponent.ID++;
  options: Map<boolean, string> = new Map([[false, 'No'], [true, 'Yes']]);
  optionsKeys = []
  constructor(private extensionService: ExtensionsService) {
    super();
  }

  ngOnInit() {
    super.ngOnInit();
    const subjectExtension =this.extensionService.getFirstExtensionByUrl(BooleanRadioSubjectComponent.SUBJECT_ITEM_URL);
    this.formProperty.setValue(subjectExtension && subjectExtension.valueBoolean, false);
  }

  ngAfterViewInit() {
    if (this.formProperty.schema.widget?.optionLabels) {
      this.options = new Map(this.formProperty.schema.widget.optionLabels);
    }
    this.optionsKeys = Array.from(this.options.keys());
    this.labelPosition = 'left';
    super.ngAfterViewInit();
  }

  onChange() {
    this.extensionService.removeExtensionsByUrl(BooleanRadioSubjectComponent.SUBJECT_ITEM_URL);
    if(this.formProperty.value){
      this.extensionService.addExtension({url: BooleanRadioSubjectComponent.SUBJECT_ITEM_URL, valueBoolean: this.formProperty.value}, null);
    }
  }
  doEnter($event) {
    $event.preventDefault();
  }
}
