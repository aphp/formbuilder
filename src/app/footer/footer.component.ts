import {Component, OnInit} from '@angular/core';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {MatButtonModule} from '@angular/material/button';
import appVersion from '../../assets/version.json';
import {environment} from '../../environments/environment';

@Component({
  selector: 'lfb-footer',
  template: `
    <div role="contentinfo" id="fine-print">
      <div class="m-2">
        <a href="/" target="_blank" rel="noopener noreferrer"><img width="300" src="../../assets/images/aphpLogo.svg"
                                        alt="Assistance publique Hôpitaux de Paris"></a>
      </div>

      <ul class="horz-list">
        <li><a href="https://www.aphp.fr/mentions-legales" target="_blank" rel="noopener noreferrer">Mentions légales</a></li>
        <li><a href="https://github.com/aphp/formbuilder/issues/new" rel="noopener noreferrer">Contact</a></li>
        <li><a href="https://www.aphp.fr/plan-du-site" target="_blank" rel="noopener noreferrer">Plan du site </a></li>
        <li class="last-item"><span *ngIf="appVersion"> Version: {{appVersion}}</span></li>
      </ul>
    </div>
  `,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit{
  constructor(private iconRegistry: MatIconRegistry,
              private sanitizer: DomSanitizer, private dialog: MatDialog) {
    this.iconRegistry.addSvgIcon('USAgov',
      this.sanitizer.bypassSecurityTrustResourceUrl('../../assets/images/USAgov.svg'));
  }
  appVersion: string;

  ngOnInit(): void {
    if(appVersion?.version) {
      this.appVersion = appVersion.version;
    }
  }
}
