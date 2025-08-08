#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder
WORKDIR /app

# Instala as dependências do sistema (Python para os nossos scripts)
RUN apk add --no-cache python3 make g++

# Instala dependências Node.js
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ==================================================================
# ALTERAÇÃO: Inicializa a base de dados ANTES do build
# ==================================================================
# 1. Copia os scripts Python para uma pasta temporária
COPY ../data-worker /tmp/data-worker

# 2. Executa o script que cria o ficheiro datahub.db com as tabelas vazias
RUN python3 /tmp/data-worker/init_db.py
# ==================================================================

# Copia o resto do código da aplicação
COPY . .

# Agora o build pode correr, pois a base de dados já existe
RUN npm run build

#############################################
# ESTÁGIO 2 — RUNTIME (Node)                #
#############################################
FROM node:20-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 8080

EXPOSE 8080

# Artefactos e dependências do estágio de build
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/public/        ./public/
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package*.json  ./

# Arrancar servidor Astro
CMD ["node", "dist/server/entry.mjs"]