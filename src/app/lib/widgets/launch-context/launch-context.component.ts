import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit
} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {ExtensionsService} from '../../../services/extensions.service';
import {TableComponent} from '../table/table.component';
import {Util} from '../../util';
import {FetchService} from '../../../services/fetch.service';
import {map} from 'rxjs/operators';
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'lfb-answer-expression',
  templateUrl: '../table/table.component.html',
  styleUrls: ['../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LaunchContextComponent extends TableComponent implements AfterViewInit, OnDestroy, OnInit {


  static readonly LAUNCH_CONTEXT_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext';
  static readonly VALUE_SET_URL = 'http://hl7.org/fhir/uv/sdc/ValueSet/launchContext';
  subscriptions: Subscription [] = [];

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef,
              private extensionService: ExtensionsService, private fetchService: FetchService, private ngbModal: NgbModal) {
    super(elementRef, cdr, extensionService, ngbModal);
  }

  ngOnInit() {
    super.ngOnInit();
    this.readLaunchContextExtension();
  }


  ngAfterViewInit() {
    super.ngAfterViewInit();
    const sub = this.formProperty.valueChanges.subscribe((newValue) => {
      this.updateLaunchContextExtension(newValue);
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }


  private readLaunchContextExtension() {
    const exts = this.extensionService.getExtensionsByUrl(LaunchContextComponent.LAUNCH_CONTEXT_URL);
    const result = [];
    if (Util.isIterable(exts)) {
      for (const ext of exts) {
        const launchItem = {description: '', type: '', name: ''};
        for (const innerExt of ext.extension) {
          if (innerExt.url === 'description') {
            launchItem.description = innerExt.valueString
          }
          if (innerExt.url === 'type') {
            launchItem.type = innerExt.valueCode
          }
          if (innerExt.url === 'name' && innerExt.valueCoding) {
            launchItem.name = innerExt.valueCoding.code
          }
        }
        result.push(launchItem);
      }
    }
    this.formProperty.setValue(result, false)
  }


  private async updateLaunchContextExtension(newValue) {
    const outerExtensions = [];
    if (Util.isIterable(newValue)) {
      for (const launchItem of newValue) {
        const extensions = [];
        const launchContextValueSet = await SingletonValueSetMap.getInstance(this.fetchService, LaunchContextComponent.VALUE_SET_URL);
        if (launchItem.name && launchContextValueSet.has(launchItem.name)) {
          const nameExt = {
            url: 'name',
            valueCoding: launchContextValueSet.get(launchItem.name)
          };
          extensions.push(nameExt);
        }
        if (launchItem.type) {
          const typeExt = {url: 'type', valueCode: launchItem.type};
          extensions.push(typeExt);
        }
        if (launchItem.description) {
          const descriptionExt = {url: 'description', valueString: launchItem.description};
          extensions.push(descriptionExt);
        }
        outerExtensions.push({url: LaunchContextComponent.LAUNCH_CONTEXT_URL, extension: extensions});
      }
      this.extensionService.removeExtensionsByUrl(LaunchContextComponent.LAUNCH_CONTEXT_URL);
      outerExtensions.forEach(e => this.extensionService.addExtension(e, null));
    }
  }

}

class SingletonValueSetMap {
  private static instance: Map<string, any> | null = null;

  private constructor() {
  }

  public static async getInstance(fetchService: FetchService, valueSetUrl: string): Promise<Map<string, any>> {
    if (this.instance === null) {
      this.instance = new Map<string, any>();
      const result = await this.getValueSetByUrl(fetchService, valueSetUrl).toPromise().catch(error => {
        console.error("Error fetching ValueSet:", error);
        return null;
      });
      result?.forEach(vc => this.instance.set(vc?.valueCoding?.code, vc.valueCoding))
    }
    return this.instance;
  }

  static getValueSetByUrl(fetchService: FetchService, valueSetUrl: string): Observable<any> {
    return fetchService.getValueSetByUrl(valueSetUrl)
      .pipe(map(r => r?.expansion?.contains.map(e => ({
        valueCoding: {
          code: e.code,
          display: e.display,
          system: e.system
        }
      }))));
  }
}
