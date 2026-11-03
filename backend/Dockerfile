FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 3001
CMD ["sh", "-c", "if [ \"${DATABASE_MIGRATION_MODE:-migrate}\" = \"baseline\" ]; then npx prisma db push --skip-generate; else npx prisma migrate deploy; fi && npm run start:prod"]
