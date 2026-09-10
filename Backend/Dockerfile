# Backend — Elemental Battle Cards
# Node 20 (slim/debian) para que sqlite3 use binarios precompilados sin toolchain.
FROM node:20-slim

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci --omit=dev

# Código (se excluye .env y la base de datos vía .dockerignore)
COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]