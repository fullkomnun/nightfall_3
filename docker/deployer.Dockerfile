FROM node:16.17-bullseye-slim as builder

# 'node-gyp' requires 'python3', 'make' and 'g++''
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY common-files common-files

WORKDIR /app
COPY nightfall-deployer/package*.json ./
RUN npm ci --install-links --no-audit && npm cache clean --force

FROM node:16.17-bullseye-slim

# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/app/entrypoint.sh"]

WORKDIR /app
COPY /nightfall-deployer/circuits circuits
COPY --from=builder /app/node_modules ./node_modules/
COPY nightfall-deployer/entrypoint.sh nightfall-deployer/package*.json ./
COPY nightfall-deployer/src src
COPY nightfall-deployer/contracts contracts
COPY nightfall-deployer/migrations migrations
COPY nightfall-deployer/truffle-config.js truffle-config.js
COPY config/default.js config/default.js

CMD ["npm", "start"]