FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM dependencies AS security-scan
RUN npm audit --production --audit-level=high

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN mkdir -p node_modules/.prisma/client

RUN npm run prisma:generate:all
RUN npm run build payment-service

FROM node:18-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
COPY --from=build /app/dist/apps/payment-service ./dist/apps/payment-service
COPY --from=build /app/prisma ./prisma
RUN mkdir -p node_modules/.prisma/client
RUN npm run prisma:generate:all
CMD ["node", "dist/apps/payment-service/main.js"]

FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist/apps/payment-service ./dist/apps/payment-service
COPY --from=build /app/prisma ./prisma
RUN mkdir -p node_modules/.prisma/client
RUN npm run prisma:generate:all

COPY ./apps/payment-service/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN apk add --no-cache tini
RUN apk add --no-cache curl jq

COPY --chown=nestjs:nodejs apps/payment-service/healthcheck.js ./healthcheck.js

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs && chown -R nestjs:nodejs /app
RUN rm -rf /tmp/* /var/cache/apk/*
USER nestjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node healthcheck.js

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]