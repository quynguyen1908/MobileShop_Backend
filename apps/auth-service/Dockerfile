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

RUN mkdir -p node_modules/.prisma/client
RUN npm run prisma:generate:all

RUN npm run build auth-service

FROM node:18-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY apps/auth-service/tsconfig.app.json ./apps/auth-service/tsconfig.app.json
RUN npm ci --include=dev
RUN npm install -g @nestjs/cli
COPY --from=build /app/dist/apps/auth-service ./dist
COPY --from=build /app/prisma/user ./prisma/user
CMD ["npm", "run", "start:dev"]

FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist/apps/auth-service ./dist
COPY --from=build /app/prisma/user ./prisma/user 

RUN apk add --no-cache curl jq

COPY --chown=nestjs:nodejs apps/auth-service/healthcheck.js ./healthcheck.js

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs && chown -R nestjs:nodejs /app
RUN rm -rf /tmp/* /var/cache/apk/*
USER nestjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node healthcheck.js

CMD ["node", "dist/main"]