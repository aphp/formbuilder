import {Injectable} from '@angular/core';
import {KeycloakService} from "keycloak-angular";
import {environment} from "../../environments/environment";

/**
 * Define user profile
 */
export interface UserProfile {
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
}


/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(readonly keycloak: KeycloakService) {
  }

  private adminRole = `data_formbuilder_admin_${environment?.env}`;
  private readonlyRole = `data_formbuilder_readonly_${environment?.env}`;
  private creatorRole = `data_formbuilder_creator_${environment?.env}`;

  private formBuilderRoles =
    [this.adminRole,
      this.readonlyRole,
      this.creatorRole
    ];

  userProfile: UserProfile;

  async getToken(): Promise<string> {
    let token = await this.keycloak.getToken();

    if (token && !this.keycloak.isTokenExpired()) {
      return token;
    }
    const isTokenUpdated = await this.keycloak.updateToken(30);
    if (!isTokenUpdated) {
      await this.keycloak.login();
    }
    return this.keycloak.getToken();
  }

  logOut() {
    this.keycloak.logout('');
  }

  async loadUserProfile(): Promise<void> {


    return this.keycloak.loadUserProfile(false).then(info => {
      const firstName = info.firstName;
      const lastName = info.lastName;
      const userName = info.username;
      const email = info.email;
      const role = this.formBuilderRoles.find(role => this.keycloak.isUserInRole(role));
      const userProfile: UserProfile = {
        userName,
        firstName,
        lastName,
        role: role ? role : this.readonlyRole,
        email
      };
      this.userProfile = userProfile;

    }).catch(reason => {
      console.log('reason:: ', reason);
      this.userProfile = null;
    });

  }

  loadAdminProfile() {
    const userProfile: UserProfile = {role: this.adminRole};
    this.userProfile = userProfile;
  }

  hasReadOnlyRole() {
    return this.userProfile?.role === this.readonlyRole;
  }

  hasAdminRole() {
    return this.userProfile?.role === this.adminRole;
  }

}
