# Etapa de build
FROM node:18-alpine AS build
WORKDIR /app

# Instalar dependencias primero (mejor caching)
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

COPY . .

# Build optimizado
RUN npm install -g typescript
RUN npx tsc
RUN npx vite build --mode production

# Etapa de producción con Nginx
FROM nginx:alpine

# Configuración de Nginx optimizada con redirección canónica
RUN echo '# Redirigir www a no-www (versión canónica) \
server { \
    listen 80; \
    server_name www.yugiohgenesys.com.mx; \
    return 301 https://yugiohgenesys.com.mx$request_uri; \
} \
\
# Servidor principal \
server { \
    listen 80; \
    server_name yugiohgenesys.com.mx; \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        root /usr/share/nginx/html; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Sitemap y robots.txt \
    location = /sitemap.xml { \
        root /usr/share/nginx/html; \
        add_header Content-Type "application/xml"; \
    } \
    \
    location = /robots.txt { \
        root /usr/share/nginx/html; \
        add_header Content-Type "text/plain"; \
    } \
    \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
        index index.html; \
        add_header Cache-Control "no-cache"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copiar archivos de la build
COPY --from=build /app/dist /usr/share/nginx/html

# Asegurar permisos correctos
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

