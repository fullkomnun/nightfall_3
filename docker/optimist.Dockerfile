FROM node:16.17-bullseye-slim as builder

# 'node-gyp' requires 'python3', 'make' and 'g++''
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY common-files common-files

WORKDIR /app
COPY nightfall-optimist/package*.json ./
RUN npm ci --install-links --no-audit && npm cache clean --force

FROM node:16.17-bullseye-slim

# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 80 8080 9229

ENTRYPOINT ["/app/docker-entrypoint.sh"]

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules/
COPY nightfall-optimist/docker-entrypoint.sh nightfall-optimist/package*.json ./
COPY nightfall-optimist/src src
COPY config/default.js config/default.js

CMD ["npm", "start"]