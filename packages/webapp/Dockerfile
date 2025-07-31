# --- ESTÁGIO 1: O Construtor (Builder) ---
FROM node:18-alpine AS builder
WORKDIR /app

# 1) Instalamos as dependências de compilação para node-gyp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig

# 2) Copiamos ficheiros de dependências e instalamos (legacy-peer-deps evita conflitos)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 3) Copiamos todo o código e geramos a build estática
COPY . .
RUN npm run build

# --- ESTÁGIO 2: O Servidor Final (Nginx) ---
FROM nginx:1.25-alpine

# Removemos a configuração default e copiamos a nossa
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiamos a saída do builder para o diretório servido pelo Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Porta exposta
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
