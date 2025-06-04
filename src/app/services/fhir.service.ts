import {Injectable} from '@angular/core';
import Client from 'fhirclient/lib/Client';
import * as FHIR from 'fhirclient';
import {defer, from, Observable} from 'rxjs';
import fhir, {FhirResource, ParametersParameter} from 'fhir/r4';
import {fhirPrimitives} from '../fhir';
import {environment} from '../../environments/environment';
import {v4 as uuidv4} from 'uuid';
import {Util} from '../lib/util';
import {AuthService} from "./auth.service";

export interface FHIRServer {
  // resultsOffset: number;
  // pageSize: number;
  id?: number;
  displayName?: string;
  endpoint: fhirPrimitives.url;
  desc?: string;
  version?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FhirService {

  fhirServerList: FHIRServer[] = [
    {
      id: 1,
      displayName: 'APHP HAPI FHIR Server - R4 ',
      endpoint: environment.hapiServerUrl,
      desc: 'APHP HAPI FHIR Server (R4 Resources)',
      version: 'R4'
    }
  ];
  currentServer: FHIRServer;
  smartClient: Client;

  constructor(private authService: AuthService) {
    //this.smartClient = FHIR.client(window.location.href+'fhir-api');
    this.setFhirServer(this.fhirServerList[0]);
  }

  private async prepareAndExecuteRequest<T>(options: any): Promise<any> {
    let headers = {
      ...options.headers,
      'Content-Type': 'application/fhir+json',
    };
    // @ts-ignore
    if (environment?.keycloakConfig) {
      const token = await this.authService.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.error('keycloak token is undefined!');
      }
    }
    options.headers = headers
    return this.smartClient.request<any>(options);
  }

  /**
   * Creates a resource on the fhir server, assigning publisher field from the user profile.
   *
   * @param resource - A string representation of fhir resource or fhir resource object.
   * @param userProfile - User's login profile.
   * @returns - An http promise
   */
  create(resource: fhir.Resource, userProfile): Observable<fhir.Resource> {
    let res = typeof resource === 'string' ? JSON.parse(resource) : resource;

    if (resource?.resourceType === 'Questionnaire') {
      res.id = Util.sanitizeString(res.name);
    }
    this.assignPublisher(res, userProfile);
    res = JSON.stringify(resource);

    try {
      let options: any = {
        method: 'PUT',
        body: res
      }
      if (typeof resource !== 'string') {
        options = {...options, url: `${resource?.resourceType}/${resource?.id}`};
      }
      const request = this.prepareAndExecuteRequest(options);
      return this.promiseToObservable(request);
    } catch (reason) {
      console.error("Create failed", reason);
    }
  };


  postValueSets(resources: fhir.ValueSet[], codesForDeletion: string []): Observable<fhir.Resource> {

    const entry: fhir.BundleEntry[] = []
    codesForDeletion?.forEach(code => {
      const patchRequest: fhir.BundleEntryRequest = {
        method: "PATCH",
        url: `ValueSet/${code}`
      }

      const op: ParametersParameter = {name: "type", valueCode: "replace"};
      const path: ParametersParameter = {name: "path", valueString: "ValueSet.status"};
      const value: ParametersParameter = {name: "value", valueString: "retired"};
      const parametersParameter: ParametersParameter = {name: "operation", part: [op, path, value]};
      const parameter: ParametersParameter[] = [parametersParameter];
      const resource: fhir.Parameters = {resourceType: "Parameters", parameter};
      entry.push({request: patchRequest, resource})
    })
    resources?.forEach(resource => {
      const request: fhir.BundleEntryRequest = {method: 'PUT', url: `ValueSet/${resource.id}`}
      entry.push({resource, request});
    })

    const bundle: fhir.Bundle = {entry, resourceType: "Bundle", type: 'transaction'};
    const res = JSON.stringify(bundle);
    const request = this.prepareAndExecuteRequest({
      method: 'POST',
      url: `${environment.hapiServerUrl}`,
      body: res
    });
    return this.promiseToObservable(request);
  };


  postWithBundle(resources: FhirResource[]): Observable<fhir.Resource> {

    const entry: fhir.BundleEntry[] = []
    resources?.forEach(resource => {
      const request: fhir.BundleEntryRequest = {method: 'PUT', url: `CodeSystem/${resource.id}`}
      entry.push({resource, request});
    })

    const bundle: fhir.Bundle = {entry, resourceType: "Bundle", type: 'transaction'};
    const res = JSON.stringify(bundle);
    const request = this.prepareAndExecuteRequest({
      method: 'POST',
      url: `${environment.hapiServerUrl}`,
      body: res
    });
    return this.promiseToObservable(request);
  };

  /**
   * Creates a resource on the fhir server.
   *
   * @param resource - A string representation of fhir resource or fhir resource object.
   * @param userProfile - User's login profile.
   * @returns - An http promise
   */
  update(resource: fhir.Resource | string, userProfile): Observable<fhir.Resource> {
    this.assignPublisher(resource, userProfile);
    let options: any = {
      method: 'PUT',
      body: JSON.stringify(resource)
    }
    if (typeof resource !== 'string') {
      options = {...options, url: `${resource?.resourceType}/${resource?.id}`};
    }
    const request = this.prepareAndExecuteRequest(options);
    return this.promiseToObservable(request);
  };

