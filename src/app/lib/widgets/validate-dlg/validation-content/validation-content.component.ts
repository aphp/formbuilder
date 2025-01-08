import {Component, Input, ViewChild} from '@angular/core';
import {MatTab, MatTabContent, MatTabGroup, MatTabsModule} from "@angular/material/tabs";
import {
  MatCellDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRowDef,
  MatRowDef,
  MatTable,
  MatTableDataSource, MatTableModule
} from "@angular/material/table";
import {MatSort, MatSortHeader, MatSortModule} from "@angular/material/sort";
import {AsyncPipe, JsonPipe, NgIf} from "@angular/common";
import {MatDialogModule} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";

@Component({
  selector: 'lfb-validation-content',
  standalone: true,
// tslint:disable-next-line:max-line-length
  imports: [MatTableModule, MatSortModule, MatTabsModule, MatDialogModule, JsonPipe, MatIconModule, MatButtonModule, MatExpansionModule, NgIf],
  templateUrl: './validation-content.component.html',
  styleUrl: './validation-content.component.css'
})
export class ValidationContentComponent {
  displayedColumns: string[] = ['severity', 'code', 'diagnostics', 'location'];
  dataSource: MatTableDataSource<any>;

  @Input()
  message;

  @ViewChild(MatSort) sort: MatSort;

  _data: any;
  get data(): any {
    return this._data;
  }

  @Input() set data(value: any) {
    this._data = value;
    if (this.data) {
      this.dataSource = new MatTableDataSource<any>(this.data);
      this.dataSource.sort = this.sort;
    }
  }

}
