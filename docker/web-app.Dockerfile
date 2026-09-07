FROM node:24-alpine AS build

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /src
COPY package.json package-lock.json ./
COPY web/supplier/package.json web/supplier/package.json
RUN npm ci

COPY web ./web
COPY scripts ./scripts

ARG WORKSPACE=@commerce/supplier-web
RUN npm run build --workspace ${WORKSPACE}

# Supplier dashboard runtime.
FROM node:24-alpine AS supplier

ENV NODE_ENV=production \
    PORT=5175 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build --chown=node:node /src/web/supplier/dist ./dist
COPY --from=build --chown=node:node /src/web/supplier/server.js ./server.js

USER node

EXPOSE 5175

CMD ["node", "server.js"]
