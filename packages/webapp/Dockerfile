#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências de sistema para build
RUN apk add --no-cache python3 py3-pip make g++ git

# --- LÓGICA DE DADOS (PYTHON) ---
# Requisitos do Python
COPY packages/data-worker/requirements.txt /app/data-worker/requirements.txt

# Ambiente virtual
RUN python3 -m venv /app/data-worker/.venv

# Usar o venv por omissão
ENV PATH="/app/data-worker/.venv/bin:$PATH"

# Instalar deps Python no venv
RUN pip install -r /app/data-worker/requirements.txt

# --- LÓGICA DA APLICAÇÃO (NODE.JS) ---
# Dependências Node
COPY packages/webapp/package*.json ./
RUN npm ci --legacy-peer-deps

# Código fonte
COPY packages/webapp .
COPY packages/data-worker ./data-worker

# ==================================================================
# EXECUTAR TUDO NA ORDEM CERTA
# ==================================================================

# 0) Garantir /app/data-worker no sys.path via .pth (para carregar sitecustomize.py)
RUN python - << 'PY'
import site, os
sp = site.getsitepackages()[0]
pth = os.path.join(sp, "dataworker.pth")
open(pth, "w").write("/app/data-worker")
print("Escrito:", pth)
PY

# 1) Criar DB e tabelas
RUN python /app/data-worker/init_db.py

# 2) Atualizar dados (scrapers)
RUN python /app/data-worker/update_all.py

# 3) Build do Astro com DB pronta
RUN npm run build

#############################################
# ESTÁGIO 2 — RUNTIME (Node)                #
#############################################
FROM node:20-alpine AS app
WORKDIR /app

# 👉 Necessário para healthchecks e debug
RUN apk add --no-cache curl sqlite

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# (Opcional) Healthcheck básico — muda a rota se tiveres /health
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8080/ || exit 1

# Copiar artefactos do build
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/public/        ./public/
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package*.json  ./

# Arrancar servidor Astro
CMD ["node", "dist/server/entry.mjs"]
