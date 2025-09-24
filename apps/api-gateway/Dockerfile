FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS security-scan
RUN npm audit --production --audit-level=high

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build api-gateway

FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist/apps/api-gateway ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs && chown -R nestjs:nodejs /app
RUN rm -rf /tmp/* /var/cache/apk/*
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "dist/main"]