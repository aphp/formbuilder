// keycloak.service.ts
import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class KeycloakCustomService {

  constructor(private keycloak: KeycloakService, private http: HttpClient) { }

  getUserGroups(): Observable<any> {
    const keycloakInstance = this.keycloak.getKeycloakInstance();
    const userId = keycloakInstance.tokenParsed.sub;
    const realm = keycloakInstance.realm;
    const token = keycloakInstance.token;
    const url = `${environment.keycloakConfig.url}/admin/realms/${realm}/users/${userId}/groups`;

    return this.http.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
}
