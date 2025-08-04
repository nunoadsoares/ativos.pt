# --- ESTÁGIO 1: O Construtor (Builder) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar ferramentas de compilação necessárias para dependências nativas (caso sejam necessárias)
RUN apk add --no-cache python3 make g++

# Copiar apenas as dependências para permitir cache do Docker em builds futuros
COPY package*.json ./

# Instalação rápida (usa binários pre-build, mais rápido em Node 20)
RUN npm install --legacy-peer-deps

# Copia o resto do código da aplicação
COPY . .

# Build do site estático
RUN npm run build

# --- ESTÁGIO 2: O Servidor Final (Nginx) ---
FROM nginx:1.25-alpine

# Remover a configuração default do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração personalizada
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiar ficheiros estáticos gerados no builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor a porta 80
EXPOSE 80

# Comando de arranque
CMD ["nginx", "-g", "daemon off;"]