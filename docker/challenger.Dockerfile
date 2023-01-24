FROM node:16.17-bullseye-slim as builder

# 'node-gyp' requires 'python3', 'make' and 'g++''
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY common-files common-files

COPY cli cli
WORKDIR /cli
RUN npm ci --install-links --no-audit --omit=dev

WORKDIR /app
COPY apps/challenger/package*.json ./
RUN npm ci --install-links --no-audit && npm cache clean --force

FROM node:16.17-bullseye-slim

# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /cli ./cli/
COPY apps/challenger/docker-entrypoint.sh apps/challenger/package*.json ./
COPY apps/challenger/src src
COPY config/default.js config/default.js

CMD ["npm", "start"]