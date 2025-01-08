import {AfterViewInit, Component, OnInit} from '@angular/core';
import {LfbControlWidgetComponent} from "../lfb-control-widget/lfb-control-widget.component";
import {Util} from "../../util";

@Component({
  selector: 'lfb-help-text',
  template: `
    <lfb-form-element [formProperty]="formProperty.searchProperty('/__$helpText/text')"></lfb-form-element>`
})
export class HelpTextComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {

  ngOnInit() {
    super.ngOnInit();
    const value = this.formProperty.value;
    value.linkId = value.linkId?.trim() || this.formProperty.parent?.value.linkId + '_intention';
    value.type = 'display'
    value.extension = value.extension || [];
    const ind = value.extension.findIndex((ext) => {
      return ext.url === Util.ITEM_CONTROL_EXT_URL && ext.valueCodeableConcept.coding.some((coding) => coding.code === 'help');
    });
    if (ind < 0) {
      value.extension.push(Util.HELP_BUTTON_EXTENSION)
    }
    this.formProperty.setValue(value, false);
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }
}
