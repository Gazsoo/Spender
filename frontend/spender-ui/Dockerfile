# frontend/spender-ui/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# declare build arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --include=dev

COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80