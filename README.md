## Installation

### Quick Start (For Non-Technical Users)

#### Clone the Git repository

Clone the aphp-formbuilder repository to your local machine:

```
      git clone https://github.com/aphp/formbuilder.git
```

#### Set the Backend FHIR Server

To configure your backend FHIR server, edit the hapiServerUrl parameter in the file [environment.ts](src/environments/environment.ts).

By default, it is set to the public HAPI FHIR server: https://hapi.fhir.org/baseR4

#### Running the application

##### 1. With docker

+ Prerequisites:

  - Ensure you have Docker installed on your system. You can download Docker from https://www.docker.com/get-started.

  - Make sure the required ports are not in use by other applications.

+ Steps:

1. Build the Docker image:
```bash
      docker build -t formbuilder .
```
2. Run the Docker container:
```bash
      docker run -p 8080:8080 formbuilder
```
3. Access the application:
  - Open your web browser and navigate to http://localhost:8080 (or replace with the correct port if changed) to access the application.

##### 2. Start formbuilder server for local development (Alternative way to run the application)

For local development, run the server as follows:

+ Prerequisites:
  - Install Node.js (if not already installed) from [nodejs.org] (https://nodejs.org/fr).
  - Install the Angular CLI globally (if not already installed)
    ```bash
        npm install -g @angular/cli@17.3.9
    ```

+ Steps:

1. Install project dependencies:

```bash
    npm install
```

2. Remove the existing ./src/lib/lforms directory:

for Linux:

```bash
      rm -rf ./src/lib/lforms 
```

for Windows:

```bash
      Remove-Item -Path "src\lib\lforms" -Recurse -Force
```

3. Run the copy script:

```bash
node ./bin/copy-lforms.js
```

4. Serve the application locally:

```bash
ng serve --port 9032 --configuration development
```
5. Access the application:
- Open your web browser and navigate to http://localhost:9032 to access the application.
### Advanced Configuration & Tips (For Developers & Technical Users)

#### Build the package for production

Build the production package and copy it to your web server's document location:

+ Prerequisites:
  - Install **nodejs** package globally on your system.

```
      npm run build
      cp dist/aphp-formbuilder {webserver docs location}
```

#### About copy-lforms.js

The script [copy-lforms.js](bin/copy-lforms.js) is responsible for copying build files for LForms from the LForms website: https://lhcforms-static.nlm.nih.gov/lforms-versions.

To update the LForms library, you need to modify the  **lformsVersion**  variable in [version.json](src/assets/version.json) and execute the following command: `node ./bin/copy-lforms.js`
This will download the files locally.

#### Customizing with ngx-item.schema.json

The file [ngx-item.schema.json](src/assets/ngx-item.schema.json) allows you to add new fields to the FormBuilder.
This schema defines the structure of form data that can be customized or extended according to the application's requirements.

#### Activating Keycloak for SSO

To activate Keycloak and use Single Sign-On (SSO), simply enter the appropriate configuration in the environment file:

```yaml
keycloakConfig: {
  url: 'XXXX',
  realm: 'XXXX',
  clientId: 'XXXX',
}
```

If the environment file does not contain this configuration (keycloakConfig), the SSO will not be used, and the user will not be authenticated.

#### Loading Configuration at Runtime

An external configuration is used in Kubernetes via a ConfigMap.

In the Deployment file, the ConfigMap is mounted to a specific directory, for example:

```yaml
volumes:
  - name: env-consts-config
    configMap:
      name: formbuilder-dev

volumeMounts:
  - name: env-consts-config
    mountPath: "/usr/share/nginx/html/config/config.json"
    subPath: config.json
    readOnly: true
```

The configuration will be dynamically loaded at runtime using an environment loader approach. This is done by the [environmentLoader.ts](src/environments/environmentLoader.ts) which reads the config.json.

This file is mounted into the container from the Kubernetes ConfigMap at the path ./config/config.json during [the application startup](src/main.ts)

This strategy enables maintaining a single Docker image for multiple environments while adapting the application's behavior based on the environment parameters.
