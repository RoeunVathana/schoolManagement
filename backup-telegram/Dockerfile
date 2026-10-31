FROM node:20-alpine

RUN apk add --no-cache postgresql-client ca-certificates

WORKDIR /app
COPY backup.mjs ./backup.mjs

CMD ["node", "backup.mjs"]
