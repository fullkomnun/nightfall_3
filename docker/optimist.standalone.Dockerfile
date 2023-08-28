# syntax=docker/dockerfile:1.2

ARG NODE_VERSION
ARG DEBIAN_RELEASE

FROM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim as builder

# install node
RUN apt-get update
# TEMPORARY WORKAROUND FOR ISSUE https://github.com/nodesource/distributions/issues/1266
RUN apt-get install -y ca-certificates
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs gcc g++ make
RUN apt-get install -y netcat

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
RUN npm ci

WORKDIR /app
RUN mkdir /app/mongodb
COPY nightfall-optimist/src src
COPY nightfall-optimist/docker-entrypoint.standalone.sh ./docker-entrypoint.sh
COPY nightfall-optimist/package*.json  ./

RUN npm ci

CMD ["npm", "start"]