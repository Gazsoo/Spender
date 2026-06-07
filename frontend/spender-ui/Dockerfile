# frontend/spender-ui/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# declare build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --include=dev

COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80