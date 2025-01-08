/**
 * Handles FHIR initial field interaction in the item level form.
 */
import {AfterViewInit, ChangeDetectionStrategy, Component, DoCheck, OnInit} from '@angular/core';
import {TableComponent} from '../table/table.component';
import {Util} from "../../util";

@Component({
  selector: 'lfb-initial',
  templateUrl: './../table/table.component.html',
  styleUrls: ['./../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InitialComponent extends TableComponent implements AfterViewInit, DoCheck {

  ngAfterViewInit() {
    super.ngAfterViewInit();
    Util.setValueSetUrl(this.formProperty?.schema, '');
  }

  /**
   * Make sure there is at least one item in the table.
   */
  ngDoCheck() {
    if (this.formProperty.properties.length === 0) {
      this.addItem();
    }
    const valueSetUrl = this.formProperty.searchProperty('answerValueSet')?.value;
    if(valueSetUrl){
      Util.setValueSetUrl(this.formProperty?.schema, valueSetUrl);
    }
  }

}
