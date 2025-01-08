import {Component, OnInit} from '@angular/core';
import {NgbDatepickerConfig} from '@ng-bootstrap/ng-bootstrap';
import {FormService} from "./services/form.service";
import {AuthService} from "./services/auth.service";
import {environment} from "../environments/environment";

@Component({
  selector: 'lfb-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'aphp-formbuilder';
  authenticated = false;

  constructor(dateConfig: NgbDatepickerConfig, private formService: FormService, protected loginService: AuthService) {
    const today = new Date();
    dateConfig.minDate = {year: today.getUTCFullYear() - 100, month: today.getUTCMonth() + 1, day: today.getUTCDate()};
    dateConfig.maxDate = {year: today.getUTCFullYear() + 100, month: today.getUTCMonth() + 1, day: today.getUTCDate()};
    this.formService.guidingStep$.subscribe(value => this.showImportTerminologyResourcePage = (value === 'create-terminology-resources'));

  }

  showImportTerminologyResourcePage = false;

  async ngOnInit() {
    // @ts-ignore
    if (window.Cypress || !environment?.keycloakConfig?.url) {
      this.authenticated = true;
      this.loginService.loadAdminProfile();
      return;
    } else {
      const result = await this.loginService.loadUserProfile();
      this.authenticated = (this.loginService.userProfile !== null);
    }
  }
}