  async validate(resource: FhirResource): Promise<fhir.Resource | any> {


    const resourceParameter: ParametersParameter = {name: 'resource', resource};
    const parameter: ParametersParameter [] = [resourceParameter]
    const params: fhir.Parameters = {resourceType: 'Parameters', parameter};
    const res = JSON.stringify(params);
    try {
      const result = await this.prepareAndExecuteRequest<FhirResource>({
        method: 'POST',
        url: `${resource?.resourceType}/$validate?_format=application/fhir+json`,
        body: res
      });
      return result;
    } catch (reason) {
      console.log(reason);
      return {statusCode: reason.statusCode, message: reason.message};
    }
  };

  /**
   * Read a questionnaire fhir resource.
   * @param id - Id of the resource.
   * @returns - An http promise
   */
  read(id): Observable<fhir.Resource> {
    const promise = this.prepareAndExecuteRequest({
      url: 'Questionnaire/' + id + '/_history?_format=application/fhir+json'
    }).then(history => {
        if (history.entry && history.entry.length > 0) {
          const lastQuestionnaireVersionFromHistory = history.entry.reduce((max, current) => {
            return (parseInt(max.resource.meta.versionId, 10) > parseInt(current.resource.meta.versionId, 10)) ? max : current;
          });
          return lastQuestionnaireVersionFromHistory.resource;
        }
      }
    ).catch(reason => {
        console.log(reason);
        return null;
      }
    );
    return this.promiseToObservable(promise);
  };


  /**
   * Delete a questionnaire fhir resource.
   *
   * @param id - Id of the resource.
   * @returns - An http promise
   */
  delete(id): Observable<any> {
    return this.promiseToObservable(this.smartClient.delete('Questionnaire/' + id));
  };


  /**
   *
   * @param fhirResourceType - The fhir resource type: Questionnaire/ ValueSet
   * @param searchStr - A search term to search FHIR resources
   * @param searchField - Field to search, should be a valid searchable field. Refer to FHIR REST API for list of fields.
   * @param otherQueryParams? - (Optional) Any additional or overriding query parameters to send to FHIR server.
   * @returns Http promise
   */
  search(fhirResourceType: string, searchStr: string, searchField?: string, otherQueryParams?: any): Observable<fhir.Bundle> {
    const query = {_sort: ['-_lastUpdated'], _total: 'accurate', _format: 'application/fhir+json'};
    Object.assign(query, otherQueryParams);

    if (!searchField) {
      searchField = '_content';
    }

    if (searchStr) {
      // query[searchField+':contains'] = searchStr;
      query[searchField] = searchStr;
    }
    const headers = {
      'Cache-Control': 'no-cache'
    }
    return this.promiseToObservable(this.prepareAndExecuteRequest({
      url: fhirResourceType + '?' + this.queryToString(query), headers
    }));
  };


  /**
   * Get FHIR results using a url. The paginated results are obtained using a url in the result bundle
   * @param url - The URL referring to the resource bundle on the FHIR server.
   * @returns - FHIR resource bundle
   */
  getBundleByUrl(url: fhirPrimitives.url): Observable<fhir.Bundle> {
    return this.promiseToObservable(this.smartClient.request(url));
  };

  /**
   * Get FHIR pagination results using a current bundle. The paginated results are
   * obtained using a url in the current results bundle
   *
   * @param bundle - The FHIR bundle from which to extract the relation url.
   * @param relation - A string specifying the relation ('prev' | 'next')
   * @returns - FHIR resource bundle
   */
  getPage(bundle, relation): Observable<fhir.Bundle> {
    let url;
    if (relation === 'prev' || relation === 'previous') {
      url = bundle.link.prev || bundle.link.previous; // prev and previous are synonymous
    } else {
      url = bundle.link[relation];
    }

    return this.getBundleByUrl(url);
  };


  /**
   * Set fhir server headers
   *
   * @param fhirServer - fhirServer object. See dataConstants.fhirServerList for its definition.
   */
  setFhirServer(fhirServer: FHIRServer): void {
    this.currentServer = fhirServer;
    this.smartClient = FHIR.client(this.currentServer.endpoint);
  };

  getFhirServer(): FHIRServer {
    return this.currentServer;
  }

  /**
   * If publisher is specified, assign one by creating one from user profile, if exists.
   *
   * @param resource - FHIR resource object.
   * @param userProfile - User's login profile
   * @returns - a
   */
  assignPublisher(resource, userProfile): void {
    if (resource && !resource.publisher && userProfile) {
      if (userProfile.displayName) {
        let pubName = userProfile.displayName;
        if (userProfile.email) {
          pubName += '; ' + userProfile.email;
        }
        resource.publisher = pubName;
      }
    }
  }

  queryToString(obj: any): string {
    let ret: string = null;
    if (obj) {
      ret = Object.entries(obj).map(([k, v]) => {
        if (Array.isArray(v)) {
          v = (v as Array<string>).join(',');
        }
        return encodeURI(k) + '=' + encodeURI(v as string);
      }).join('&');
    }
    return ret;
  }

  promiseToObservable<T>(promise: Promise<T>): Observable<T> {
    return defer(() => from(promise));
  }

  getSmartClient(): Client {
    return this.smartClient;
  }

}
