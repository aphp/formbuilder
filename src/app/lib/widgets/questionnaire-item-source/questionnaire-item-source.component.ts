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
  selector: 'lfb-questionnaire-item-source',
  templateUrl: '../table/table.component.html',
  styleUrls: ['../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionnaireItemSourceComponent extends TableComponent implements AfterViewInit, OnDestroy, OnInit {

  subscriptions: Subscription [] = [];

  innerExtensionUrls: string [];
  parentExtensionUrl: string;

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef, private extensionService: ExtensionsService, private ngbModal: NgbModal) {
    super(elementRef, cdr, extensionService, ngbModal);
  }

  ngOnInit() {
    super.ngOnInit();

    const {innerExtensionUrls, parentExtensionUrl} = this.formProperty.schema.widget || {};
    this.innerExtensionUrls = innerExtensionUrls;
    this.parentExtensionUrl = parentExtensionUrl;

    const extensions = this.extensionService.getExtensionsByUrl(this.parentExtensionUrl);

    if (Util.isIterable(extensions)) {
      const result = extensions.map(ext => {
        const item = {};
        ext.extension?.forEach(innerExtension => {
          if (this.innerExtensionUrls.includes(innerExtension?.url)) {
            item[innerExtension.url] = innerExtension.url === 'source' ? innerExtension.valueUri : innerExtension.valueString;
          }
        });
        return item;
      });
      this.formProperty.setValue(result, true);
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    const subs = this.formProperty.valueChanges.subscribe((value) => {
      this.updateExtension(value, this.parentExtensionUrl);
    });
    this.subscriptions.push(subs);
  }

  updateExtension(options: any [], url: string) {
    const createExtensions = options.map(option => {
      const extensions = this.innerExtensionUrls.reduce((acc, field) => {
        if (option[field]) {
          if (field === 'source') {
            acc.push({valueUri: option[field], url: field});
          } else {
            acc.push({valueString: option[field], url: field});
          }

        }
        return acc;
      }, []);

      return {url, extension: extensions};
    }).filter(ext => ext.extension.length > 0);

    // Remove existing extensions before adding new ones
    this.extensionService.removeExtensionsByUrl(url);

    // Add new extensions if any exist
    createExtensions.forEach(ext => this.extensionService.addExtension(ext, null));
  }


  ngOnDestroy() {
    this.subscriptions.forEach((s) => {
      s.unsubscribe();
    });
  }
}
