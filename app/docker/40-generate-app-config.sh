#!/bin/sh
set -eu

: "${APP_API_BASE_URL:=/api}"
: "${APP_SOCKET_URL:=}"
: "${APP_GOOGLE_MAPS_API_KEY:=}"

envsubst '${APP_API_BASE_URL} ${APP_SOCKET_URL} ${APP_GOOGLE_MAPS_API_KEY}' \
  < /etc/nginx/templates/app-config.template.js \
  > /usr/share/nginx/html/app-config.js
