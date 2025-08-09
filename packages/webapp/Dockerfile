#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências de sistema para build
RUN apk add --no-cache python3 py3-pip make g++ git

# --- PYTHON (data-worker) ---
COPY packages/data-worker/requirements.txt /app/data-worker/requirements.txt

# venv do worker
RUN python3 -m venv /app/data-worker/.venv
ENV PATH="/app/data-worker/.venv/bin:${PATH}"

# Instalar deps Python
RUN pip install -r /app/data-worker/requirements.txt

# --- NODE (webapp) ---
COPY packages/webapp/package*.json /app/
RUN npm ci --legacy-peer-deps

# Código fonte
COPY packages/webapp /app/
COPY packages/data-worker /app/data-worker

# Pasta public que vai conter a DB
RUN mkdir -p /app/public

# Variável de ambiente comum aos scripts Python e ao Node
ENV DATAHUB_DB_PATH=/app/public/datahub.db

# 0) Garantir que /app/data-worker entra no sys.path via .pth (para sitecustomize/config)
RUN python - << 'PY'
import site, os
sp = site.getsitepackages()[0]
pth = os.path.join(sp, "dataworker.pth")
open(pth, "w").write("/app/data-worker")
print("Escrito:", pth)
PY

# 1) Criar DB e tabelas
RUN python /app/data-worker/init_db.py

# 2) Atualizar todos os dados (preenche historical_series e key_indicators)
RUN python /app/data-worker/update_all.py

# 3) Build do Astro com a DB pronta
RUN npm run build

#############################################
# ESTÁGIO 2 — RUNTIME (Node)                #
#############################################
FROM node:20-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Mantemos o caminho da DB consistente também no runtime
ENV DATAHUB_DB_PATH=/app/public/datahub.db

# Precisamos de curl + sqlite no runtime (healthcheck e debug)
RUN apk add --no-cache curl sqlite

# Copiar artefactos do build
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/public/        ./public/
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package*.json  ./

# (Opcional mas útil) symlink caso algum código legacy procure /app/webapp/public
RUN mkdir -p /app/webapp/public && ln -sf /app/public/datahub.db /app/webapp/public/datahub.db

EXPOSE 8080

# HEALTHCHECK simples: responde 200 em /health (ou /)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT}/api/health" || curl -fsS "http://localhost:${PORT}/" || exit 1

# Arrancar servidor Astro
CMD ["node", "dist/server/entry.mjs"]
