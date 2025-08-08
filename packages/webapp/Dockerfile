#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder

# Define o diretório de trabalho principal para o monorepo
WORKDIR /app

# Instala as dependências do sistema (Python e Git)
RUN apk add --no-cache python3 py3-pip make g++ git

# --- LÓGICA DE DADOS (PYTHON) ---

# Copia os requisitos do Python primeiro
COPY ../data-worker/requirements.txt /app/data-worker/requirements.txt

# Instala as dependências Python
RUN python3 -m pip install -r /app/data-worker/requirements.txt

# --- LÓGICA DA APLICAÇÃO (NODE.JS) ---

# Copia os package.json para instalar dependências Node
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copia o resto do código de ambas as pastas
COPY . .
COPY ../data-worker ./data-worker

# ==================================================================
# AGORA EXECUTAMOS TUDO NA ORDEM CERTA
# ==================================================================
# 1. Executa o script Python completo para criar e popular o datahub.db
#    dentro da pasta /public, onde o build do Astro o vai encontrar.
RUN python3 /app/data-worker/update_all.py

# 2. Agora o build do Astro pode correr com a DB já pronta
RUN npm run build

#############################################
# ESTÁGIO 2 — RUNTIME (Node)                #
#############################################
FROM node:20-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 8080

EXPOSE 8080

# Copia apenas o que é necessário do estágio de build
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/public/        ./public/
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package*.json  ./

# Arrancar servidor Astro
CMD ["node", "dist/server/entry.mjs"]