/**
 * Handle layout and editing of item level fields
 */
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input, OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {SharedObjectService} from '../services/shared-object.service';

@Component({
  selector: 'lfb-ngx-schema-form',
  template: `
    <div class="container">
      <lfb-sf-form-wrapper *ngIf="instantiate" [isHiddenRadioItem]="isHiddenRadioItem" [model]="model" (valueChange)="updateValue($event)" (errorsChanged)="onErrorsChange($event)" (warningsChanged)="onWarningsChange($event)"></lfb-sf-form-wrapper>
    </div>
  `,
  styles: [`

    pre {
      padding: 02em;
      border: solid 1px black;
      background: #eee;
    }

    :host ::ng-deep sf-form-element > div {
      margin-top: 1em;
      margin-bottom: 1em;
    }

    :host ::ng-deep .form-control {
      height: calc(1.0em + .75rem + 2px);
      padding: 0 3px 0 3px;
    }

    :host ::ng-deep fieldset {
      border: 0;
    }

    .title {
      margin-top: 10px;
      font-size: 20px;
      font-weight: bold;
    }

  `]
})
export class NgxSchemaFormComponent implements OnChanges {

  static ID = 0;
  _id = ++NgxSchemaFormComponent.ID;

  instantiate = true;
  myTestSchema: any;
  @Output()
  setLinkId = new EventEmitter();
  @Input()
  model: any;
  @Output()
  valueChange = new EventEmitter<any>();
  @Output()
  errorsChanged = new EventEmitter<any[]>();
  @Output()
  warningsChanged = new EventEmitter<any[]>();
  @Input()
  isHiddenRadioItem

  constructor(private modelService: SharedObjectService, private cdr: ChangeDetectorRef) {
  }

  ngOnChanges(changes: SimpleChanges) {
    // Destroy the current component and recreate new one.
    this.instantiate = false;
    this.cdr.detectChanges();
    this.instantiate = true;
    this.cdr.detectChanges();
  }

  /**
   * The model is changed, emit the event.
   * @param value - Event value.
   */
  updateValue(value: any) {
    this.valueChange.emit(value);
    this.modelService.currentItem = value;
  }


  /**
   * Handle errorsChanged event from <lfb-sf-form-wrapper>
   * @param errors - Event object from <lfb-sf-form-wrapper>
   */
  onErrorsChange(errors) {
    this.errorsChanged.next(errors);
  }
  onWarningsChange (warnings){
    this.warningsChanged.next(warnings);
  }
}
