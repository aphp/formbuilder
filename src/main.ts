import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {AppModule} from './app/app.module';
import {environmentLoader as environmentLoaderPromise} from './environments/environmentLoader';
import {environment} from "./environments/environment";

environmentLoaderPromise.then(env => {

  environment.env = env.env;
  environment.production = env.production;
  environment.hapiServerUrl = env.hapiServerUrl;
  environment.igFormBuilderUrl = env.igFormBuilderUrl;

  if(env.keycloakConfig){
    // @ts-ignore
    environment.keycloakConfig = env.keycloakConfig;
  }

  if (environment.production) {
    enableProdMode();
  }



  platformBrowserDynamic().bootstrapModule(AppModule).catch(err => {
    console.error(err);
  });
});
