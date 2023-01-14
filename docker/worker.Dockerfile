FROM ghcr.io/fullkomnun/local-circom

# 'node-gyp' requires 'python3', 'make' and 'g++''
# entrypoint script requires 'netcat'
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 80

WORKDIR /
COPY common-files common-files
WORKDIR /common-files
RUN npm ci --only=production --no-audit
RUN npm link

WORKDIR /app
COPY config/default.js config/default.js
COPY /nightfall-deployer/circuits circuits
COPY ./worker/package.json ./worker/package-lock.json ./
COPY ./worker/start-script ./start-script
COPY ./worker/start-dev ./start-dev
RUN npm ci --no-audit && npm cache clean --force
COPY ./worker/src ./src

COPY common-files/classes node_modules/@polygon-nightfall/common-files/classes
COPY common-files/utils node_modules/@polygon-nightfall/common-files/utils
COPY common-files/constants node_modules/@polygon-nightfall/common-files/constants

CMD ["npm", "start"]
