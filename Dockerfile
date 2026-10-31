FROM node:20-alpine AS backend-build

WORKDIR /build/backend

RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend ./
RUN npm run build

FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache nginx openssl

WORKDIR /app/backend

COPY --from=backend-build /build/backend/package*.json ./
COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/prisma ./prisma
COPY --from=backend-build /build/backend/dist ./dist

COPY --from=frontend-build /build/frontend/dist /usr/share/nginx/html
COPY frontend/nginx-root.conf /etc/nginx/nginx.conf
COPY railway-start.sh /app/railway-start.sh

EXPOSE 80 3001

CMD ["sh", "/app/railway-start.sh"]
