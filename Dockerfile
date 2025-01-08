### Stage 1: Build ###
FROM node:18-bullseye-slim AS build

RUN groupadd -r appgroup && useradd -r -g appgroup -d /usr/src/app -s /sbin/nologin appuser


WORKDIR /usr/src/app



COPY package.json /usr/src/app/package.json
COPY package-lock.json /usr/src/app/package-lock.json
COPY tsconfig.json /usr/src/app/tsconfig.json
COPY tsconfig.app.json /usr/src/app/tsconfig.app.json
COPY angular.json /usr/src/app/angular.json
COPY src /usr/src/app/src
COPY bin/copy-lforms.js /usr/src/app/bin/copy-lforms.js

# Set ownership and permissions before running npm install
RUN chown -R appuser:appgroup /usr/src/app
RUN chmod -R 755 /usr/src/app
USER appuser

# Install dependencies and build
RUN npm install --ignore-scripts && npm run build

### Stage 2: Run ###
FROM nginx:stable-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
## Copy default nginx config
COPY ./nginx/default.conf /etc/nginx/nginx.conf
## Copy the artifacts in dist folder to default nginx public folder
COPY --from=build /usr/src/app/dist/aphp-formbuilder /usr/share/nginx/html

RUN chown -R appuser:appgroup /usr/share/nginx/html

WORKDIR /app
USER appuser
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

