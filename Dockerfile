# Etapa de build
FROM node:18 AS build
WORKDIR /app

# Instalar dependencias primero (mejor caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# Ajusta permisos
RUN chmod -R 755 /app

# Build optimizado
RUN npm install -g typescript
RUN npx tsc
RUN npx vite build --mode production

# Etapa de producción con Nginx
FROM nginx:alpine

# Configuración de Nginx optimizada con redirección canónica
RUN echo '\
# Servidor principal HTTP\n\
server {\n\
    listen 80;\n\
    server_name yugiohgenesys.com.mx www.yugiohgenesys.com.mx;\n\
\n\
    # Redirigir www -> no-www\n\
    if ($host = "www.yugiohgenesys.com.mx") {\n\
        return 301 https://yugiohgenesys.com.mx$request_uri;\n\
    }\n\
\n\
    # Security headers (opcional, se aplican sobre HTTP)\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header X-XSS-Protection "1; mode=block" always;\n\
\n\
    # Gzip compression\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_min_length 1024;\n\
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;\n\
\n\
    # Cache static assets\n\
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
        root /usr/share/nginx/html;\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Sitemap y robots.txt\n\
    location = /sitemap.xml {\n\
        root /usr/share/nginx/html;\n\
        add_header Content-Type "application/xml";\n\
    }\n\
\n\
    location = /robots.txt {\n\
        root /usr/share/nginx/html;\n\
        add_header Content-Type "text/plain";\n\
    }\n\
\n\
    # Resto de rutas\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        try_files $uri $uri/ /index.html;\n\
        index index.html;\n\
        add_header Cache-Control "no-cache";\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf



# Copiar archivos de la build
COPY --from=build /app/dist /usr/share/nginx/html

# Asegurar permisos correctos
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

