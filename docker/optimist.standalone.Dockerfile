FROM node:16.17-bullseye-slim

# 'node-gyp' requires 'python3', 'make' and 'g++''
# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

ARG OPTIMIST_PORT=80
ARG OPTIMIST_WS_PORT=8080

EXPOSE ${OPTIMIST_PORT}
# websocket port 8080
EXPOSE ${OPTIMIST_WS_PORT}

ENTRYPOINT ["/app/docker-entrypoint.sh"]

WORKDIR /
COPY common-files common-files
COPY config/default.js app/config/default.js

WORKDIR /common-files
RUN npm ci --only=production --no-audit
RUN npm link

WORKDIR /app
RUN mkdir /app/mongodb
COPY nightfall-optimist/docker-entrypoint.standalone.sh ./docker-entrypoint.sh
COPY nightfall-optimist/package*.json  ./
RUN npm ci --no-audit && npm cache clean --force
COPY nightfall-optimist/src src

COPY common-files/classes node_modules/@polygon-nightfall/common-files/classes
COPY common-files/utils node_modules/@polygon-nightfall/common-files/utils
COPY common-files/constants node_modules/@polygon-nightfall/common-files/constants

CMD ["npm", "start"]