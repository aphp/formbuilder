import {AfterViewInit, Component} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {FormService} from '../../../services/form.service';
import {Util} from '../../util';

@Component({
  selector: 'lfb-boolean-radio-hidden',
  templateUrl: 'boolean-radio-hidden.component.html'
})
export class BooleanRadioHiddenComponent extends LfbControlWidgetComponent implements AfterViewInit {
  static ID = 2000;
  _id = BooleanRadioHiddenComponent.ID++;
  options: Map<boolean, string> = new Map([[false, 'No'], [true, 'Yes']]);
  optionsKeys = []
  constructor(private formService: FormService) {
    super();
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
    const value = this.formProperty.value;
    const linkId = this.formProperty.parent.getProperty('linkId').value
    const treeNode = this.formService.getTreeNodeByLinkId(linkId);
    Util.updateHiddenExtension(treeNode.data, value);
    Util.removeHiddenExtension(treeNode.data, value);
    this.updateHiddenItemYesNo(treeNode.data, value);
  }

  updateHiddenItemYesNo(items: any, value: boolean) {
    if (!items) {
      return
    }
    if (items.linkId) {

      items.__$hiddenItemYesNo = value;
    }
    this.updateHiddenItemYesNo(items.item, value);
    if (Util.isIterable(items)) {
      for (const itemData of items) {
        this.updateHiddenItemYesNo(itemData, value);
      }
    }
  }
  doEnter($event) {
    $event.preventDefault();
  }
}
