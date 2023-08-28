# syntax=docker/dockerfile:1.2

ARG NODE_VERSION
ARG DEBIAN_RELEASE

FROM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim as builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    md5deep \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit && npm cache clean --force
COPY src src
COPY entrypoint.sh ./

EXPOSE 80 9229

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["npm", "start"]
