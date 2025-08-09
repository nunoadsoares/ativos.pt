#############################################
# ESTÁGIO 1 — BUILD (só Node, usa BD do host)
#############################################
FROM node:20-alpine AS builder
WORKDIR /app

# Só precisas de git para o build do Node
RUN apk add --no-cache git

# Instalar deps
COPY packages/webapp/package*.json /app/
RUN npm ci --legacy-peer-deps

# Copiar a app (INCLUI a BD do host em public/)
COPY packages/webapp /app/

# Compatibilidade: alguns imports procuram /packages/webapp/public/datahub.db
# Mapeamos para o que temos em /app/public/datahub.db
RUN mkdir -p /packages/webapp/public \
 && ln -sf /app/public/datahub.db /packages/webapp/public/datahub.db

# O código do Node lê também por esta env (se usado)
ENV DATAHUB_DB_PATH=/app/public/datahub.db

# Build do Astro (vai ler a BD já copiada)
RUN npm run build

#############################################
# ESTÁGIO 2 — RUNTIME
#############################################
FROM node:20-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DATAHUB_DB_PATH=/app/public/datahub.db

RUN apk add --no-cache curl sqlite

# Artefactos
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/public/        ./public/
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package*.json  ./

# Symlinks de compatibilidade (se algum módulo legacy usar estes caminhos)
RUN mkdir -p /app/webapp/public && ln -sf /app/public/datahub.db /app/webapp/public/datahub.db \
 && mkdir -p /packages/webapp/public && ln -sf /app/public/datahub.db /packages/webapp/public/datahub.db

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT}/api/health" || curl -fsS "http://localhost:${PORT}/" || exit 1

CMD ["node", "dist/server/entry.mjs"]
