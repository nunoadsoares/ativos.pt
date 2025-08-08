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

# Cria o ambiente virtual na pasta do worker
RUN python3 -m venv /app/data-worker/.venv

# Define o caminho para o executável do pip/python dentro do venv
ENV PATH="/app/data-worker/.venv/bin:$PATH"

# Instala as dependências Python DENTRO do ambiente virtual
RUN pip install -r /app/data-worker/requirements.txt

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

# 0) Garante que /app/data-worker está no sys.path via .pth
#    Isto faz o Python carregar automaticamente o sitecustomize.py
RUN python - << 'PY'
import site, os
sp = site.getsitepackages()[0]
pth = os.path.join(sp, "dataworker.pth")
open(pth, "w").write("/app/data-worker")
print("Escrito:", pth)
PY

# 1) Cria a DB e as tabelas (usa os paths injetados pelo sitecustomize)
RUN python /app/data-worker/init_db.py

# 2) Atualiza todos os dados (scripts continuam a usar "from config import ...")
RUN python /app/data-worker/update_all.py

# 3) Agora o build do Astro corre com a DB já pronta
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
