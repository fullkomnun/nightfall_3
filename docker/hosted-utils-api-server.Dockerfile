FROM node:16.17-bullseye-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    md5deep \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY src src
COPY entrypoint.sh ./

EXPOSE 80 9229

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["npm", "start"]
