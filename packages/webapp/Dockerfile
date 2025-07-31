# --- ESTÁGIO 1: O Construtor (Builder) ---
# Usamos uma imagem oficial do Node.js para construir o nosso site
FROM node:18-alpine AS builder

# Definimos o diretório de trabalho dentro do contentor
WORKDIR /app

# Copiamos os ficheiros de dependências e instalamos (ignorando conflitos de peer-deps)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiamos o resto do código do nosso site
COPY . .

# Executamos o comando de build do Astro para gerar os ficheiros estáticos
# O resultado será colocado na pasta /app/dist/
RUN npm run build

# --- ESTÁGIO 2: O Servidor Final (Nginx) ---
# Começamos com uma imagem oficial e leve do Nginx
FROM nginx:1.25-alpine

# Removemos a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos a nossa configuração personalizada (do Passo 1) para o sítio certo
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiamos os ficheiros estáticos (a pasta 'dist') gerados no builder
# para a pasta que o Nginx serve ao público
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor a porta 80 para o exterior
EXPOSE 80

# O comando que o Nginx executa quando o contentor arranca
CMD ["nginx", "-g", "daemon off;"]
