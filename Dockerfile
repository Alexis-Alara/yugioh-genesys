# Etapa de build
FROM node:18 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -g typescript
RUN npm install

COPY . .

# Ajusta permisos
RUN chmod -R 755 /app

# Build con npx (usa la versión local)
RUN npx tsc
RUN npx vite build

# Etapa de producción con Nginx
FROM nginx:alpine

# Crear configuración de Nginx
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
        index index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copiar archivos de la build
COPY --from=build /app/dist /usr/share/nginx/html

# Asegurar permisos correctos
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

