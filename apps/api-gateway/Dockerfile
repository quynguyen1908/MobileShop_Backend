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
RUN npm run build api-gateway

FROM node:18-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
COPY --from=build /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=build /app/prisma ./prisma
RUN mkdir -p node_modules/.prisma/client
RUN npm run prisma:generate:all
CMD ["node", "dist/apps/api-gateway/main.js"]

FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=build /app/prisma ./prisma
RUN mkdir -p node_modules/.prisma/client
RUN npm run prisma:generate:all

COPY ./apps/api-gateway/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN apk add --no-cache tini

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs && chown -R nestjs:nodejs /app
RUN rm -rf /tmp/* /var/cache/apk/*
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]