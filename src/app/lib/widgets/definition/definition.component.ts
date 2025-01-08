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
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'lfb-answer-expression',
  templateUrl: '../table/table.component.html',
  styleUrls: ['../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DefinitionComponent extends TableComponent implements AfterViewInit, OnDestroy, OnInit {

  subscriptions: Subscription [] = [];

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef,
              private extensionService: ExtensionsService, private ngbModal: NgbModal) {
    super(elementRef, cdr, extensionService, ngbModal);
  }

  ngOnInit() {
    super.ngOnInit();
    this.readDefinition();
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    const sub = this.formProperty.valueChanges.subscribe((newValue) => {
      this.updateDefinition(newValue);
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }

  private readDefinition() {
    let value = [{part1: '', part2: ''}];
    const definition = this.formProperty.searchProperty('definition');
    if (definition?.value) {
      const list = definition.value.split('#')
      if (list && list.length > 0) {
        value = [{part1: list[0], part2: list.length > 1 ? list[1] : ''}];
      }
    }
    this.formProperty.setValue(value, false);
  }

  private updateDefinition(newValue: any) {

    const value = this.formProperty.value;
    if (value) {
      const result = (value.length > 0) ? this.getDefinition(value[0], newValue) : null;
      const definitionProperty = this.formProperty.searchProperty('definition')
      definitionProperty.setValue(result || '', true);
    }
  }

  private getDefinition(definitionValue, newDefinitionValue: any[]) {
    if (!definitionValue || !newDefinitionValue) {
      return null;
    }
    const defArray = newDefinitionValue [0];
    if (defArray?.part1 && defArray?.part2) {
      return (defArray.part1 + '#' + defArray.part2);
    } else if (defArray?.part1) {
      const part2 = (definitionValue?.part2)
        ? definitionValue.part2 : '';
      return (defArray.part1 + '#' + part2);
    } else if (defArray?.part2) {
      const part1 = (definitionValue?.part1)
        ? definitionValue.part1 : ''
      return (part1 + '#' + defArray.part2);
    }
    return null;
  }

}
