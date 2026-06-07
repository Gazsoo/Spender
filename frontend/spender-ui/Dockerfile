# frontend/spender-ui/Dockerfile
# Built from the repo root so the OpenAPI spec generated alongside Spender.API
# is available for Orval codegen — see orval.config.ts (`../../Spender.API/openapi/...`).
FROM node:22-alpine AS build
WORKDIR /repo/frontend/spender-ui

# declare build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY frontend/spender-ui/package.json frontend/spender-ui/pnpm-lock.yaml frontend/spender-ui/pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install

COPY frontend/spender-ui/ ./
COPY Spender.API/openapi/ /repo/Spender.API/openapi/
RUN pnpm exec orval
RUN pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /repo/frontend/spender-ui/dist /usr/share/nginx/html
COPY frontend/spender-ui/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80