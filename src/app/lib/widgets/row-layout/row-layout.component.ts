/**
 * For layout of fields in rows. Field width could be entire 12 columns (bootstrap grid size),
 * in which case next field starts on next line.
 */
import {AfterContentChecked, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {GridComponent} from '../grid.component/grid.component';
import {faAngleDown, faAngleUp} from '@fortawesome/free-solid-svg-icons';
import {FormService} from '../../../services/form.service';
import {AuthService} from "../../../services/auth.service";

@Component({
  selector: 'lfb-row-layout',
  template: `
    <div *ngFor="let row of basicRows">
      <div [class]="gridClass(field)" class="lfb-row" [ngClass]="{hideRow: isHidden(field)}"
           *ngFor="let field of getShowFields(row)">
        <lfb-form-element [formProperty]="getShowFieldProperty(field)"></lfb-form-element>
      </div>
    </div>
    <div class="d-flex pt-3" *ngIf="showExtractionData">
      <button *ngIf="extractionRows && extractionRows.length > 0" class="btn btn-link text-decoration-none ps-0 fw-bold"
              (click)="collapse2.toggle()"
              [attr.aria-expanded]="true"
              aria-controls="extractionFields"
      >Data extraction
        <fa-icon [icon]="collapseExtractionData ? faDown : faUp" aria-hidden="true"></fa-icon>
      </button>
    </div>
    <div #collapse2="ngbCollapse" [(ngbCollapse)]="collapseExtractionData" id="extractionFields">
      <hr>
      <div *ngFor="let row of extractionRows">
        <div [class]="gridClass(field)" class="lfb-row" [ngClass]="{hideRow: isHidden(field)}"
             *ngFor="let field of getShowFields(row)">
          <lfb-form-element [formProperty]="getShowFieldProperty(field)"></lfb-form-element>
        </div>
      </div>
    </div>

    <div class="d-flex pt-3" *ngIf="showAdvancedRows">
      <button *ngIf="advancedRows && advancedRows.length > 0" class="btn btn-link text-decoration-none ps-0 fw-bold"
              (click)="collapse3.toggle()"
              [attr.aria-expanded]="!collapseAdvanced"
              aria-controls="advancedFields"
      >Advanced fields
        <fa-icon [icon]="collapseAdvanced ? faDown : faUp" aria-hidden="true"></fa-icon>
      </button>
    </div>
    <div #collapse3="ngbCollapse" [(ngbCollapse)]="collapseAdvanced" id="advancedFields"  (ngbCollapseChange)="handleAdvPanelCollapse($event)">
      <hr>
      <div *ngFor="let row of advancedRows">
        <div [class]="gridClass(field)" class="lfb-row" [ngClass]="{hideRow: isHidden(field)}"
             *ngFor="let field of getShowFields(row)">
          <lfb-form-element [formProperty]="getShowFieldProperty(field)"></lfb-form-element>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lfb-row {
      border-bottom: lightgrey solid 1px;
      padding: 2px 0 2px 0;
    }

    .lfb-row:hover {
      background-color: lightgoldenrodyellow;
    }

    .hideRow {
      border: none !important;
      padding: 0 !important;
      display: none;
    }
  `]
})
export class RowLayoutComponent extends GridComponent implements OnInit, AfterContentChecked  {
  widgetId: string;

  basicRows: any = [];
  advancedRows: any = [];
  extractionRows: any = [];

  collapseAdvanced = true;

  collapseExtractionData = true;

  showExtractionData = true;

  showAdvancedRows = false;

  faUp = faAngleUp;
  faDown = faAngleDown;

  public constructor(
      private changeDetector: ChangeDetectorRef,
      private formService: FormService,
      private authService: AuthService
  ) {
    super();
  }

  /**
   * Initialize
   */
  ngOnInit() {
    // Read rows from schema layout
    this.widgetId = this.formProperty.schema.layout?.formLayout?.targetPage;
    this.basicRows = this.formProperty.schema.layout.formLayout.basic;
    this.advancedRows = this.formProperty.schema.layout.formLayout.advanced;
    this.collapseAdvanced = !this.authService.hasReadOnlyRole() && !!this.formService[this.widgetId];
    this.collapseExtractionData = !this.authService.hasReadOnlyRole();

    if (this.advancedRows) {
      for (const row of this.advancedRows) {
        if (row?.showFields) {
          this.showAdvancedRows = this.showAdvancedRows || row.showFields.length > 0
        }
      }
    }

    this.extractionRows = this.formProperty.schema.layout.formLayout.extractionData;

    if (this.extractionRows) {
      for (const row of this.extractionRows) {
        if (row?.showFields) {
          this.extractionRows = this.extractionRows || row.showFields.length > 0
        }
      }
    }
  }
  /**
   * Handle advance panel collapse/expand button.
   */
  handleAdvPanelCollapse(event: boolean) {
    this.collapseAdvanced = event;
    if(this.widgetId in this.formService) {
      this.formService[this.widgetId] = event;
    }
  }
  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }
  /**
   * Check to see if it is a hidden field. Intended to apply hideRow class.
   * @param field - Field id.
   */
  isHidden(field): boolean {
    return this.getWidgetId(field) === 'hidden';
  }
}
