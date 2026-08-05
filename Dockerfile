# Dockerfile pour le déploiement de DIGICAB ML sur VPS / Coolify / Hostinger
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances de compilation pour better-sqlite3
RUN apk add --no-cache python3 make g++ gcc sqlite

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/database.db

# Outils runtime et SQLite
RUN apk add --no-cache python3 make g++ gcc sqlite

COPY package*.json ./
RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

# Dossier pour la base de données persistante
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
