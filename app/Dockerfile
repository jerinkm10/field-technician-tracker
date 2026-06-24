FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/app-config.template.js /etc/nginx/templates/app-config.template.js
COPY docker/40-generate-app-config.sh /docker-entrypoint.d/40-generate-app-config.sh
COPY --from=build /usr/src/app/dist/field-technician-tracker-admin/browser /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-generate-app-config.sh

EXPOSE 80
