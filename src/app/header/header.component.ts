import {Component, OnInit} from '@angular/core';
import {AuthService, UserProfile} from '../services/auth.service';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {environment} from "../../environments/environment";


@Component({
  selector: 'lfb-header',
  template: `
    <mat-toolbar id="header" class="ps-0 pe-0 ">
      <mat-icon id="logo" svgIcon="logo-formbuilder" aria-label="Home"></mat-icon>
      <div id="siteNameBox">
        <div><a style="padding: 0px" mat-button id="siteName" href="/">
          <span class="fs-4">AP-HP FormBuilder</span>
        </a></div>
        <div class="fs-6">A tool for building HL7<sup>®</sup> FHIR<sup>®</sup> Questionnaires</div>

      </div>
      <div *ngIf="isKeycloakEnabled" class="float-lg-right ">
        <!--<div>{{ userProfile?.firstName }} {{ userProfile?.lastName }}</div>-->
        <div class="fs-6 role">{{ getFormattedUserRole() }}</div>
      </div>
      <div *ngIf="isKeycloakEnabled" class="float-lg-right" style="padding-left: 16px">
        <button class="btn btn-primary me-2 menuButton" matTooltip="Logout" (click)="logOut()">
          <mat-icon class="menuIcon">exit_to_app</mat-icon>
        </button>
      </div>

    </mat-toolbar>
  `,
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  userProfile: UserProfile;
  isKeycloakEnabled: boolean;

  constructor(public loginService: AuthService,
              private iconRegistry: MatIconRegistry,
              private sanitizer: DomSanitizer) {
    // Register our icon(s)
    this.iconRegistry.addSvgIcon('logo-formbuilder',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/images/logo.svg'));
    this.iconRegistry.addSvgIcon('logo-aphp',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/images/aphpLogo.svg'));
    this.iconRegistry.addSvgIcon('import-file',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/images/import-file-icon.svg'));
  }

  ngOnInit(): void {
    this.userProfile = this.loginService.userProfile;
    // @ts-ignore
    this.isKeycloakEnabled = environment?.keycloakConfig;
  }


  /**
   * Logout
   */
  logOut() {
    this.loginService.logOut();
  }


  getFormattedUserRole(): string {
    if (!this.userProfile?.role) {
      return "";
    }
    let formattedUserRole = '';
    switch (this.userProfile?.role) {
      case `data_formbuilder_admin_${environment?.env}`:
        formattedUserRole = 'Admin'
        break;
      case `data_formbuilder_readonly_${environment?.env}`:
        formattedUserRole = 'Readonly'
        break;
      case `data_formbuilder_front_${environment?.env}`:
        formattedUserRole = 'Front'
        break;
      case `data_formbuilder_data_${environment?.env}`:
        formattedUserRole = 'Data'
        break;
      case `data_formbuilder_csa1_${environment?.env}`:
        formattedUserRole = 'Csa1'
        break;
      case `data_formbuilder_csa2_${environment?.env}`:
        formattedUserRole = 'Csa2'
        break;

    }
    return formattedUserRole;
  }
}
