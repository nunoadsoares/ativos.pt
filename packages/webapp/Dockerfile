#############################################
# ESTÁGIO 1 — BUILD                         #
#############################################
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

# Instala dependências
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copia código e compila
COPY . .
RUN npm run build                

#############################################
# ESTÁGIO 2 — RUNTIME (Node)                #
#############################################
FROM node:20-alpine AS app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 8080

EXPOSE 8080

# Artefactos e dependências
COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/public/       ./public/     
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/package*.json ./

# Arrancar servidor Astro
CMD ["node", "dist/server/entry.mjs"]
