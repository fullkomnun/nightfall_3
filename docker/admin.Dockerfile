FROM node:16.17-bullseye-slim

# 'node-gyp' requires 'python3', 'make' and 'g++''
# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/app/admin/docker-entrypoint.sh"]

WORKDIR /app
COPY common-files common-files
COPY cli cli

WORKDIR /app/common-files
RUN npm ci
RUN npm link


WORKDIR /app/cli
RUN npm ci

WORKDIR /app/admin
COPY config/default.js config/default.js
COPY nightfall-administrator/docker-entrypoint.sh nightfall-administrator/package*.json nightfall-administrator/admin ./
RUN npm ci && npm cache clean --force
COPY nightfall-administrator/src src

COPY common-files/classes node_modules/@polygon-nightfall/common-files/classes
COPY common-files/utils node_modules/@polygon-nightfall/common-files/utils
COPY common-files/constants node_modules/@polygon-nightfall/common-files/constants

CMD ["sleep", "infinity"]
