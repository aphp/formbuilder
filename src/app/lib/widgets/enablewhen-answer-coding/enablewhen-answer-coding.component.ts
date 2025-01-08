/**
 * Answer coding component for enableWhen. The component is used for answer type choice for
 * selecting codes to satisfy a condition.
 */
import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {ObjectWidget} from '@lhncbc/ngx-schema-form';
import {FormService} from '../../../services/form.service';
import fhir from 'fhir/r4';
import {Observable, Subscription} from 'rxjs';
import {FetchService} from '../../../services/fetch.service';
import {map} from 'rxjs/operators';

@Component({
  selector: 'lfb-enablewhen-answer-coding',
  template: `

    <div class="widget form-group form-group-sm m-0 p-0">
      <select [ngModel]="model" [compareWith]="compareFn" (ngModelChange)="modelChanged($event)"
              name="{{name}}" [attr.id]="id"
              class="form-control"
      >
        <ng-container>
        <option *ngFor="let option of answerOptions | async" [ngValue]="option.valueCoding"
        >{{ option?.valueCoding?.display }} ({{ option?.valueCoding?.code }})
        </option>
        </ng-container>
      </select>
    </div>

  `,
  styles: []
})
export class EnablewhenAnswerCodingComponent extends ObjectWidget implements AfterViewInit, OnDestroy {

  subscriptions: Subscription [] = [];
  answerOptions: Observable<any[]>;
  model: fhir.Coding;

  /**
   * Invoke super constructor.
   *
   * @param formService - Inject form service
   */
  constructor(private formService: FormService, private fetchService: FetchService) {
    super();
  }

  ngOnInit() {
    const initValue = this.formProperty.value;
    if (initValue) {
      this.model = initValue;
    }
    this.init(this.formProperty.searchProperty('question').value);
  }


  /**
   * Component initialization.
   */
  ngAfterViewInit(): void {
    super.ngAfterViewInit();
    let sub = this.formProperty.valueChanges.subscribe((newValue) => {
      this.model = newValue;
    });
    this.subscriptions.push(sub);

    // Listen to question value changes.
    sub = this.formProperty.searchProperty('question').valueChanges.subscribe((source) => {
      this.init(source);
    });
    this.subscriptions.push(sub);
  }

  /**
   * Handle model change event in <select> tag.
   * @param coding - Option value
   */
  modelChanged(coding: fhir.Coding) {
    this.formProperty.setValue(coding, false);
  }


  /**
   * Call back for <select> tag to pick matching option for a given model.
   * For comparison, it prioritizes code equality before display equality.
   *
   * @param c1 - Option value
   * @param c2 - Model object to compare
   */
  compareFn(c1: fhir.Coding, c2: fhir.Coding): boolean {
    return c1 && c2
      ? (c1.code && c2.code
        ? c1.code === c2.code
        : (c1.display === c2.display))
      : c1 === c2;
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => {
      sub?.unsubscribe();
    })
  }

  private init(source: any) {
    if (!source) {
      return;
    }
    const answerType = this.formProperty.searchProperty('__$answerType').value;

    if (answerType === 'choice' || answerType === 'open-choice') {
      const sourceNode = this.formService.getTreeNodeByLinkId(source);

      const answerValueSet = sourceNode?.data?.answerValueSet;
      if (answerValueSet) {
        this.answerOptions = this.fetchService.getValueSetByUrl(answerValueSet)
          ?.pipe(map(r => r?.expansion?.contains?.map(e => ({
            valueCoding: {
              code: e.code,
              display: e.display,
              system: e.system
            }
          }))))
      }
    }
    this.model = !this.model && this.answerOptions ? this.answerOptions[0] : this.model;
  }
}
