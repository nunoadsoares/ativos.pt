#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Instala as dependências do sistema
RUN apk add --no-cache python3 py3-pip make g++ git

# --- LÓGICA DE DADOS (PYTHON) ---
# Copia os requisitos do Python
COPY packages/data-worker/requirements.txt /app/data-worker/requirements.txt

# ==================================================================
# ALTERAÇÃO: Cria e ativa um ambiente virtual para o Python
# ==================================================================
# Cria o ambiente virtual na pasta do worker
RUN python3 -m venv /app/data-worker/.venv

# Define o caminho para o executável do pip dentro do venv
ENV PATH="/app/data-worker/.venv/bin:$PATH"

# Instala as dependências Python DENTRO do ambiente virtual
RUN pip install -r /app/data-worker/requirements.txt
# ==================================================================


# --- LÓGICA DA APLICAÇÃO (NODE.JS) ---
# Copia e instala as dependências Node
COPY packages/webapp/package*.json ./
RUN npm ci --legacy-peer-deps

# Copia o código fonte de ambas as pastas
COPY packages/webapp .
COPY packages/data-worker ./data-worker

# ==================================================================
# EXECUTAR TUDO NA ORDEM CERTA
# ==================================================================
# 1. Executa o script Python para criar e popular o datahub.db
#    O comando `python` agora aponta para o do nosso venv por causa do ENV PATH acima
RUN python /app/data-worker/update_all.py

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