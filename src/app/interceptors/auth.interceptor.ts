import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {from, Observable} from 'rxjs';
import {AuthService} from "../services/auth.service";
import {environment} from "../../environments/environment";
import {catchError, switchMap} from "rxjs/operators";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.authService.getToken()).pipe(
      switchMap((token) => {
        const newReq = this.addAuthToken(request, token);
        return next.handle(newReq);
      }),
      catchError((error) => {
        console.error('Error in token retrieval', error);
        return next.handle(request);
      })
    );
  }

  addAuthToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    if (token && request.url.includes(environment.hapiServerUrl)) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return request;
  }

}
