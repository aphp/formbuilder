import {KeycloakService} from "keycloak-angular";
import {environment} from "../../environments/environment";

export function initializeKeycloak(
  keycloak: KeycloakService
) {
  return () =>
    keycloak.init({
      config: {
        // @ts-ignore
        url: environment?.keycloakConfig?.url,
        // @ts-ignore
        realm: environment?.keycloakConfig?.realm,
        // @ts-ignore
        clientId: environment?.keycloakConfig?.clientId,
      },
      initOptions: {
        onLoad: 'check-sso',
        // @ts-ignore
        redirectUri: environment?.keycloakConfig?.redirectUri,
        pkceMethod: 'S256',
        scope: 'openid profile roles'
      },
      enableBearerInterceptor: false

    });
}
