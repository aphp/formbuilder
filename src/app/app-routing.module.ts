import {RouterModule, Routes} from "@angular/router";
import {AppComponent} from "./app.component";
import {AuthGuard} from "./guard/auth.guard";
import {NgModule} from "@angular/core";
import {environment} from "../environments/environment";

// @ts-ignore
const canActivate = window.Cypress || !environment?.keycloakConfig?.url ? [] : [AuthGuard]

const routes: Routes = [
  {path: '', component: AppComponent, canActivate}
];

@NgModule({
  declarations: [],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
