import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ExtensionsService} from '../../../services/extensions.service';
import {TableComponent} from '../table/table.component';
import {Util} from '../../util';
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'lfb-answer-expression',
  templateUrl: '../table/table.component.html',
  styleUrls: ['../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpressionComponent extends TableComponent implements AfterViewInit, OnDestroy, OnInit {

  public static readonly ITEM_EXTRACTION_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext'
  public static readonly INITIAL_EXPRESSION_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression';
  public static readonly CALCULATED_EXPRESSION_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression'
  public static readonly ANSWER_EXPRESSION_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression'

  subscriptions: Subscription [] = [];
  extensionUrl: string;

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef,
              private extensionService: ExtensionsService, private ngbModal: NgbModal) {
    super(elementRef, cdr, extensionService, ngbModal);
  }

  ngOnInit() {
    super.ngOnInit();
    this.extensionUrl = this.formProperty.schema.widget.extensionUrl;
    this.readExpressionExtension();
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    const sub = this.formProperty.valueChanges.subscribe((newValue) => {
      this.updateExpressionExtension(newValue, this.extensionUrl);
    });
    this.subscriptions.push(sub);
    const typeFormProperty = this.formProperty.searchProperty('/type');
    if (typeFormProperty) {
      const subType = this.formProperty.searchProperty('/type').valueChanges.subscribe((type) => {
        if (type !== 'reference' && type !== 'choice' && type !== 'open-choice') {
          this.extensionService.removeExtension(e => (e.value?.url
            && e.value.url === ExpressionComponent.ANSWER_EXPRESSION_URL));
        }
      });
      this.subscriptions.push(subType);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }

  private updateExpressionExtension(newValue, url) {
    const extensions = []
    if (Util.isIterable(newValue)) {
      for (const valueExpression of newValue) {
        if (valueExpression && (valueExpression.name || valueExpression.description ||
          valueExpression.expression || valueExpression.language || valueExpression.reference)) {
          extensions.push({url, valueExpression})
        }
      }
    }
    this.extensionService.removeExtensionsByUrl(url);
    extensions.forEach(e => this.extensionService.addExtension(e, null));
  }


  readExpressionExtension() {
    const exts = this.extensionService.getExtensionsByUrl(this.extensionUrl);
    if (Util.isIterable(exts)) {
      const result = [];
      for (const ext of exts) {
        if (ext.valueExpression) {
          result.push(ext.valueExpression);
        }
      }
      this.formProperty.setValue(result, true)
    }

  }
}
